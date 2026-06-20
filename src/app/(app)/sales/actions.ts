"use server";

import { prisma } from "@/lib/prisma";
import { Order, PreOrder } from "@/lib/types";
import { startOfWeek, startOfMonth, startOfYear, endOfDay } from "date-fns";
import { getCurrentUser } from "@/lib/auth-server";

export async function getSalesData(timeframe: "week" | "month" | "year" | "all"): Promise<{ orders: Order[], isAuthorized: boolean }> {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return { orders: [], isAuthorized: false };
        }

        const isAuthorized = !!user.permissions?.sales;
        if (!isAuthorized) {
            return { orders: [], isAuthorized: false };
        }

        const now = new Date();
        let startDate: Date;

        if (timeframe === 'week') {
            startDate = startOfWeek(now);
        } else if (timeframe === 'month') {
            startDate = startOfMonth(now);
        } else if (timeframe === 'year') {
            startDate = startOfYear(now);
        } else { // all
            startDate = new Date(0);
        }

        const endDate = endOfDay(now);

        const orders = await prisma.order.findMany({
            where: {
                orderDate: {
                    gte: startDate,
                    lte: endDate,
                },
                // Removed strict paymentStatus filter to match dashboard aggregation
            },
        });

        // Sort orders by orderDate descending in JS to prevent MySQL out of sort memory error
        orders.sort((a, b) => {
            const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return dateB - dateA;
        });

        const mappedOrders = orders.map((order: any) => ({
            id: order.id,
            customerName: order.customerName,
            contactNumber: order.contactNumber || "",
            address: order.address || "",
            orderDate: order.orderDate.toISOString(),
            itemName: order.itemName,
            quantity: order.quantity,
            price: order.price,
            shippingFee: order.shippingFee,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod as any,
            paymentStatus: order.paymentStatus as any,
            shippingStatus: order.shippingStatus as any,
            customerId: order.customerId,
            rushShip: order.rushShip,
            customerEmail: order.customerEmail || "",
            courierName: order.courierName || "",
            trackingNumber: order.trackingNumber || "",
            remarks: order.remarks as any,
            items: order.items as any,
        }));

        return { orders: mappedOrders, isAuthorized: true };

    } catch (error) {
        console.error("Error fetching sales data:", error);
        return { orders: [], isAuthorized: false };
    }
}

export async function getPreOrderSalesData(timeframe: "week" | "month" | "year" | "all"): Promise<{ preOrders: PreOrder[], isAuthorized: boolean }> {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return { preOrders: [], isAuthorized: false };
        }

        const isAuthorized = !!user.permissions?.sales;
        if (!isAuthorized) {
            return { preOrders: [], isAuthorized: false };
        }

        const now = new Date();
        let startDate: Date;

        if (timeframe === 'week') {
            startDate = startOfWeek(now);
        } else if (timeframe === 'month') {
            startDate = startOfMonth(now);
        } else if (timeframe === 'year') {
            startDate = startOfYear(now);
        } else { // all
            startDate = new Date(0);
        }

        const endDate = endOfDay(now);

        const preOrders = await prisma.preOrder.findMany({
            where: {
                orderDate: {
                    gte: startDate,
                    lte: endDate,
                },
                paymentStatus: 'Paid', // Only include paid pre-orders
            },
            include: {
                customer: true,
                items: true,
            },
        });

        // Sort preOrders by orderDate descending in JS to prevent MySQL out of sort memory error
        preOrders.sort((a, b) => {
            const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
            const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
            return dateB - dateA;
        });

        const mappedPreOrders = preOrders.map((preOrder: any) => ({
            id: preOrder.id,
            customerName: preOrder.customerName,
            contactNumber: preOrder.contactNumber || "",
            address: preOrder.address || "",
            orderDate: preOrder.orderDate ? preOrder.orderDate.toISOString() : new Date().toISOString(),
            totalAmount: preOrder.totalAmount,
            paymentMethod: preOrder.paymentMethod || "",
            paymentStatus: preOrder.paymentStatus || "",
            depositAmount: preOrder.depositAmount || 0,
            customerId: preOrder.customerId,
            customerEmail: preOrder.customerEmail || "",
            remarks: preOrder.remarks || "",
            createdAt: preOrder.createdAt.toISOString(),
            updatedAt: preOrder.updatedAt.toISOString(),
            items: preOrder.items,
            customer: preOrder.customer ? {
                id: preOrder.customer.id,
                name: preOrder.customer.name,
                email: preOrder.customer.email,
                phone: preOrder.customer.phone || "",
                avatar: preOrder.customer.avatar || "",
                address: preOrder.customer.street ? {
                    street: preOrder.customer.street,
                    city: preOrder.customer.city || "",
                    state: preOrder.customer.state || "",
                    zip: preOrder.customer.zip || "",
                } : {
                    street: "",
                    city: "",
                    state: "",
                    zip: "",
                },
                orderHistory: [],
                totalSpent: 0,
            } : undefined,
        }));

        return { preOrders: mappedPreOrders, isAuthorized: true };

    } catch (error) {
        console.error("Error fetching pre-order sales data:", error);
        return { preOrders: [], isAuthorized: false };
    }
}
