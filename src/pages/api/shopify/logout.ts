import type { NextApiRequest, NextApiResponse } from 'next';
import { clearCustomerCookie } from '@/lib/cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  clearCustomerCookie(res);
  return res.status(200).json({ success: true });
}
