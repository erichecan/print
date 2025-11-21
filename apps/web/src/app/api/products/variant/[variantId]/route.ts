import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'http://localhost:3001/api';

const API_BASE =
  (process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    DEFAULT_API_BASE)
    .replace(/\/$/, '');

type RouteParams = {
  params: {
    variantId: string;
  };
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { variantId } = params;

  if (!variantId) {
    return NextResponse.json(
      { error: 'variantId is required' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(`${API_BASE}/products/variant/${variantId}`, {
      // Design Lab payload 应该始终获取最新商品图，禁用缓存
      cache: 'no-store',
    });

    const body = await upstream.text();
    const contentType =
      upstream.headers.get('content-type') || 'application/json';

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to fetch product by variantId',
        details:
          process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

