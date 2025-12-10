import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/cookies';
import { verifyCustomerSession } from '@/lib/verifyCustomerSession';

// Regex for public static files like .js, .css, images, etc.
const PUBLIC_FILE = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico)$/i;

// Basic auth for /admin
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-now';

function unauthorizedResponse() {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Admin Area"',
    },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 🔐 Basic auth for /admin routes (runs BEFORE customer session stuff)
  if (pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Basic ')) {
      return unauthorizedResponse();
    }

    const base64Credentials = authHeader.split(' ')[1] || '';
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return unauthorizedResponse();
    }

    // Auth OK → continue to /admin page
    return NextResponse.next();
  }

  // 🔑 Existing customer session logic for non-admin protected routes
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (sessionCookie) {
    const customer = await verifyCustomerSession(sessionCookie);
    if (customer) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-customer', JSON.stringify(customer));
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

// IMPORTANT: include /admin/:path* here
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
    '/admin/:path*',
  ],
};
