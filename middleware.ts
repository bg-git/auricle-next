import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/cookies'
import { verifyCustomerSession } from '@/lib/verifyCustomerSession'

// Regex for public static files like .js, .css, images, etc.
const PUBLIC_FILE = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico)$/i

export async function middleware(request: NextRequest) {
  // ✅ In development, bypass all auth / gating
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next()
  }

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

  // 🔒 Customer session logic (unchanged)
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value
  if (sessionCookie) {
    const customer = await verifyCustomerSession(sessionCookie)
    if (customer) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-customer', JSON.stringify(customer))
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  return NextResponse.next()
}

// ✅ IMPORTANT: DO NOT INCLUDE /admin OR /api HERE
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
