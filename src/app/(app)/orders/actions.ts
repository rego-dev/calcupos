"use server";

import { Order, PaymentMethod, PaymentStatus, ShippingStatus, OrderRemark } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getCurrentUser } from "@/lib/auth-server";
import { createInventoryLog } from "@/lib/inventory-log-helper";

export async function getOrders(): Promise<Order[]> {
  noStore();
  const user = await getCurrentUser();

  if (!user || !user.permissions?.orders) {
    return [];
  }

  const isSuperAdmin = user.role?.name?.toLowerCase() === 'super admin';

  const orders = await prisma.order.findMany({
    include: {
      customer: true,
    }
  });

  // Sort orders by createdAt descending in JS to prevent MySQL out of sort memory error
  orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Filter orders based on user role
  const filteredOrders = isSuperAdmin
    ? orders
    : orders.filter(order => {
      if (!(order as any).createdBy) return false;
      const createdByData = (order as any).createdBy as any;
      return String(createdByData?.uid) === String(user.id);
    });

  return filteredOrders.map(order => ({
    id: String(order.id),
    customerName: order.customerName,
    contactNumber: order.contactNumber || "",
    address: order.address || "",
    orderDate: order.orderDate ? order.orderDate.toISOString().split('T')[0] : "",
    itemName: order.itemName,
    items: (order as any).items ? (typeof (order as any).items === 'string' ? JSON.parse((order as any).items) : (order as any).items) : [],
    quantity: order.quantity,
    price: order.price,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    paymentMethod: (order.paymentMethod as PaymentMethod) || "COD",
    paymentStatus: (order.paymentStatus as PaymentStatus) || "Unpaid",
    shippingStatus: (order.shippingStatus as ShippingStatus) || "Pending",
    createdAt: order.createdAt,
    createdBy: (order.createdBy as any) || { uid: "system", name: "System" },
    customerId: order.customerId,
    customerEmail: order.customerEmail || "",
    courierName: order.courierName || "",
    trackingNumber: order.trackingNumber || "",
    remarks: ((order.remarks || "") as OrderRemark),
    rushShip: order.rushShip,
    paymentProofFileName: order.paymentProofFileName,
    paymentProofMimeType: order.paymentProofMimeType,
    paymentProofDataUrl: order.paymentProofDataUrl,
  }));
}

export async function getAllOrders(): Promise<{ orders: Order[], isAuthorized: boolean }> {
  noStore();
  const user = await getCurrentUser();

  if (!user) {
    return { orders: [], isAuthorized: false };
  }

  // Check permission via utility instead of hardcoded role name
  // This allows any role with the 'orders' or 'dashboard' permission to see all orders
  const hasOrdersPermission = !!user.permissions?.orders;
  const hasDashboardPermission = !!user.permissions?.dashboard;

  if (!hasOrdersPermission && !hasDashboardPermission) {
    return { orders: [], isAuthorized: false };
  }

  // Fetch ALL orders regardless of creator
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
    }
  });

  // Sort orders by createdAt descending in JS to prevent MySQL out of sort memory error
  orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const mapOrders = orders.map(order => ({
    id: String(order.id),
    customerName: order.customerName,
    contactNumber: order.contactNumber || "",
    address: order.address || "",
    orderDate: order.orderDate ? order.orderDate.toISOString().split('T')[0] : "",
    itemName: order.itemName,
    items: (order as any).items ? (typeof (order as any).items === 'string' ? JSON.parse((order as any).items) : (order as any).items) : [],
    quantity: order.quantity,
    price: order.price,
    shippingFee: order.shippingFee,
    totalAmount: order.totalAmount,
    paymentMethod: (order.paymentMethod as PaymentMethod) || "COD",
    paymentStatus: (order.paymentStatus as PaymentStatus) || "Unpaid",
    shippingStatus: (order.shippingStatus as ShippingStatus) || "Pending",
    createdAt: order.createdAt,
    createdBy: (order.createdBy as any) || { uid: "system", name: "System" },
    customerId: order.customerId,
    customerEmail: order.customerEmail || "",
    courierName: order.courierName || "",
    trackingNumber: order.trackingNumber || "",
    remarks: ((order.remarks || "") as OrderRemark),
    rushShip: order.rushShip,
    paymentProofFileName: order.paymentProofFileName,
    paymentProofMimeType: order.paymentProofMimeType,
    paymentProofDataUrl: order.paymentProofDataUrl,
  }));

  return { orders: mapOrders, isAuthorized: true };
}

