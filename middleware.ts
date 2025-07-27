import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_NAME } from './src/lib/cookies';
import { verifyToken } from './src/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.next();
  }

  try {
    const payload = await verifyToken(token);
    if (payload) {
      const response = NextResponse.next();
      response.headers.set('x-customer-authenticated', 'true');
      if (typeof payload === 'object' && payload.email) {
        response.headers.set('x-customer-email', String(payload.email));
      }
      return response;
    }
  } catch {
    // ignore verification errors
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
