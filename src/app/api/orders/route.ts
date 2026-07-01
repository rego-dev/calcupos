import { NextRequest, NextResponse } from 'next/server';
import { getOrders, createOrder } from '@/app/(app)/orders/actions';
import { requireApiPermission } from '@/lib/require-auth';

// GET /api/orders - Get all orders
export async function GET() {
  try {
    const auth = await requireApiPermission('orders');
    if (!auth.ok) return auth.response;

    const orders = await getOrders();
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST /api/orders - Create a new order
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiPermission('orders');
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const orderData = body;

    const newOrder = await createOrder(orderData);
    return NextResponse.json(
      { success: true, data: newOrder },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
