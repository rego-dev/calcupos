import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSession } from '@/lib/session';
import { rateLimit, resetRateLimit } from '@/lib/rate-limit';

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// POST /api/auth/login - Authenticate user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Rate limit by client IP + email to slow brute-force / credential stuffing.
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rlKey = `login:${ip}:${String(email).toLowerCase()}`;
    const rl = rateLimit(rlKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Check if relations are available in the current client
    const canInclude = (prisma.user as any).fields?.role_rel?.isRelation;

    const user = await (prisma.user as any).findUnique({
      where: { email },
      include: canInclude ? {
        role_rel: true,
        branch: true,
      } : undefined,
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Credentials verified — clear the rate-limit bucket and issue a signed,
    // encrypted session cookie (iron-session) that cannot be forged client-side.
    resetRateLimit(rlKey);
    await createSession(user.id);

    // Transform user data for response
    const transformedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role_rel ? {
        id: user.role_rel.id,
        name: user.role_rel.name,
        createdAt: user.role_rel.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: user.role_rel.updatedAt?.toISOString() || new Date().toISOString(),
      } : null,
      branchId: user.branchId,
      branch: user.branch ? {
        id: user.branch.id,
        name: user.branch.name,
        createdAt: user.branch.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: user.branch.updatedAt?.toISOString() || new Date().toISOString(),
      } : null,
      permissions: user.permissions,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: {
        user: transformedUser,
        message: 'Login successful'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
