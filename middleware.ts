import { NextRequest, NextResponse } from 'next/server'

// Regex for public static files like .js, .css, images, etc.
const PUBLIC_FILE = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico)$/i

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Place custom middleware logic for dynamic pages here
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/product/:path*',
    '/account/:path*',
    '/checkout/:path*',
    '/collection/:path*',
    '/piercing/:path*',
    '/piercing-magazine/:path*',
    '/favourites',
    '/sign-in',
    '/register',
    '/reset-password',
    '/search',
  ],
}
