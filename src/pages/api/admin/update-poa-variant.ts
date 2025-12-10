// src/pages/api/admin/update-poa-variant.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { auricleAdmin, shopifyAdminGraphql } from '@/lib/shopifyAdmin';

type UpdateBody = {
  variantGid: string; // e.g. gid://shopify/ProductVariant/55166050435397
  enabled: boolean;
  poaPrice: string;   // "39.95"
};

type MetafieldsSetResult = {
  metafieldsSet: {
    userErrors: { field: string[] | null; message: string }[];
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const body = req.body as UpdateBody;

    if (!body.variantGid) {
      return res.status(400).json({ error: 'Missing variantGid' });
    }

    const enabled = !!body.enabled;
    const poaPrice = body.poaPrice;

    const mutation = `
      mutation UpdatePoaMetafields(
        $ownerId: ID!,
        $enabled: String!,
        $price: String!
      ) {
        metafieldsSet(metafields: [
          {
            ownerId: $ownerId,
            namespace: "custom",
            key: "poa_enabled",
            type: "boolean",
            value: $enabled
          },
          {
            ownerId: $ownerId,
            namespace: "custom",
            key: "poa_price",
            type: "number_decimal",
            value: $price
          }
        ]) {
          userErrors {
            field
            message
          }
        }
      }
    `;

    const data = await shopifyAdminGraphql<MetafieldsSetResult>(
      auricleAdmin,
      mutation,
      {
        ownerId: body.variantGid,
        enabled: enabled ? 'true' : 'false', // boolean metafield value
        price: poaPrice,                     // decimal as string, e.g. "39.95"
      },
    );

    const errors = data.metafieldsSet.userErrors;
    if (errors && errors.length > 0) {
      console.error('metafieldsSet errors:', errors);
      return res
        .status(500)
        .json({ error: 'Failed to update metafields', errors });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error updating variant';
    console.error('Error in update-poa-variant', message);
    return res.status(500).json({ error: message });
  }
}
