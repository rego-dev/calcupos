"use server";

import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getCashierInfo() {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role?.name || "Cashier",
  };
}

export async function getShiftSalesData() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Get the start and end of today (local timezone approximation using server time)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Fetch all orders created TODAY by this cashier
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      shippingStatus: {
        not: "Cancelled",
      },
    },
    select: {
      id: true,
      totalAmount: true,
      paymentMethod: true,
      paymentStatus: true,
      quantity: true,
      itemName: true,
      createdBy: true,
      createdAt: true,
      customerName: true,
      items: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Filter orders belonging to this cashier
  const cashierOrders = orders.filter((order) => {
    if (!order.createdBy) return false;
    const createdBy = order.createdBy as any;
    return String(createdBy?.uid) === String(user.id) || String(createdBy?.id) === String(user.id);
  });

  // Calculate summaries
  let totalSales = 0;
  let totalTransactions = 0;
  let totalItemsSold = 0;
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};

  // Transaction list for the report
  const transactionList: {
    id: number;
    time: string;
    customer: string;
    amount: number;
    method: string;
    items: number;
  }[] = [];

  for (const order of cashierOrders) {
    totalSales += order.totalAmount;
    totalTransactions += 1;
    totalItemsSold += order.quantity;

    const method = order.paymentMethod || "Cash";
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += order.totalAmount;

    transactionList.push({
      id: order.id,
      time: order.createdAt.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      customer: order.customerName,
      amount: order.totalAmount,
      method: method,
      items: order.quantity,
    });
  }

  return {
    cashierName: user.name,
    cashierId: user.id,
    date: now.toISOString(),
    totalSales,
    totalTransactions,
    totalItemsSold,
    paymentBreakdown,
    transactionList,
  };
}

export async function performLogout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
