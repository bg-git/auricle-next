export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  tags?: string[];
  approved?: boolean;
  [key: string]: unknown;
}

export async function verifyCustomerSession(token: string): Promise<ShopifyCustomer | null> {
  const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
  const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;
  const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/2024-04/graphql.json`;
  const ADMIN_API_KEY = process.env.SHOPIFY_ADMIN_API_KEY!;

  const query = `
    query customer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        firstName
        lastName
        email
        phone
        acceptsMarketing
        createdAt
        updatedAt
        metafield(namespace: "custom", key: "approved") {
          value
        }
      }
    }
  `;

  const variables = { customerAccessToken: token };

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors || !json.data.customer) {
      return null;
    }

    const customer = json.data.customer;

    let tags: string[] = [];
    if (customer.email) {
      const adminRes = await fetch(
        `https://${SHOPIFY_DOMAIN}/admin/api/2023-01/customers/search.json?query=email:${encodeURIComponent(customer.email)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ADMIN_API_KEY,
          },
        }
      );

      const adminJson = await adminRes.json();
      if (adminJson.customers && adminJson.customers.length > 0) {
        const adminCustomer = adminJson.customers[0];
        if (adminCustomer.tags) {
          tags = adminCustomer.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean);
        }
      }
    }

    const isApproved = (t: string[]) =>
      t.map((tag) => tag.toLowerCase()).includes('approved');

    return { ...customer, tags, approved: isApproved(tags) };
  } catch {
    return null;
  }
}
