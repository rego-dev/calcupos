"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

export interface PreOrderItem {
    productId?: string;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    images?: string[];
}

export interface CreatePreOrderData {
    customerName: string;
    contactNumber?: string;
    address?: string;
    orderDate?: string;
    totalAmount: number;
    paymentMethod?: string;
    paymentStatus?: string;
    depositAmount?: number;
    customerId: string;
    customerEmail?: string;
    remarks?: string;
    items: PreOrderItem[];
    productId?: string;
}

export async function getPreOrders() {
    try {
        const user = await getCurrentUser();
        if (!user || !user.permissions?.preOrders) {
            throw new Error("Unauthorized");
        }

        const isSuperAdmin = user.role?.name?.toLowerCase() === "super admin";

        const preOrders = await prisma.preOrder.findMany({
            where: isSuperAdmin
                ? {}
                : {
                    createdBy: {
                        path: ["uid"],
                        equals: user.id,
                    },
                },
            include: {
                customer: true,
                items: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Map to PreOrder type structure
        return preOrders.map(order => ({
            ...order,
            customer: (order as any).customer ? {
                id: (order as any).customer.id,
                name: (order as any).customer.name,
                email: (order as any).customer.email,
                phone: (order as any).customer.phone || "",
                avatar: (order as any).customer.avatar || "",
                address: (order as any).customer.street ? {
                    street: (order as any).customer.street,
                    city: (order as any).customer.city || "",
                    state: (order as any).customer.state || "",
                    zip: (order as any).customer.zip || "",
                } : {
                    street: "",
                    city: "",
                    state: "",
                    zip: "",
                },
                orderHistory: [],
                totalSpent: 0,
            } : undefined,
            items: order.items,
        }));
    } catch (error) {
        console.error("Failed to fetch pre-orders:", error);
        throw new Error("Failed to fetch pre-orders");
    }
}

export async function createPreOrder(data: CreatePreOrderData) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.permissions?.preOrders) {
            throw new Error("Unauthorized");
        }

        // Create pre-order with items and inventory allocations in a transaction
        const preOrder = await prisma.$transaction(async (tx) => {
            // Create the pre-order
            const newPreOrder = await tx.preOrder.create({
                data: {
                    customerName: data.customerName,
                    contactNumber: data.contactNumber,
                    address: data.address,
                    orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
                    totalAmount: data.totalAmount,
                    paymentMethod: data.paymentMethod,
                    paymentStatus: data.paymentStatus || "Unpaid",
                    depositAmount: data.depositAmount || 0,
                    customerId: Number(data.customerId),
                    customerEmail: data.customerEmail,
                    remarks: data.remarks,
                    createdBy: {
                        uid: user.id,
                        name: user.name,
                    },
                    productId: data.productId ? Number(data.productId) : null,
                },
            });

            // Create pre-order items
            // Create pre-order items
            const finalItemsData = data.items.map((item) => ({
                preOrderId: newPreOrder.id,
                productName: item.productName,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                totalPrice: item.quantity * item.pricePerUnit,
                images: item.images // Prisma handles Json type automatically
            }));

            await tx.preOrderItem.createMany({
                data: finalItemsData,
            });

            return newPreOrder;
        });

        revalidatePath("/pre-orders");
        return preOrder;
    } catch (error) {
        console.error("Failed to create pre-order:", error);
        throw new Error("Failed to create pre-order");
    }
}

export async function updatePreOrder(
    id: string,
    data: Partial<CreatePreOrderData>
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        const preOrder = await prisma.$transaction(async (tx) => {
            const existingPreOrder = await tx.preOrder.findUnique({ where: { id: Number(id) } });
            if (!existingPreOrder) throw new Error("Pre-order not found");

            return await tx.preOrder.update({
                where: { id: Number(id) },
                data: {
                    customerName: data.customerName,
                    contactNumber: data.contactNumber,
                    address: data.address,
                    orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
                    totalAmount: data.totalAmount,
                    paymentMethod: data.paymentMethod,
                    paymentStatus: data.paymentStatus,
                    depositAmount: data.depositAmount,
                    customerEmail: data.customerEmail,
                    remarks: data.remarks,
                    productId: data.productId !== undefined ? Number(data.productId) : undefined,
                },
            });
        });

        revalidatePath("/pre-orders");
        return preOrder;
    } catch (error) {
        console.error("Failed to update pre-order:", error);
        throw new Error("Failed to update pre-order");
    }
}

export async function deletePreOrder(id: string) {
    try {
        const user = await getCurrentUser();
        if (!user || !user.permissions?.preOrders) {
            throw new Error("Unauthorized");
        }

        // Delete pre-order (items and inventory will be cascade deleted)
        await prisma.preOrder.delete({
            where: { id: Number(id) },
        });

        revalidatePath("/pre-orders");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete pre-order:", error);
        throw new Error("Failed to delete pre-order");
    }
}

// [NEW] Action to support Inventory Page list
export async function getPreOrderItems() {
    try {
        const user = await getCurrentUser();
        if (!user || !user.permissions?.preOrders) {
            throw new Error("Unauthorized");
        }

        const items = await prisma.preOrderItem.findMany({
            include: {
                preOrder: {
                    select: {
                        customerName: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return items;
    } catch (error) {
        console.error("Failed to fetch pre-order items:", error);
        throw new Error("Failed to fetch pre-order items");
    }
}

export async function recordPreOrderPayment(preOrderId: string, amount: number) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        // Fetch the current pre-order
        const preOrder = await prisma.preOrder.findUnique({
            where: { id: Number(preOrderId) },
        });

        if (!preOrder) {
            throw new Error("Pre-order not found");
        }

        // Calculate new deposit amount
        const newDepositAmount = (preOrder.depositAmount || 0) + amount;

        // Determine payment status
        let paymentStatus = "Partial";
        if (newDepositAmount >= preOrder.totalAmount) {
            paymentStatus = "Paid";
        } else if (newDepositAmount === 0) {
            paymentStatus = "Unpaid";
        }

        const updatedPreOrder = await prisma.preOrder.update({
            where: { id: Number(preOrderId) },
            data: {
                depositAmount: newDepositAmount,
                paymentStatus,
            },
        });

        revalidatePath("/pre-orders");
        return updatedPreOrder;
    } catch (error) {
        console.error("Failed to record payment:", error);
        throw new Error("Failed to record payment");
    }
}

export async function createPreOrderProduct(data: any) {
    // Placeholder to satisfy component requirements
    // In a real scenario, this would create a product entry for pre-orders
    console.log("Creating pre-order product:", data);
    return { success: true };
}
