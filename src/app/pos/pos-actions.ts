"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";
import { createInventoryLog } from "@/lib/inventory-log-helper";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function parseItems(raw: any): any[] {
  if (!raw) return [];
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function mapPosOrder(o: any) {
  return {
    id: String(o.id),
    customerName: o.customerName,
    customerId: o.customerId,
    itemName: o.itemName,
    items: parseItems(o.items),
    quantity: o.quantity,
    totalAmount: o.totalAmount,
    paymentMethod: o.paymentMethod || "Cash",
    paymentStatus: o.paymentStatus || "Unpaid",
    shippingStatus: o.shippingStatus || "Pending",
    remarks: o.remarks || "",
    createdBy: o.createdBy || null,
    createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
    orderDate: o.orderDate ? o.orderDate.toISOString() : null,
  };
}

async function restockOrderItems(tx: any, order: any, user: any, reason: string) {
  const items = parseItems(order.items);
  for (const item of items) {
    const productId = item.product?.id || item.productId;
    const qty = typeof item.quantity === "number" ? item.quantity : parseInt(String(item.quantity), 10);
    if (!productId || isNaN(qty) || qty <= 0) continue;
    const updated = await tx.product.update({
      where: { id: Number(productId) },
      data: { quantity: { increment: qty } },
      select: { id: true, quantity: true },
    });
    await createInventoryLog(
      {
        action: "RETURNED",
        productId: String(productId),
        quantityChange: qty,
        previousStock: updated.quantity - qty,
        newStock: updated.quantity,
        reason,
        referenceId: String(order.id),
        orderId: String(order.id),
        branchId: null,
      },
      tx,
      user
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Held transactions                                                  */
/* ------------------------------------------------------------------ */

export async function getHeldTransactions() {
  const user = await getCurrentUser();
  if (!user) return [];
  const orders = await prisma.order.findMany({
    where: { paymentStatus: "Hold" },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(mapPosOrder);
}

/**
 * Resume a held transaction: restock its reserved items, delete the held
 * order, and return its line items so the client can rebuild the cart.
 * The stock is re-deducted when the resumed sale is tendered again.
 */
export async function resumeHeldTransaction(orderId: string | number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");

  const items = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(orderId) } });
    if (!order) throw new Error("Held transaction not found");
    const parsed = parseItems(order.items);
    await restockOrderItems(tx, order, user, `Held #${orderId} resumed`);
    await tx.salesLog.deleteMany({ where: { orderId: Number(orderId) } });
    await tx.order.delete({ where: { id: Number(orderId) } });
    return parsed;
  });

  revalidatePath("/inventory");
  return { items };
}

export async function discardHeldTransaction(orderId: string | number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(orderId) } });
    if (!order) return;
    await restockOrderItems(tx, order, user, `Held #${orderId} discarded`);
    await tx.salesLog.deleteMany({ where: { orderId: Number(orderId) } });
    await tx.order.delete({ where: { id: Number(orderId) } });
  });

  revalidatePath("/inventory");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Recent sales                                                       */
/* ------------------------------------------------------------------ */

export async function getRecentSales(limit = 30) {
  const user = await getCurrentUser();
  if (!user) return [];
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return orders.map(mapPosOrder);
}

/* ------------------------------------------------------------------ */
/*  Void & Return                                                      */
/* ------------------------------------------------------------------ */

async function logAdmin(action: string, moduleName: string, description: string, targetId: string, extra: any, user: any) {
  try {
    await (prisma as any).adminLog.create({
      data: {
        action,
        module: moduleName,
        description,
        targetId,
        targetType: "ORDER",
        performedBy: { uid: String(user.id), name: user.name, role: user.role?.name || "Cashier" },
        newData: extra,
      },
    });
  } catch (e) {
    console.error("logAdmin failed:", e);
  }
}

export async function voidSale(orderId: string | number, reason: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(orderId) } });
    if (!order) throw new Error("Sale not found");
    if (order.shippingStatus === "Cancelled") throw new Error("Sale is already voided");

    await restockOrderItems(tx, order, user, `Sale #${orderId} voided`);

    if (order.shippingStatus === "Delivered") {
      await tx.customer.update({
        where: { id: Number(order.customerId) },
        data: { totalSpent: { decrement: order.totalAmount } },
      });
    }

    await tx.order.update({
      where: { id: Number(orderId) },
      data: { shippingStatus: "Cancelled", remarks: `VOID: ${reason || "No reason"}` },
    });

    await tx.salesLog.create({
      data: {
        orderId: Number(orderId),
        description: `Sale voided — ${reason || "No reason"}`,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
      },
    });
  });

  await logAdmin("SALE_VOIDED", "POS", `Voided sale #${orderId}`, String(orderId), { reason }, user);
  revalidatePath("/inventory");
  revalidatePath("/sales");
  revalidatePath("/orders");
  return { success: true };
}

// Verifies that the supplied credentials belong to an active administrator.
// Used to authorize sensitive POS operations (e.g. returns).
async function verifyAdmin(
  email: string,
  password: string
): Promise<{ ok: boolean; name?: string; error?: string }> {
  if (!email?.trim() || !password) {
    return { ok: false, error: "Admin email and password are required" };
  }
  const admin = await prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" } },
    include: { role_rel: true },
  });
  if (!admin || !admin.isActive) return { ok: false, error: "Admin account not found" };

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return { ok: false, error: "Incorrect admin password" };

  const roleName = (admin.role_rel?.name || admin.role || "").toLowerCase();
  const perms = (admin.permissions as any) || {};
  const isAdmin = roleName.includes("admin") || perms?.users === true || perms?.settings === true;
  if (!isAdmin) return { ok: false, error: "This account is not authorized to approve returns" };

  return { ok: true, name: admin.name };
}