export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt'> & { items?: any[] }): Promise<Order> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.permissions?.orders) {
      throw new Error("Permission denied");
    }
    const createdBy = user ? {
      uid: String(user.id), // Match the 'uid' expected by types and filter
      id: String(user.id),  // Also store 'id' for clarity
      name: user.name,
      email: user.email
    } : { uid: "system", name: "System" };

    const now = new Date();

    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the order using Prisma
      const createdDbOrder = await tx.order.create({
        data: {
          customerName: orderData.customerName,
          contactNumber: orderData.contactNumber || null,
          address: orderData.address || null,
          orderDate: orderData.orderDate ? new Date(orderData.orderDate) : null,
          itemName: orderData.itemName,
          items: orderData.items ? JSON.stringify(orderData.items) : undefined,
          paymentProofFileName: orderData.paymentProofFileName || null,
          paymentProofMimeType: orderData.paymentProofMimeType || null,
          paymentProofDataUrl: orderData.paymentProofDataUrl || null,
          quantity: orderData.quantity,
          price: orderData.price,
          shippingFee: orderData.shippingFee,
          totalAmount: orderData.totalAmount,
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,
          shippingStatus: orderData.shippingStatus,
          customerId: Number(orderData.customerId),
          customerEmail: orderData.customerEmail || null,
          courierName: orderData.courierName || null,
          trackingNumber: orderData.trackingNumber || null,
          remarks: orderData.remarks || null,
          rushShip: orderData.rushShip ? true : false,
          createdBy: createdBy as any
        }
      });
      const orderId = String(createdDbOrder.id);

      // 2. Deduct from inventory if items are provided
      if (orderData.items && orderData.items.length > 0) {
        for (const item of orderData.items) {
          const productId = item.product.id;
          const quantityToDeduct = item.quantity;

          // Deduced from quantity (Main Inventory) regardless of remark, as branches are merged
          const updateData = { quantity: { decrement: quantityToDeduct } };

          const updatedProduct = await tx.product.update({
            where: { id: Number(productId) },
            data: updateData,
            select: { id: true, name: true, quantity: true, alertStock: true, retailPrice: true }
          });

          // 3. Create notifications if stock is low or out
          const totalStock = updatedProduct.quantity;
          if (totalStock <= 0 || totalStock <= updatedProduct.alertStock) {
            const title = totalStock <= 0 ? "Out of Stock Alert" : "Low Stock Alert";
            const message = totalStock <= 0
              ? `Product "${updatedProduct.name}" is now out of stock!`
              : `Product "${updatedProduct.name}" has only ${totalStock} left in stock.`;
            const type = totalStock <= 0 ? "out_of_stock" : "low_stock";

            await tx.notification.create({
              data: {
                title,
                message,
                type,
                read: false,
                createdAt: now,
                updatedAt: now
              }
            });
          }

          // Log inventory change
          const previousStock = updatedProduct.quantity + quantityToDeduct;
          await createInventoryLog({
            action: "SOLD",
            productId: productId,
            quantityChange: -quantityToDeduct,
            previousStock: previousStock,
            newStock: updatedProduct.quantity,
            reason: `Order #${orderId.substring(0, 8)}`,
            referenceId: String(orderId),
            orderId: String(orderId),
            branchId: user?.branchId ? String(user.branchId) : null,
          }, tx, user);
        }
      }

      if (orderData.shippingStatus === 'Delivered') {
        // Update Customer totalSpent
        await tx.customer.update({
          where: { id: Number(orderData.customerId) },
          data: {
            totalSpent: { increment: orderData.totalAmount }
          }
        });
        console.log(`[CustomerUpdate] Updated Customer ${orderData.customerId}: totalSpent +${orderData.totalAmount}`);
      }

      // 4. Create Sales Log (Prisma SQL)
      const ordersObj = {
        id: orderId,
        orderDate: orderData.orderDate,
        paymentStatus: orderData.paymentStatus,
        paymentMethod: orderData.paymentMethod,
        shippingStatus: orderData.shippingStatus,
        createdBy: createdBy
      };
      const shipmentsObj = {
        address: orderData.address,
        courier: orderData.courierName,
        tracking: orderData.trackingNumber,
        shippingFee: orderData.shippingFee
      };

      await tx.salesLog.create({
        data: {
          orderId: Number(orderId),
          description: "Order Created",
          products: orderData.itemName,
          orders: ordersObj as any,
          customerName: orderData.customerName,
          totalAmount: orderData.totalAmount,
          shipments: shipmentsObj as any,
          order_items: orderData.items as any,
          createdAt: now
        }
      });

      return { id: orderId, createdAt: now };
    }, { timeout: 15000 });

    revalidatePath("/orders");
    revalidatePath("/inventory");
    revalidatePath("/customers");
    return {
      ...orderData,
      id: newOrder.id,
      createdAt: newOrder.createdAt,
      createdBy: createdBy // Return correct creator
    };
  } catch (error: any) {
    console.error("CRITICAL ERROR in createOrder:", error);
    throw new Error(error.message || "Failed to create order due to a server error.");
  }
}



