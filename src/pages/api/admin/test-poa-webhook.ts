import type { NextApiRequest, NextApiResponse } from 'next';
import { auricleAdmin, shopifyAdminGraphql } from '@/lib/shopifyAdmin';

const PRODUCT_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
    }
  }
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { productHandle } = req.body as { productHandle?: string };

  if (!productHandle) {
    return res.status(400).json({ error: 'productHandle is required' });
  }

  try {
    console.log('Testing webhook with product handle:', productHandle);

    // Fetch the product from Auricle
    const productResult = await shopifyAdminGraphql<{
      productByHandle: { id: string; title: string; handle: string } | null;
    }>(auricleAdmin, PRODUCT_QUERY, { handle: productHandle });

    const product = productResult.productByHandle;

    if (!product) {
      return res.status(404).json({
        error: `Product not found with handle: ${productHandle}`,
      });
    }

    console.log('Found product:', { id: product.id, title: product.title });

    // Trigger the webhook by making a request to the webhook endpoint
    // The payload mimics what Shopify would send
    const webhookPayload = JSON.stringify({
      id: parseInt(product.id.split('/').pop() || '0', 10),
      handle: product.handle,
      title: product.title,
      status: 'active',
      body_html: null,
      variants: [],
    });

    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${baseUrl}/api/auricle-product-webhook`;

    console.log('Calling webhook at:', webhookUrl);

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Topic': 'products/update',
        'X-Shopify-Shop-Domain': process.env.AURICLE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN || '',
        'X-Shopify-Hmac-Sha256': 'test-hmac',
      },
      body: webhookPayload,
    });

    const webhookText = await webhookResponse.text();
    console.log('Webhook response status:', webhookResponse.status);
    console.log('Webhook response text:', webhookText);

    let webhookData;
    try {
      webhookData = JSON.parse(webhookText);
    } catch {
      webhookData = { raw: webhookText };
    }

    return res.status(200).json({
      status: 'webhook-triggered',
      product: { id: product.id, title: product.title, handle: product.handle },
      webhookResponse: webhookData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error testing webhook', err);
    return res.status(500).json({ error: message, stack: err instanceof Error ? err.stack : undefined });
  }
}
