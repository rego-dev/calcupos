"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserPermissions } from "./types";
import { createSession, destroySession, getSessionUserId } from "./session";
import { rateLimit, resetRateLimit } from "./rate-limit";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function login(prevState: any, formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    // Rate limit by client IP + email to slow down credential stuffing / brute force.
    const headerStore = await headers();
    const ip =
        headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headerStore.get("x-real-ip") ||
        "unknown";
    const rlKey = `login:${ip}:${email.toLowerCase()}`;
    const rl = rateLimit(rlKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rl.allowed) {
        return {
            error: `Too many login attempts. Please try again in ${Math.ceil(
                rl.retryAfterSeconds / 60
            )} minute(s).`,
        };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { role_rel: true }
        });

        if (!user) {
            return { error: "Invalid email or password" };
        }

        if ((user as any).isActive === false) {
            return { error: "Account is inactive. Please contact an administrator." };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return { error: "Invalid email or password" };
        }

        // Credentials verified — clear the rate-limit bucket and issue a signed,
        // encrypted session cookie (iron-session) that cannot be forged client-side.
        resetRateLimit(rlKey);
        await createSession(user.id);

        await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true }
        });

        // Success
        // Determine where to redirect based on permissions
        const userWithPerms = user as any;
        const roleName = userWithPerms.role_rel?.name || userWithPerms.role;
        const isCashier = roleName?.toLowerCase() === 'cashier';
        const permissions = userWithPerms.permissions as UserPermissions;

        if (isCashier) {
            redirect("/pos");
        }

        if (permissions?.dashboard) {
            redirect("/dashboard");
        }

        const availablePaths = [
            { key: 'pos', path: '/pos' }, // Give POS priority over orders
            { key: 'orders', path: '/orders' },
            { key: 'inventory', path: '/inventory' },
            { key: 'customers', path: '/customers' },
            { key: 'stations', path: '/stations' },
            { key: 'warehouses', path: '/warehouses' },
            { key: 'preOrders', path: '/pre-orders' },
            { key: 'reports', path: '/reports' },
            { key: 'sales', path: '/sales' },
            { key: 'users', path: '/users' },
            { key: 'settings', path: '/settings' },
        ];

        const firstAvailable = availablePaths.find(p => permissions?.[p.key as keyof UserPermissions]);

        if (firstAvailable) {
            redirect(firstAvailable.path);
        } else {
            redirect("/profile");
        }

    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) {
            throw error;
        }
        console.error("Login error:", error);
        return { error: "An unexpected error occurred. Please try again." };
    }
}

export async function logout() {
    const userId = await getSessionUserId();

    if (userId !== null) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { isOnline: false }
            });
        } catch (error) {
            console.error("Failed to update user status on logout", error);
        }
    }

    await destroySession();
    redirect("/login");
}
