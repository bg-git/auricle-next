import type { NextApiRequest, NextApiResponse } from 'next';
import { poaAdmin, shopifyAdminGet } from '@/lib/shopifyAdmin';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Fetch basic shop info from Pierce of Art
    const data = await shopifyAdminGet(poaAdmin, 'shop.json');

    return res.status(200).json({
      ok: true,
      shop: data.shop?.name ?? 'Unknown',
      domain: data.shop?.myshopify_domain ?? 'Unknown',
    });
  } catch (err) {
    console.error('POA test failed', err);
    return res.status(500).json({ ok: false, error: 'POA test failed' });
  }
}
