export const COOKIE_NAME = 'customer_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds
const COOKIE_DOMAIN =
  process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.auricle.co.uk';

export function setCustomerCookie(res: any, token: string) {
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Path=/; SameSite=None; Max-Age=${COOKIE_MAX_AGE}; Expires=${expires.toUTCString()}; Domain=${COOKIE_DOMAIN}; Secure`;
  res.setHeader('Set-Cookie', cookie);
}

export function clearCustomerCookie(res: any) {
  const cookie = `${COOKIE_NAME}=; Path=/; SameSite=None; Max-Age=0; Domain=${COOKIE_DOMAIN}; Secure`;
  res.setHeader('Set-Cookie', cookie);
}
