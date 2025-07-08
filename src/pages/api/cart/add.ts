import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const domain =
    process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '') || '';
  const { cartId, lines } = JSON.parse(req.body);

  const query = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    image {
                      url
                    }
                    product {
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = { cartId, lines };

  const response = await fetch(
    `https://${domain}/api/2023-01/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  const json = await response.json();
  res.status(200).json(json.data.cartLinesAdd.cart);
}
