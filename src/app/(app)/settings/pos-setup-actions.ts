"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// The five POS Setup lists. Each maps to a card in the POS Setup tab and is
// stored in the shared `pos_setup_items` table, discriminated by `type`.
// NOTE: a "use server" file may only export async functions, so this const is
// intentionally NOT exported (types below are erased at compile time and are OK).
const POS_SETUP_TYPES = [
    "transaction_reference",
    "payment_terms",
    "pos_payment_type",
    "unit_of_measure",
    "product_brand",
] as const;

export type PosSetupType = (typeof POS_SETUP_TYPES)[number];

export interface PosSetupItem {
    id: number;
    type: PosSetupType;
    name: string;
    code: string | null;
    description: string | null;
    isActive: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}

function isValidType(type: string): type is PosSetupType {
    return (POS_SETUP_TYPES as readonly string[]).includes(type);
}

export async function getPosSetupItems(type: PosSetupType): Promise<PosSetupItem[]> {
    try {
        if (!isValidType(type)) return [];
        const items = await prisma.posSetupItem.findMany({
            where: { type },
            orderBy: { createdAt: "asc" },
        });
        return items.map((i) => ({
            id: i.id,
            type: i.type as PosSetupType,
            name: i.name,
            code: i.code,
            description: i.description,
            isActive: i.isActive,
            createdAt: i.createdAt,
            updatedAt: i.updatedAt,
        }));
    } catch (error) {
        console.error("Error fetching POS setup items:", error);
        return [];
    }
}

export async function createPosSetupItem(data: {
    type: PosSetupType;
    name: string;
    code?: string | null;
    description?: string | null;
    isActive?: boolean;
}): Promise<{ success: boolean; error?: string }> {
    try {
        if (!isValidType(data.type)) {
            return { success: false, error: "Invalid setup type" };
        }
        const name = data.name?.trim();
        if (!name) {
            return { success: false, error: "Name is required" };
        }

        // Prevent duplicate names within the same list (case-insensitive).
        const existing = await prisma.posSetupItem.findFirst({
            where: { type: data.type, name: { equals: name, mode: "insensitive" } },
        });
        if (existing) {
            return { success: false, error: "An entry with this name already exists" };
        }

        await prisma.posSetupItem.create({
            data: {
                type: data.type,
                name,
                code: data.code?.trim() || null,
                description: data.description?.trim() || null,
                isActive: data.isActive ?? true,
            },
        });

        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error creating POS setup item:", error);
        return { success: false, error: error.message || "Failed to create entry" };
    }
}

export async function updatePosSetupItem(
    id: number,
    data: {
        name?: string;
        code?: string | null;
        description?: string | null;
        isActive?: boolean;
    }
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID is required" };

        if (data.name !== undefined) {
            const name = data.name.trim();
            if (!name) return { success: false, error: "Name is required" };

            const current = await prisma.posSetupItem.findUnique({ where: { id } });
            if (!current) return { success: false, error: "Entry not found" };

            const duplicate = await prisma.posSetupItem.findFirst({
                where: {
                    type: current.type,
                    name: { equals: name, mode: "insensitive" },
                    id: { not: id },
                },
            });
            if (duplicate) {
                return { success: false, error: "An entry with this name already exists" };
            }
        }

        await prisma.posSetupItem.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name.trim() }),
                ...(data.code !== undefined && { code: data.code?.trim() || null }),
                ...(data.description !== undefined && { description: data.description?.trim() || null }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
        });

        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error updating POS setup item:", error);
        return { success: false, error: error.message || "Failed to update entry" };
    }
}

/* ------------------------------------------------------------------ */
/*  Transaction Reference — fixed document types with a "next number"  */
/* ------------------------------------------------------------------ */

// The next-reference value for each type is stored in `code` (as a string)
// on a `transaction_reference` row whose `name` is the label below.
const TRANSACTION_REFERENCE_LABELS = [
    "Sales Order",
    "Purchase Order",
    "Sales Delivery",
    "Payment To Supplier",
    "Sales Invoice",
    "Customer Payment",
    "Delivery Receipt",
    "Stock Adjustment",
    "Sales Hold",
] as const;

export interface TransactionReference {
    id: number;
    name: string;
    next: number;
}

// Returns the fixed set of transaction references, seeding any that are missing
// with a starting value of 1. Always returned in the canonical label order.
export async function getTransactionReferences(): Promise<TransactionReference[]> {
    try {
        const existing = await prisma.posSetupItem.findMany({
            where: { type: "transaction_reference" },
        });
        const byName = new Map(existing.map((e) => [e.name, e]));

        const missing = TRANSACTION_REFERENCE_LABELS.filter((l) => !byName.has(l));
        if (missing.length > 0) {
            await prisma.posSetupItem.createMany({
                data: missing.map((name) => ({ type: "transaction_reference", name, code: "1" })),
            });
        }

        const all = await prisma.posSetupItem.findMany({
            where: { type: "transaction_reference" },
        });
        const allByName = new Map(all.map((e) => [e.name, e]));

        return TRANSACTION_REFERENCE_LABELS.map((name) => {
            const row = allByName.get(name);
            return {
                id: row?.id ?? 0,
                name,
                next: row?.code ? Number(row.code) || 1 : 1,
            };
        });
    } catch (error) {
        console.error("Error fetching transaction references:", error);
        return TRANSACTION_REFERENCE_LABELS.map((name) => ({ id: 0, name, next: 1 }));
    }
}

export async function saveTransactionReferences(
    items: { id: number; next: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const updates = items
            .filter((it) => it.id > 0)
            .map((it) =>
                prisma.posSetupItem.update({
                    where: { id: it.id },
                    data: { code: String(Math.max(0, Math.floor(Number(it.next)) || 0)) },
                })
            );

        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error saving transaction references:", error);
        return { success: false, error: error.message || "Failed to save" };
    }
}

export async function deletePosSetupItem(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID is required" };

        const result = await prisma.posSetupItem.deleteMany({ where: { id } });
        if (result.count === 0) {
            return { success: false, error: "Entry not found or already deleted" };
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting POS setup item:", error);
        return { success: false, error: error.message || "Failed to delete entry" };
    }
}