export async function updateOrder(id: string | number, data: Partial<Order>): Promise<Order> {
  try {
    const updatedOrderResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch existing order to revert its effects on totals if needed
      const existingOrder = await tx.order.findUnique({ where: { id: Number(id) } });
      if (!existingOrder) throw new Error("Order not found");

      // 2. Manage Customer totalSpent based on shippingStatus (Delivered only)
      const wasCountable = existingOrder.shippingStatus === 'Delivered';
      const isNowCountable = data.shippingStatus === 'Delivered';

      const oldAmount = existingOrder.totalAmount;
      const newAmount = data.totalAmount !== undefined ? data.totalAmount : oldAmount;

      const amountChanged = oldAmount !== newAmount;

      if (wasCountable && !isNowCountable) {
        // Transition FROM Countable TO non-Countable (Cancelled) -> Revert stats
        await tx.customer.update({
          where: { id: Number(existingOrder.customerId) },
          data: { totalSpent: { decrement: oldAmount } }
        });
      } else if (!wasCountable && isNowCountable) {
        // Transition FROM non-Countable TO Countable -> Apply stats
        await tx.customer.update({
          where: { id: Number(data.customerId || existingOrder.customerId) },
          data: { totalSpent: { increment: newAmount } }
        });
      } else if (wasCountable && isNowCountable) {
        // Stayed Countable but Amount or Customer changed -> Diff stats
        const oldCustomerId = existingOrder.customerId;
        const newCustomerId = data.customerId || oldCustomerId;
        const customerChanged = oldCustomerId !== newCustomerId;

        if (customerChanged) {
          // Revert old customer
          await tx.customer.update({
            where: { id: Number(oldCustomerId) },
            data: { totalSpent: { decrement: oldAmount } }
          });
          // Apply to new customer
          await tx.customer.update({
            where: { id: Number(newCustomerId) },
            data: { totalSpent: { increment: newAmount } }
          });
        } else if (amountChanged) {
          // Same customer, different amount
          await tx.customer.update({
            where: { id: Number(oldCustomerId) },
            data: { totalSpent: { increment: newAmount - oldAmount } }
          });
        }
      }

      // 3. Update the order
      const updatedOrder = await tx.order.update({
        where: { id: Number(id) },
        data: {
          customerName: data.customerName,
          contactNumber: data.contactNumber,
          address: data.address,
          orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
          itemName: data.itemName,
          quantity: data.quantity,
          price: data.price,
          shippingFee: data.shippingFee,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          shippingStatus: data.shippingStatus,
          customerId: data.customerId ? Number(data.customerId) : undefined,
          customerEmail: data.customerEmail,
          courierName: data.courierName,
          trackingNumber: data.trackingNumber,
          remarks: data.remarks,
          rushShip: data.rushShip,
          createdBy: data.createdBy as any,
          items: data.items ? JSON.stringify(data.items) : undefined,
          paymentProofFileName: data.paymentProofFileName,
          paymentProofMimeType: data.paymentProofMimeType,
          paymentProofDataUrl: data.paymentProofDataUrl,
        },
      });

      // Create Sales Log (omitted for brevity, copied from original)
      // ...
      const now = new Date();
      // Parse items if string
      const items = (updatedOrder as any).items ? (typeof (updatedOrder as any).items === 'string' ? JSON.parse((updatedOrder as any).items) : (updatedOrder as any).items) : [];

      const ordersObj = {
        id: updatedOrder.id,
        orderDate: updatedOrder.orderDate,
        paymentStatus: updatedOrder.paymentStatus,
        paymentMethod: updatedOrder.paymentMethod,
        shippingStatus: updatedOrder.shippingStatus,
        createdBy: (updatedOrder as any).createdBy
      };
      const shipmentsObj = {
        address: updatedOrder.address,
        courier: updatedOrder.courierName,
        tracking: updatedOrder.trackingNumber,
        shippingFee: updatedOrder.shippingFee
      };

      await tx.salesLog.create({
        data: {
          orderId: Number(updatedOrder.id),
          description: "Order Updated",
          products: updatedOrder.itemName,
          orders: ordersObj as any,
          customerName: updatedOrder.customerName,
          totalAmount: updatedOrder.totalAmount,
          shipments: shipmentsObj as any,
          order_items: items as any,
          createdAt: now
        }
      });



      return updatedOrder;
    });

    revalidatePath("/orders");
    revalidatePath("/customers");

    return {
      id: updatedOrderResult.id,
      customerName: updatedOrderResult.customerName,
      contactNumber: updatedOrderResult.contactNumber || "",
      address: updatedOrderResult.address || "",
      orderDate: updatedOrderResult.orderDate ? updatedOrderResult.orderDate.toISOString().split('T')[0] : "",
      itemName: updatedOrderResult.itemName,
      quantity: updatedOrderResult.quantity,
      price: updatedOrderResult.price,
      shippingFee: updatedOrderResult.shippingFee,
      totalAmount: updatedOrderResult.totalAmount,
      paymentMethod: (updatedOrderResult.paymentMethod as PaymentMethod) || "COD",
      paymentStatus: (updatedOrderResult.paymentStatus as PaymentStatus) || "Unpaid",
      shippingStatus: (updatedOrderResult.shippingStatus as ShippingStatus) || "Pending",
      createdAt: updatedOrderResult.createdAt,
      createdBy: (updatedOrderResult.createdBy as any) || { uid: "system", name: "System" },
      customerId: updatedOrderResult.customerId,
      customerEmail: updatedOrderResult.customerEmail || "",
      courierName: updatedOrderResult.courierName || "",
      trackingNumber: updatedOrderResult.trackingNumber || "",
      remarks: (updatedOrderResult.remarks as OrderRemark) || "",
      rushShip: updatedOrderResult.rushShip,
      paymentProofFileName: updatedOrderResult.paymentProofFileName,
      paymentProofMimeType: updatedOrderResult.paymentProofMimeType,
      paymentProofDataUrl: updatedOrderResult.paymentProofDataUrl,
    };
  } catch (error: any) {
    console.error("Error in updateOrder:", error);
    throw new Error(error.message || "Failed to update order.");
  }
}

