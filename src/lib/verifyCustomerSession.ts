export async function verifyCustomerSession(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/shopify/get-customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return data.customer || null;
}
