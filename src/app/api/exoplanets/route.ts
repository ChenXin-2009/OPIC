import { NextRequest, NextResponse } from 'next/server';
import { fetchExoplanetIndex, fetchExoplanetSystem } from '@/lib/server/exoplanetArchiveClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hostname = searchParams.get('hostname');
    const refresh = searchParams.get('refresh') === '1';

    if (hostname) {
      const system = await fetchExoplanetSystem(hostname, refresh);
      return NextResponse.json(system, {
        headers: {
          'Cache-Control': 'public, max-age=43200',
        },
      });
    }

    const index = await fetchExoplanetIndex(refresh);
    return NextResponse.json(index, {
      headers: {
        'Cache-Control': 'public, max-age=43200',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown exoplanet API error';
    return NextResponse.json(
      {
        error: 'EXOPLANET_ARCHIVE_ERROR',
        message,
      },
      { status: 502 }
    );
  }
}
