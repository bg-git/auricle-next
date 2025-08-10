export const COOKIE_NAME = 'customer_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function setCustomerCookie(res: any, token: string) {
  const domain = process.env.AUTH_COOKIE_DOMAIN || '.auricle.co.uk';
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=None; Max-Age=${COOKIE_MAX_AGE}; Expires=${expires.toUTCString()}; Domain=${domain}; Secure`;
  res.setHeader('Set-Cookie', cookie);
}

export function clearCustomerCookie(res: any) {
  const domain = process.env.AUTH_COOKIE_DOMAIN || '.auricle.co.uk';
  const cookie = `${COOKIE_NAME}=; Path=/; SameSite=None; Max-Age=0; Domain=${domain}; Secure`;
  res.setHeader('Set-Cookie', cookie);
}