export async function updateOrderPaymentStatus(orderId: string | number, paymentStatus: PaymentStatus): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Authentication required");

    const formattedRole = user.role?.name?.toLowerCase() || "";
    const isAuthorized = formattedRole === "super admin" || formattedRole === "superadmin" || formattedRole === "admin";
    if (!isAuthorized) throw new Error("Permission denied");

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: Number(orderId) },
        data: { paymentStatus },
      });

      await tx.salesLog.create({
        data: {
          orderId: Number(orderId),
          description: `Payment status updated to ${paymentStatus}`,
        },
      });
    });

    revalidatePath("/orders");
    revalidatePath("/dashboard");
  } catch (error: any) {
    console.error("Error in updateOrderPaymentStatus:", error);
    throw new Error(error.message || "Failed to update payment status.");
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  console.log(`Starting cancellation for order: ${orderId}`);
  try {
    const user = await getCurrentUser();
    await prisma.$transaction(async (tx) => {
      // 1. Get the order with items
      const order = await tx.order.findUnique({
        where: { id: Number(orderId) }
      });

      if (!order) {
        console.error(`Order ${orderId} not found`);
        throw new Error("Order not found");
      }

      if (order.shippingStatus === "Cancelled") {
        console.log(`Order ${orderId} is already cancelled`);
        return;
      }

      // 2. Parse items
      // 2. Parse items
      const rawItems = (order as any).items;
      let items: any[] = [];
      try {
        items = rawItems ? (typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems) : [];
      } catch (parseError) {
        console.error(`Error parsing items for order ${orderId}:`, parseError);
      }

      console.log(`Order ${orderId} has ${items.length} items to restock`);

      if (!Array.isArray(items) || items.length === 0) {
        console.warn(`No items found for order ${orderId} in structured 'items' field. Using fallback or logging warning.`);
      }

      // 3. Restock inventory
      for (const item of items) {
        const productId = item.product?.id || item.productId;
        // Robustly parse quantity, handling strings like "2", "2.0", etc.
        const rawQuantity = item.quantity;
        const quantityToIncrement = typeof rawQuantity === 'number' ? rawQuantity : parseInt(String(rawQuantity), 10);

        console.log(`Processing restock Item - ProductID: ${productId}, Quantity: ${quantityToIncrement} (Raw: ${rawQuantity})`);

        if (!productId) {
          console.error("Missing product ID in item:", JSON.stringify(item));
          continue;
        }

        if (isNaN(quantityToIncrement) || quantityToIncrement <= 0) {
          console.warn(`Skipping item with zero, invalid or missing quantity for product ${productId}. Parsed qty: ${quantityToIncrement}`);
          continue;
        }

        // Default to restocking quantity
        const updateData: any = { quantity: { increment: quantityToIncrement } };
        const location = "Main Inventory";

        console.log(`Restocking ${quantityToIncrement} of product ${productId} to ${location}`);

        try {
          const updatedProd = await tx.product.update({
            where: { id: Number(productId) },
            data: updateData,
            select: { id: true, quantity: true, name: true }
          });
          console.log(`Stock updated for ${updatedProd.name} (${productId}). New level: ${updatedProd.quantity}`);

          // Log inventory change
          const previousStock = updatedProd.quantity - quantityToIncrement;
          await createInventoryLog({
            action: "RETURNED",
            productId: productId,
            quantityChange: quantityToIncrement,
            previousStock: previousStock,
            newStock: updatedProd.quantity,
            reason: `Order #${orderId.substring(0, 8)} cancelled`,
            referenceId: orderId,
            orderId: orderId,
            branchId: null, // No specific branch for cancellations
          }, tx, user);
        } catch (updateError: any) {
          console.error(`Failed to restock product ${productId}:`, updateError.message);
          throw new Error(`Failed to restock product ${productId}: ${updateError.message}`);
        }
      }

      // Update Customer totalSpent (Decrement) if it was countable (Delivered)
      if (order.shippingStatus === 'Delivered') {
        await tx.customer.update({
          where: { id: Number(order.customerId) },
          data: { totalSpent: { decrement: order.totalAmount } }
        });
        console.log(`[CustomerUpdate] Updated Customer ${order.customerId}: totalSpent -${order.totalAmount} (Cancellation)`);
      }

      // 4. Update order status
      await tx.order.update({
        where: { id: Number(orderId) },
        data: {
          shippingStatus: "Cancelled"
        }
      });
      console.log(`Order ${orderId} marked as Cancelled`);

      // 5. Create Sales Log for Cancellation
      const now = new Date();

      const ordersObj = {
        id: orderId,
        orderDate: order.orderDate,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        shippingStatus: "Cancelled",
        createdBy: (order as any).createdBy
      };
      const shipmentsObj = {
        address: order.address,
        courier: order.courierName,
        tracking: order.trackingNumber,
        shippingFee: order.shippingFee
      };

      await tx.salesLog.create({
        data: {
          orderId: Number(orderId),
          description: "Order Cancelled",
          products: order.itemName,
          orders: ordersObj as any,
          customerName: order.customerName,
          totalAmount: order.totalAmount,
          shipments: shipmentsObj as any,
          order_items: items as any,
          createdAt: now
        }
      });
    });

    revalidatePath("/orders");
    revalidatePath("/inventory");
    revalidatePath("/customers");
    revalidatePath("/dashboard");
  } catch (error: any) {
    console.error("Error in cancelOrder:", error);
    throw new Error(error.message || "Failed to cancel order.");
  }
}

export async function getSmartSuggestions(order: Order) {
  // Mock AI suggestions
  const statusOptions = ['Pending', 'Ready', 'Shipped', 'Delivered', 'Claimed'];
  const randomStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];

  const mockSuggestions = {
    suggestedStatus: randomStatus,
    reasoning: `Mock suggestion: Based on the order data, the status could be updated to ${randomStatus}.`,
  };

  return { success: true, data: mockSuggestions };
}