export async function returnSale(
  orderId: string | number,
  details: {
    reason: string;
    reference: string;
    referenceType: "invoice" | "sales_order";
    customerName: string;
    adminEmail: string;
    adminPassword: string;
  }
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");

  const { reason, reference, referenceType, customerName, adminEmail, adminPassword } = details;

  // Require administrator authorization before any state changes.
  const admin = await verifyAdmin(adminEmail, adminPassword);
  if (!admin.ok) throw new Error(admin.error || "Invalid admin credentials");

  if (!reference?.trim()) throw new Error("Invoice # or Sales Order # is required");
  if (!customerName?.trim()) throw new Error("Customer name is required");

  const refLabel = referenceType === "sales_order" ? "SO#" : "Invoice#";
  const refText = `${refLabel} ${reference.trim()}`;
  const cust = customerName.trim();

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: Number(orderId) } });
    if (!order) throw new Error("Sale not found");
    if (order.shippingStatus === "Returned") throw new Error("Sale is already returned");

    await restockOrderItems(tx, order, user, `Sale #${orderId} returned`);

    if (order.shippingStatus === "Delivered") {
      await tx.customer.update({
        where: { id: Number(order.customerId) },
        data: { totalSpent: { decrement: order.totalAmount } },
      });
    }

    await tx.order.update({
      where: { id: Number(orderId) },
      data: {
        shippingStatus: "Returned",
        remarks: `RETURN: ${reason || "No reason"} | ${refText} | Customer: ${cust} | Approved by: ${admin.name}`,
      },
    });

    await tx.salesLog.create({
      data: {
        orderId: Number(orderId),
        description: `Sale returned — ${reason || "No reason"} (${refText})`,
        customerName: cust,
        totalAmount: order.totalAmount,
      },
    });
  });

  await logAdmin(
    "SALE_RETURNED",
    "POS",
    `Returned sale #${orderId} (${refText})`,
    String(orderId),
    { reason, reference: reference.trim(), referenceType, customerName: cust, approvedBy: admin.name },
    user
  );
  revalidatePath("/inventory");
  revalidatePath("/sales");
  revalidatePath("/orders");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Cash drawer (persisted as AdminLog entries, module = CASH)         */
/* ------------------------------------------------------------------ */

type CashKind = "count" | "transfer" | "drawer" | "float";

export async function recordCashEvent(kind: CashKind, amount: number, note: string, details?: any) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");

  const actionMap: Record<CashKind, string> = {
    count: "CASH_COUNT",
    transfer: "CASH_TRANSFER",
    drawer: "DRAWER_OPEN",
    float: "CASH_FLOAT",
  };

  await (prisma as any).adminLog.create({
    data: {
      action: actionMap[kind],
      module: "CASH",
      description:
        kind === "drawer"
          ? "Cash drawer opened"
          : `${actionMap[kind].replace("_", " ")} — ₱${Number(amount || 0).toLocaleString()}`,
      targetType: "CASH",
      performedBy: { uid: String(user.id), name: user.name, role: user.role?.name || "Cashier" },
      newData: { kind, amount: Number(amount || 0), note: note || "", ...(details || {}) },
    },
  });

  return { success: true };
}

export async function getCashEvents(limit = 50) {
  const user = await getCurrentUser();
  if (!user) return [];
  const { start, end } = todayRange();
  const logs = await (prisma as any).adminLog.findMany({
    where: { module: "CASH", createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map((l: any) => ({
    id: l.id,
    action: l.action,
    description: l.description,
    performedBy: l.performedBy,
    data: l.newData,
    createdAt: l.createdAt.toISOString(),
  }));
}

/**
 * Computes the cash the drawer should currently hold, for the Cash Count
 * reconciliation: opening float + today's cash sales − cash transferred out.
 */
export async function getDrawerStatus() {
  const user = await getCurrentUser();
  if (!user) return { expectedCash: 0, cashSalesToday: 0, transfersOutToday: 0, floatToday: 0 };

  const { start, end } = todayRange();

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { totalAmount: true, paymentMethod: true, shippingStatus: true },
  });
  const cashSalesToday = orders
    .filter(
      (o) =>
        (o.shippingStatus || "").toLowerCase() !== "cancelled" &&
        ["cash", "cod"].includes((o.paymentMethod || "").toLowerCase())
    )
    .reduce((s, o) => s + (o.totalAmount || 0), 0);

  const cashLogs = await (prisma as any).adminLog.findMany({
    where: { module: "CASH", createdAt: { gte: start, lte: end } },
    select: { action: true, newData: true },
  });
  let transfersOutToday = 0;
  let floatToday = 0;
  for (const l of cashLogs) {
    const amt = Number((l.newData as any)?.amount || 0);
    if (l.action === "CASH_TRANSFER") transfersOutToday += amt;
    if (l.action === "CASH_FLOAT") floatToday += amt;
  }

  const expectedCash = floatToday + cashSalesToday - transfersOutToday;
  return { expectedCash, cashSalesToday, transfersOutToday, floatToday };
}

/* ------------------------------------------------------------------ */
/*  Quick customer create (POS)                                        */
/* ------------------------------------------------------------------ */

export async function quickAddCustomer(name: string, phone?: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  if (!name || !name.trim()) throw new Error("Customer name is required");

  const customer = await prisma.customer.create({
    data: {
      name: name.trim(),
      phone: phone?.trim() || null,
      createdBy: { uid: String(user.id), name: user.name } as any,
    },
  });

  revalidatePath("/customers");
  return { id: customer.id, name: customer.name, phone: customer.phone || "" };
}
