import { type NextRequest, NextResponse } from 'next/server'

// This project is deprecated. Every request is redirected to the live
// system at nueva-marina-app.vercel.app with a permanent 308 redirect,
// preserving the path and query string so bookmarks keep working.
export function middleware(request: NextRequest) {
  const target = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    'https://nueva-marina-app.vercel.app',
  )
  return NextResponse.redirect(target, 308)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
