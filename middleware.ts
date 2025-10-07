import { NextRequest, NextResponse } from 'next/server'
import { COOKIE_NAME } from '@/lib/cookies'
import { verifyCustomerSession } from '@/lib/verifyCustomerSession'

const PUBLIC_FILE = /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico)$/i

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next internals, static assets
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/sw.js' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Only rewrite real document navigations (not fetch/XHR/data preloads)
  const isGET = request.method === 'GET';
  const dest = request.headers.get('sec-fetch-dest') || ''; // 'document' for real page loads
  const mode = request.headers.get('sec-fetch-mode') || ''; // 'navigate' for navs
  const isDocumentNav = isGET && dest === 'document' && mode === 'navigate';

  // Forward x-customer when we have a session
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;
  const requestHeaders = new Headers(request.headers);

  type MinimalCustomer = { approved?: boolean; tags?: string[] | null };

  if (sessionCookie) {
    const customer = (await verifyCustomerSession(sessionCookie)) as MinimalCustomer | null;

    if (customer) {
      requestHeaders.set('x-customer', JSON.stringify(customer));

      const tags = Array.isArray(customer.tags) ? customer.tags : [];
      const hasApprovedTag = tags.some((t) => typeof t === 'string' && t.toLowerCase() === 'approved');
      const isApproved = Boolean(customer.approved === true || hasApprovedTag);

      // 🔒 Only rewrite approved users on top-level product page loads
      if (isApproved && isDocumentNav && pathname.startsWith('/product/')) {
        const url = request.nextUrl.clone();
        url.pathname = '/w' + pathname; // internal SSR wholesale route
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
      }
    }

    // Not approved or not a document navigation → just forward headers
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // No session → pass through untouched
  return NextResponse.next();
}
