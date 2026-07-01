import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/app/(app)/inventory/actions';
import { requireApiPermission } from '@/lib/require-auth';

// GET /api/inventory - Get all products
export async function GET() {
  try {
    const auth = await requireApiPermission('inventory');
    if (!auth.ok) return auth.response;

    const products = await getProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/inventory - Create a new product
export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiPermission('inventory');
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const productData = body;

    const newProduct = await createProduct(productData);
    return NextResponse.json(
      { success: true, data: newProduct },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
