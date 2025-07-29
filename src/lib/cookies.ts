export const COOKIE_NAME = 'customer_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function setCustomerCookie(res: any, token: string) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = process.env.AUTH_COOKIE_DOMAIN;
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  let cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Expires=${expires.toUTCString()}`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += '; Secure';
  res.setHeader('Set-Cookie', cookie);
}

export function clearCustomerCookie(res: any) {
  const secure = process.env.NODE_ENV === 'production';
  const domain = process.env.AUTH_COOKIE_DOMAIN;
  let cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  if (domain) cookie += `; Domain=${domain}`;
  if (secure) cookie += '; Secure';
  res.setHeader('Set-Cookie', cookie);
}
