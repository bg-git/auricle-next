// src/lib/shopifyAdmin.ts

type ShopifyAdminConfig = {
  domain: string;
  token: string;
};

// 🔧 Auricle: support both legacy + new env names
const AURICLE_DOMAIN =
  process.env.AURICLE_SHOPIFY_STORE_DOMAIN ??
  process.env.SHOPIFY_STORE_DOMAIN;

const AURICLE_TOKEN =
  process.env.AURICLE_SHOPIFY_ADMIN_API_ACCESS_TOKEN ??
  process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN ??
  process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

if (!AURICLE_DOMAIN || !AURICLE_TOKEN) {
  console.error('Shopify Admin env check failed', {
    hasAuricleDomain: !!process.env.AURICLE_SHOPIFY_STORE_DOMAIN,
    hasShopifyDomain: !!process.env.SHOPIFY_STORE_DOMAIN,
    hasAuricleToken: !!process.env.AURICLE_SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    hasApiToken: !!process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    hasLegacyToken: !!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  });

  throw new Error(
    'Missing Shopify Admin env vars. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_API_ACCESS_TOKEN (or SHOPIFY_ADMIN_ACCESS_TOKEN / AURICLE_* equivalents).',
  );
}

// Pierce of Art config
const POA_DOMAIN = process.env.POA_SHOPIFY_STORE_DOMAIN;
const POA_TOKEN = process.env.POA_SHOPIFY_ADMIN_API_ACCESS_TOKEN;

if (!POA_DOMAIN || !POA_TOKEN) {
  console.error('Pierce of Art Shopify Admin env check failed', {
    hasPoaDomain: !!process.env.POA_SHOPIFY_STORE_DOMAIN,
    hasPoaToken: !!process.env.POA_SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    vercelEnv: process.env.VERCEL_ENV,
    nodeEnv: process.env.NODE_ENV,
  });

  throw new Error(
    'Missing Pierce of Art Shopify Admin env vars. Set POA_SHOPIFY_STORE_DOMAIN and POA_SHOPIFY_ADMIN_API_ACCESS_TOKEN.',
  );
}

export const auricleAdmin: ShopifyAdminConfig = {
  domain: AURICLE_DOMAIN,
  token: AURICLE_TOKEN,
};

export const poaAdmin: ShopifyAdminConfig = {
  domain: POA_DOMAIN,
  token: POA_TOKEN,
};

export async function shopifyAdminGet(
  store: ShopifyAdminConfig,
  path: string,
) {
  const url = `https://${store.domain}/admin/api/2024-07/${path}`;

  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': store.token,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify Admin GET error', {
      domain: store.domain,
      path,
      status: res.status,
      body: text,
    });
    throw new Error(
      `Shopify Admin GET failed: ${res.status} for ${store.domain}/${path}`,
    );
  }

  return res.json();
}

export async function shopifyAdminGraphql<T = unknown>(
  store: ShopifyAdminConfig,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const url = `https://${store.domain}/admin/api/2024-07/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': store.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify Admin GraphQL error', {
      domain: store.domain,
      status: res.status,
      body: text,
    });
    throw new Error(
      `Shopify Admin GraphQL failed: ${res.status} for ${store.domain}`,
    );
  }

  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (json.errors && json.errors.length > 0) {
    console.error('Shopify Admin GraphQL response errors', json.errors);
    throw new Error(json.errors[0].message);
  }

  if (!json.data) {
    throw new Error('Shopify Admin GraphQL response missing data');
  }

  return json.data;
}

export async function shopifyAdminPost(
  store: ShopifyAdminConfig,
  path: string,
  body: unknown,
) {
  const url = `https://${store.domain}/admin/api/2024-07/${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': store.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify Admin POST error', {
      domain: store.domain,
      path,
      status: res.status,
      body: text,
    });
    throw new Error(
      `Shopify Admin POST failed: ${res.status} for ${store.domain}/${path}`,
    );
  }

  return res.json();
}

export async function shopifyAdminPut(
  store: ShopifyAdminConfig,
  path: string,
  body: unknown,
) {
  const url = `https://${store.domain}/admin/api/2024-07/${path}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'X-Shopify-Access-Token': store.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Shopify Admin PUT error', {
      domain: store.domain,
      path,
      status: res.status,
      body: text,
    });
    throw new Error(
      `Shopify Admin PUT failed: ${res.status} for ${store.domain}/${path}`,
    );
  }

  return res.json();
}
