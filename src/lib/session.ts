import "server-only";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
    userId?: number;
}

/**
 * Resolve the session password from the environment. Throwing here (rather than
 * silently using a weak/undefined secret) guarantees the app cannot boot into an
 * insecure state.
 */
function getSessionPassword(): string {
    const password = process.env.SESSION_SECRET;
    if (!password || password.length < 32) {
        throw new Error(
            "SESSION_SECRET is missing or too short. Set a random string of at least 32 characters in your environment."
        );
    }
    return password;
}

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function buildSessionOptions(): SessionOptions {
    return {
        password: getSessionPassword(),
        cookieName: "session",
        ttl: ONE_WEEK_SECONDS,
        cookieOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: ONE_WEEK_SECONDS,
            path: "/",
        },
    };
}

/** Read (and lazily create) the encrypted/signed session for the current request. */
export async function getSession(): Promise<IronSession<SessionData>> {
    const cookieStore = await cookies();
    return getIronSession<SessionData>(cookieStore, buildSessionOptions());
}

/** Issue a fresh session for the given user id. */
export async function createSession(userId: number): Promise<void> {
    const session = await getSession();
    session.userId = userId;
    await session.save();
}

/** Destroy the current session (logout). */
export async function destroySession(): Promise<void> {
    const session = await getSession();
    session.destroy();
}

/** Convenience: the authenticated user id, or null if there is no valid session. */
export async function getSessionUserId(): Promise<number | null> {
    const session = await getSession();
    return typeof session.userId === "number" ? session.userId : null;
}
