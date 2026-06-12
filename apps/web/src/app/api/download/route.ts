import { NextRequest, NextResponse } from 'next/server';

// GET /api/download?url=<encoded_url>&name=<filename>
// Server-side proxy that adds Content-Disposition: attachment to force browser download,
// working around GCS CORS restrictions that block client-side fetch.
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const name = request.nextUrl.searchParams.get('name') || 'download';

  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  // Restrict to GCS URLs only
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('storage.googleapis.com') && !parsed.hostname.includes('storage.cloud.google.com')) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 });
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    const buffer = await upstream.arrayBuffer();

    const safeFilename = name.replace(/[^\w\-. ]/g, '_');
    const encodedFilename = encodeURIComponent(safeFilename);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (err) {
    console.error('[Download proxy] error:', err);
    return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
  }
}
