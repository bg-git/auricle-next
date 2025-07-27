export const COOKIE_NAME = 'customer_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export function setCustomerCookie(res: any, token: string) {
  const secure = process.env.NODE_ENV === 'production';
  const expires = new Date(Date.now() + COOKIE_MAX_AGE * 1000);
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}; Expires=${expires.toUTCString()}${secure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}

export function clearCustomerCookie(res: any) {
  const secure = process.env.NODE_ENV === 'production';
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}
