// src/pages/api/admin/sync-poa-products.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  auricleAdmin,
  poaAdmin,
  shopifyAdminGet,
  shopifyAdminGraphql,
  shopifyAdminPost,
  shopifyAdminPut,
} from '@/lib/shopifyAdmin';

type FeedVariant = {
  id: number;
  gid: string;
  sku: string | null;
  price: string;   // Auricle wholesale price
  inventoryQuantity: number;
  title: string;
  poaEnabled: boolean;
  poaPrice: string; // POA retail price
};

type FeedProduct = {
  id: number;
  gid: string;
  title: string;
  handle: string;
  status: string;
  descriptionHtml: string;
  imageUrls: string[];
  variants: FeedVariant[];
};

type PoaVariant = {
  id: number;
  sku: string | null;
  price: string;
  title: string;
  inventory_item_id?: number;
  inventory_management?: string;
  inventory_quantity?: number;
};

type PoaProduct = {
  id: number;
  title: string;
  handle: string;
  status: string;
  variants: PoaVariant[];
};

type PoaLocation = {
  id: number;
  name: string;
};

type PoaProductsResponse = {
  products: PoaProduct[];
};

type MetafieldNode = {
  key: string;
  value: string;
  type: string;
};

type MetafieldEdge = {
  node: MetafieldNode;
};

type ImageNode = {
  url: string;
};

type ImageEdge = {
  node: ImageNode;
};

type VariantNode = {
  id: string;
  sku: string | null;
  price: string;
  inventoryQuantity: number;
  title: string;
  metafields: {
    edges: MetafieldEdge[];
  };
};

type VariantEdge = {
  node: VariantNode;
};

type ProductNode = {
  id: string;
  title: string;
  handle: string;
  status: string;
  descriptionHtml: string | null;
  images: {
    edges: ImageEdge[];
  };
  variants: {
    edges: VariantEdge[];
  };
};

type ProductEdge = {
  node: ProductNode;
};

type ProductsConnection = {
  edges: ProductEdge[];
};

type AuricleFeedQueryResult = {
  products: ProductsConnection;
};

function extractNumericId(gid: string): number {
  const parts = gid.split('/');
  const last = parts[parts.length - 1];
  const asNumber = Number(last);
  if (Number.isNaN(asNumber)) {
    throw new Error(`Cannot extract numeric ID from gid: ${gid}`);
  }
  return asNumber;
}

async function loadAuricleFeed(): Promise<FeedProduct[]> {
  const query = `
    query AuriclePoaFeed {
      products(first: 100) {
        edges {
          node {
            id
            title
            handle
            status
            descriptionHtml
            images(first: 10) {
              edges {
                node {
                  url
                }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  sku
                  price
                  inventoryQuantity
                  title
                  metafields(first: 10, namespace: "custom") {
                    edges {
                      node {
                        key
                        value
                        type
                      }
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

  const data = await shopifyAdminGraphql<AuricleFeedQueryResult>(
    auricleAdmin,
    query,
  );

  const feed: FeedProduct[] = data.products.edges
    .map((productEdge) => productEdge.node)
    .filter((p) => p.status === 'ACTIVE') // only active Auricle products
    .map((p) => {
      const productId = extractNumericId(p.id);

      const imageUrls =
        p.images?.edges.map((edge) => edge.node.url) ?? [];

        const variants: FeedVariant[] = p.variants.edges.map((variantEdge) => {
          const v = variantEdge.node;
          const variantId = extractNumericId(v.id);

          let poaEnabled = false;
        let poaPrice: string | null = null;

        for (const mfEdge of v.metafields.edges) {
          const mf = mfEdge.node;

          if (mf.key === 'poa_enabled') {
            poaEnabled = mf.value === 'true';
          }

          if (mf.key === 'poa_price') {
            poaPrice = mf.value;
          }
        }

        const effectivePoaPrice = poaPrice ?? v.price;

          return {
            id: variantId,
            gid: v.id,
            sku: v.sku,
            price: v.price,
            inventoryQuantity: v.inventoryQuantity,
            title: v.title,
            poaEnabled,
            poaPrice: effectivePoaPrice,
          };
        });

      return {
        id: productId,
        gid: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        descriptionHtml: p.descriptionHtml ?? '',
        imageUrls,
        variants,
      };
    });

  return feed;
}
const POA_INVENTORY_ITEM_TRACK_MUTATION = `
  mutation TrackInventoryItem($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem { id tracked }
      userErrors { field message }
    }
  }
