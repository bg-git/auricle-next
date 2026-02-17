import type { NextApiRequest, NextApiResponse } from 'next';

const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret (Vercel Cron sends Authorization header)
  if (CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;

  const results: Record<string, any> = {};
  const syncOrder = ['sync-products', 'sync-customers', 'sync-orders'];

  console.log('Starting full Shopify sync...');

  for (const endpoint of syncOrder) {
    try {
      console.log(`Running ${endpoint}...`);
      const response = await fetch(`${baseUrl}/api/cron/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      results[endpoint] = { status: response.status, ...data };

      if (!response.ok) {
        console.error(`${endpoint} failed:`, data);
      } else {
        console.log(`${endpoint} complete:`, data);
      }
    } catch (error: any) {
      console.error(`${endpoint} error:`, error.message);
      results[endpoint] = { status: 500, error: error.message };
    }
  }

  const allSuccessful = Object.values(results).every(
    (r: any) => r.status === 200 && r.success
  );

  console.log('Full sync complete:', results);

  return res.status(200).json({
    success: allSuccessful,
    timestamp: new Date().toISOString(),
    results,
  });
}
