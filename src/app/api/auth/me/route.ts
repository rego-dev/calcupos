import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { User } from "@/lib/types";

export async function GET() {
    try {
        const sessionUserId = await getSessionUserId();
        if (sessionUserId === null) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const user = await (prisma.user as any).findUnique({
            where: { id: sessionUserId },
            include: {
                role_rel: true,
                branch: true,
            },
        });

        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const transformedUser: User = {
            id: user.id,
            name: user.name,
            email: user.email,
            roleId: user.roleId,
            role: user.role_rel ? {
                id: user.role_rel.id,
                name: user.role_rel.name,
                createdAt: user.role_rel.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: user.role_rel.updatedAt?.toISOString() || new Date().toISOString(),
            } : (user.role ? {
                id: 'legacy_role',
                name: user.role,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            } : null),
            branchId: user.branchId,
            branch: user.branch ? {
                id: user.branch.id,
                name: user.branch.name,
                createdAt: user.branch.createdAt?.toISOString() || new Date().toISOString(),
                updatedAt: user.branch.createdAt?.toISOString() || new Date().toISOString(),
            } : null,
            permissions: user.permissions as any,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };

        return NextResponse.json({
            user: transformedUser,
        }, { status: 200 });

    } catch (error) {
        console.error("Failed to fetch current user:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
