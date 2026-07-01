import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, checkPermission } from "./auth-server";
import type { User, UserPermissions } from "./types";

/** Thrown by the server-action guards (`requireUser` / `requirePermission`). */
export class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
        this.name = "AuthError";
    }
}

// --- Server Action guards (throw on failure) -------------------------------

export async function requireUser(): Promise<User> {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("Unauthorized", 401);
    return user;
}

export async function requirePermission(
    permission: keyof UserPermissions
): Promise<User> {
    const user = await requireUser();
    const allowed = await checkPermission(permission);
    if (!allowed) throw new AuthError("Forbidden", 403);
    return user;
}

// --- API Route guards (return a response on failure) -----------------------

type ApiAuthOk = { ok: true; user: User };
type ApiAuthFail = { ok: false; response: NextResponse };

export async function requireApiUser(): Promise<ApiAuthOk | ApiAuthFail> {
    const user = await getCurrentUser();
    if (!user) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            ),
        };
    }
    return { ok: true, user };
}

export async function requireApiPermission(
    permission: keyof UserPermissions
): Promise<ApiAuthOk | ApiAuthFail> {
    const auth = await requireApiUser();
    if (!auth.ok) return auth;

    const allowed = await checkPermission(permission);
    if (!allowed) {
        return {
            ok: false,
            response: NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            ),
        };
    }
    return auth;
}
