import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  const domain =
    process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '') || '';
  const query = `
    mutation {
      cartCreate {
        cart {
          id
        }
      }
    }
  `;

  const response = await fetch(
    `https://${domain}/api/2023-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );

  const json = await response.json();
  res.status(200).json(json.data.cartCreate.cart);
}
