// src/lib/cookies.ts
import type { NextApiResponse } from 'next';

export const COOKIE_NAME = 'customer_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const COOKIE_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.auricle.co.uk';

type HeaderWritable = Pick<NextApiResponse, 'setHeader'>;

function buildCookie(name: string, value: string, maxAge: number): string {
  const parts: string[] = [];

  if (value) {
    parts.push(`${name}=${encodeURIComponent(value)}`);
  } else {
    parts.push(`${name}=`);
  }

  parts.push('Path=/');
  parts.push('SameSite=None');
  parts.push(`Max-Age=${maxAge}`);
  if (maxAge > 0) {
    const expires = new Date(Date.now() + maxAge * 1000);
    parts.push(`Expires=${expires.toUTCString()}`);
  }
  if (COOKIE_DOMAIN) {
    parts.push(`Domain=${COOKIE_DOMAIN}`);
  }
  parts.push('Secure');

  return parts.join('; ');
}

export function setCustomerCookie(res: HeaderWritable, token: string): void {
  const cookie = buildCookie(COOKIE_NAME, token, COOKIE_MAX_AGE);
  res.setHeader('Set-Cookie', cookie);
}

export function clearCustomerCookie(res: HeaderWritable): void {
  const cookie = buildCookie(COOKIE_NAME, '', 0);
  res.setHeader('Set-Cookie', cookie);
}
