import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// KES-193: statically-prerendered/ISR-cached routes ("/" and "/game") are
// served from a fast-path cache reader that bypasses next.config.ts's
// headers() entirely — confirmed on both plain `next start` and the
// Cloudflare/OpenNext worker. Vercel masked this by injecting vercel.json's
// headers at their edge, outside Next. Middleware runs in front of that
// cache lookup on every platform, so it's the portable replacement for what
// vercel.json used to do. (public/_headers covers /sw.js separately — that's
// a literal static file served straight off the Workers ASSETS binding and
// never reaches the Worker/middleware at all.)
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const { pathname } = request.nextUrl

  if (pathname === '/') {
    response.headers.set('Cache-Control', 'no-cache')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
  } else if (pathname.startsWith('/game/') || pathname === '/game') {
    response.headers.set('Cache-Control', 'no-cache')
    response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless')
  }

  return response
}

export const config = {
  matcher: ['/', '/game', '/game/:path*'],
}
