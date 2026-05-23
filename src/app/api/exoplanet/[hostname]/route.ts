import { NextRequest, NextResponse } from 'next/server';
import { fetchExoplanetSystem } from '@/lib/server/exoplanetArchiveClient';

interface RouteContext {
  params: Promise<{ hostname: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { hostname } = await context.params;
    const { searchParams } = new URL(request.url);
    const refresh = searchParams.get('refresh') === '1';
    const system = await fetchExoplanetSystem(decodeURIComponent(hostname), refresh);

    return NextResponse.json(system, {
      headers: {
        'Cache-Control': 'public, max-age=43200',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown exoplanet API error';
    return NextResponse.json(
      {
        error: 'EXOPLANET_SYSTEM_ERROR',
        message,
      },
      { status: 502 }
    );
  }
}
