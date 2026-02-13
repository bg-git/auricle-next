import type { NextApiRequest, NextApiResponse } from 'next';
import { auricleAdmin, shopifyAdminGraphql } from '@/lib/shopifyAdmin';

const REGISTER_WEBHOOK_MUTATION = `
  mutation CreateWebhook($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        topic
        endpoint {
          __typename
        }
      }
      userErrors {
        field
        message
      }
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

  try {
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      return res.status(400).json({
        error: 'APP_URL not configured in environment',
      });
    }

    const webhookUrl = `${baseUrl}/api/auricle-product-webhook`;

    console.log('Registering product update webhook', { webhookUrl });

    const result = await shopifyAdminGraphql<{
      webhookSubscriptionCreate: {
        webhookSubscription: {
          id: string;
          topic: string;
          endpoint: { __typename: string };
        } | null;
        userErrors: Array<{ field: string[]; message: string }>;
      };
    }>(auricleAdmin, REGISTER_WEBHOOK_MUTATION, {
      topic: 'PRODUCTS_UPDATE',
      webhookSubscription: {
        callbackUrl: webhookUrl,
      },
    });

    if (result.webhookSubscriptionCreate.userErrors?.length > 0) {
      const errors = result.webhookSubscriptionCreate.userErrors;
      console.error('Webhook registration errors', errors);
      return res.status(400).json({
        error: 'Failed to register webhook',
        userErrors: errors,
      });
    }

    const webhook = result.webhookSubscriptionCreate.webhookSubscription;
    if (!webhook) {
      console.error('Webhook subscription is null', { result });
      return res.status(500).json({
        error: 'Webhook subscription is null',
        result,
      });
    }

    console.log('Webhook registered successfully', {
      id: webhook.id,
      topic: webhook.topic,
    });

    return res.status(200).json({
      status: 'success',
      webhook: {
        id: webhook.id,
        topic: webhook.topic,
        endpoint: webhookUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error registering webhook', { error: message, err });
    return res.status(500).json({ error: message, details: String(err) });
  }
}
