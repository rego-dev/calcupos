import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser } from '@/app/(app)/users/actions';
import { requireApiPermission } from '@/lib/require-auth';

// GET /api/users - Get all users
export async function GET() {
  try {
    const auth = await requireApiPermission('users');
    if (!auth.ok) return auth.response;

    const users = await getUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiPermission('users');
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { name, email, password, role, branchId, permissions } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    const result = await createUser({
      name,
      email,
      password,
      role,
      branchId,
      permissions,
    });

    if (result.error) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: result.user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