`;

function toInventoryItemGid(inventoryItemId: number): string {
  return `gid://shopify/InventoryItem/${inventoryItemId}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('sync-poa-products called with method:', req.method);

  // Only run real sync if ?apply=1 or ?apply=true
  const applyRaw = req.query.apply;
  const apply =
    applyRaw === '1' ||
    applyRaw === 'true' ||
    (Array.isArray(applyRaw) && applyRaw.includes('1'));

  try {
    // 1) Load Auricle products/variants (with metafields, description, images)
    const auricleProducts = await loadAuricleFeed();

    // 2) Filter to only variants that are POA enabled
    const auricleForPoa: FeedProduct[] = auricleProducts
      .map((p) => ({
        ...p,
        variants: p.variants.filter((v) => v.poaEnabled),
      }))
      .filter((p) => p.variants.length > 0); // throw away products with no enabled variants

    // 3) Load existing POA products
    const poaData = (await shopifyAdminGet(
      poaAdmin,
      'products.json?limit=250',
    )) as PoaProductsResponse;

    const poaLocations = (await shopifyAdminGet(
      poaAdmin,
      'locations.json',
    )) as { locations: PoaLocation[] };

    const locations = poaLocations.locations ?? [];

    const onlineWarehouse = locations.find(
      (loc) => loc.name.toLowerCase() === 'online warehouse',
    );

    if (!onlineWarehouse) {
      throw new Error('Pierce of Art location ONLINE WAREHOUSE not found');
    }

    const existingPoaProducts = poaData.products ?? [];

    const existingByHandle = new Map<string, PoaProduct>();
    for (const p of existingPoaProducts) {
      existingByHandle.set(p.handle, p);
    }

    const toCreate: {
      handle: string;
      title: string;
      variantCount: number;
    }[] = [];
    const toUpdate: {
      handle: string;
      title: string;
      productId: number;
      existingVariantCount: number;
      newVariantCount: number;
    }[] = [];

    for (const p of auricleForPoa) {
      const existing = existingByHandle.get(p.handle);

      if (!existing) {
        toCreate.push({
          handle: p.handle,
          title: p.title,
          variantCount: p.variants.length,
        });
      } else {
        toUpdate.push({
          handle: p.handle,
          title: p.title,
          productId: existing.id,
          existingVariantCount: existing.variants.length,
          newVariantCount: p.variants.length,
        });
      }
    }

    const result: {
      dryRun: boolean;
      applied: boolean;
      auricleProducts: number;
      auricleProductsForPoa: number;
      poaProductsExisting: number;
      created?: number;
      updated?: number;
      inventoryUpdated?: number;
      toCreate: typeof toCreate;
      toUpdate: typeof toUpdate;
    } = {
      dryRun: !apply,
      applied: false,
      auricleProducts: auricleProducts.length,
      auricleProductsForPoa: auricleForPoa.length,
      poaProductsExisting: existingPoaProducts.length,
      toCreate,
      toUpdate,
    };

    if (!apply) {
      // Just show what would happen
      return res.status(200).json(result);
    }

    // 4) Apply changes to POA
    let createdCount = 0;
    let updatedCount = 0;
    let inventoryUpdatedCount = 0;

    // Map existing POA variants by handle + SKU for updates
    const existingVariantsByHandleAndSku = new Map<
      string,
      Map<string, PoaVariant>
    >();

    for (const p of existingPoaProducts) {
      const bySku = new Map<string, PoaVariant>();
      for (const v of p.variants) {
        if (v.sku) {
          bySku.set(v.sku, v);
        }
      }
      existingVariantsByHandleAndSku.set(p.handle, bySku);
    }

    // 4a) Create missing products on POA
    for (const p of auricleForPoa) {
      const exists = existingByHandle.get(p.handle);
      if (exists) continue;

      const variantsPayload = p.variants.map((v) => ({
        sku: v.sku ?? undefined,
        price: v.poaPrice,               // use POA price
        inventory_policy: 'deny',
        inventory_management: 'shopify',
        inventory_quantity: v.inventoryQuantity,
        title: v.title || 'Default',
        option1: v.title || 'Default',
      }));

      try {
        const created = (await shopifyAdminPost(poaAdmin, 'products.json', {
          product: {
            title: p.title,
            handle: p.handle,
            status: 'active',
            body_html: p.descriptionHtml,                           // ✅ description
            images: p.imageUrls.map((url) => ({ src: url })),       // ✅ images
            variants: variantsPayload,
          },
        })) as { product: PoaProduct };

        const createdProduct = created.product;
createdCount += 1;

// ✅ Force POA to track inventory for all created variants
for (const cv of createdProduct.variants) {
  if (!cv.inventory_item_id) continue;

  await shopifyAdminGraphql<{
    inventoryItemUpdate: {
      inventoryItem: { id: string; tracked: boolean } | null;
      userErrors: { field: string[] | null; message: string }[];
    };
  }>(poaAdmin, POA_INVENTORY_ITEM_TRACK_MUTATION, {
    id: toInventoryItemGid(cv.inventory_item_id),
    input: { tracked: true },
  });
}

        

        if (createdProduct) {
          existingByHandle.set(p.handle, createdProduct);

          const bySku = new Map<string, PoaVariant>();
          for (const v of createdProduct.variants) {
            if (v.sku) {
              bySku.set(v.sku, v);
            }
          }
          existingVariantsByHandleAndSku.set(p.handle, bySku);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err);
        console.error(
          `Failed to create POA product for handle ${p.handle}: ${msg}`,
        );
      }
    }

    // 4b) Update existing POA products (prices by SKU)
    for (const p of auricleForPoa) {
      const existing = existingByHandle.get(p.handle);
      if (!existing) continue;

      const bySku = existingVariantsByHandleAndSku.get(p.handle);
      if (!bySku) continue;

      const updates: { id: number; price: string }[] = [];

      for (const v of p.variants) {
        if (!v.sku) continue;
        const existingVariant = bySku.get(v.sku);
        if (!existingVariant) continue;

        if (existingVariant.price !== v.poaPrice) {
          updates.push({
            id: existingVariant.id,
            price: v.poaPrice,
          });
        }
      }

      if (updates.length === 0) continue;

      try {
        await shopifyAdminPut(
          poaAdmin,
          `products/${existing.id}.json`,
          {
            product: {
              id: existing.id,
              variants: updates,
            },
          },
        );
        updatedCount += 1;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err);
        console.error(
          `Failed to update POA product for handle ${p.handle}: ${msg}`,
        );
      }
    }

    // 4c) Enforce Auricle inventory on POA Online Warehouse
    for (const p of auricleForPoa) {
      const bySku = existingVariantsByHandleAndSku.get(p.handle);
      if (!bySku) continue;

      for (const v of p.variants) {
        if (!v.sku) continue;

        const existingVariant = bySku.get(v.sku);
        if (!existingVariant?.inventory_item_id) continue;

        try {
          await shopifyAdminPost(poaAdmin, 'inventory_levels/set.json', {
            location_id: onlineWarehouse.id,
            inventory_item_id: existingVariant.inventory_item_id,
            available: v.inventoryQuantity,
          });
          inventoryUpdatedCount += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(
            `Failed to set inventory for SKU ${v.sku} on POA: ${msg}`,
          );
        }
      }
    }

    result.applied = true;
    result.created = createdCount;
    result.updated = updatedCount;
    result.inventoryUpdated = inventoryUpdatedCount;

    return res.status(200).json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown sync error';
    console.error('Error in sync-poa-products', err);
    return res.status(500).json({ error: message });
  }
}
