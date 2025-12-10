// src/pages/admin/poa-pricing.tsx
import { useEffect, useState } from 'react';

type FeedVariant = {
  id: number;
  gid: string;
  sku: string | null;
  price: string;
  title: string;
  poaEnabled: boolean;
  poaPrice: string;
};

type FeedProduct = {
  id: number;
  gid: string;
  title: string;
  handle: string;
  status: string;
  variants: FeedVariant[];
};

type FeedResponse = {
  products: FeedProduct[];
};

type SyncResult = {
  dryRun: boolean;
  applied: boolean;
  auricleProducts: number;
  auricleProductsForPoa: number;
  poaProductsExisting: number;
  created?: number;
  updated?: number;
  toCreate: {
    handle: string;
    title: string;
    variantCount: number;
  }[];
  toUpdate: {
    handle: string;
    title: string;
    productId: number;
    existingVariantCount: number;
    newVariantCount: number;
  }[];
};

export default function PoaPricingPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/auricle-product-feed');
        if (!res.ok) {
          throw new Error(`Feed error: ${res.status}`);
        }
        const data: FeedResponse = await res.json();
        setProducts(data.products);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleToggleEnabled = (productId: number, variantId: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId
                  ? { ...v, poaEnabled: !v.poaEnabled }
                  : v,
              ),
            }
          : p,
      ),
    );
  };

  const handlePriceChange = (
    productId: number,
    variantId: number,
    value: string,
  ) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              variants: p.variants.map((v) =>
                v.id === variantId ? { ...v, poaPrice: value } : v,
              ),
            }
          : p,
      ),
    );
  };

  const runDryRunSync = async () => {
    setSyncLoading(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const res = await fetch('/api/admin/sync-poa-products');
      if (!res.ok) {
        throw new Error(`Sync error: ${res.status}`);
      }
      const data: SyncResult = await res.json();
      setSyncResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(msg);
    } finally {
      setSyncLoading(false);
    }
  };

  const runLiveSync = async () => {
    if (!window.confirm('Run live sync to Pierce of Art now?')) {
      return;
    }

    setSyncLoading(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const res = await fetch('/api/admin/sync-poa-products?apply=1');
      if (!res.ok) {
        throw new Error(`Live sync error: ${res.status}`);
      }
      const data: SyncResult = await res.json();
      setSyncResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncError(msg);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSaveVariant = async (variant: FeedVariant) => {
    setSavingVariantId(variant.id);
    setError(null);
    setSyncError(null);
    setSyncResult(null);

    try {
      // 1) Save metafields to Auricle (enabled + POA price)
      const res = await fetch('/api/admin/update-poa-variant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantGid: variant.gid,
          enabled: variant.poaEnabled,
          poaPrice: variant.poaPrice,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Save failed: ${res.status}`);
      }

      // 2) Run dry-run sync so we can see what would happen on POA
      await runDryRunSync();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSavingVariantId(null);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>POA Pricing (Auricle → Pierce of Art)</h1>
      <p>
        Adjust POA retail prices and enable/disable variants for Pierce of Art.
        Clicking <strong>Save</strong> will update Auricle metafields and then
        run a <strong>dry-run sync</strong> to show what would be created or
        updated on Pierce of Art.
      </p>

      <div style={{ margin: '0.75rem 0' }}>
        <button
          type="button"
          onClick={runLiveSync}
          disabled={syncLoading}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: 4,
            border: '1px solid #222',
            background: '#222',
            color: '#fff',
            cursor: syncLoading ? 'default' : 'pointer',
          }}
        >
          {syncLoading ? 'Running sync…' : 'Run live sync to Pierce of Art'}
        </button>
      </div>

      {syncLoading && <p>Running sync…</p>}
      {syncError && (
        <p style={{ color: 'red' }}>Sync error: {syncError}</p>
      )}

      {syncResult && (
        <div
          style={{
            margin: '1rem 0',
            padding: '0.75rem',
            border: '1px solid #ddd',
            background: '#fafafa',
            fontSize: '0.9rem',
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            {syncResult.applied
              ? 'Live sync result'
              : 'Dry-run sync summary'}
          </h3>
          <p style={{ margin: 0 }}>
            Auricle products (active): {syncResult.auricleProducts}
            <br />
            Auricle products enabled for POA:{' '}
            {syncResult.auricleProductsForPoa}
            <br />
            POA products existing: {syncResult.poaProductsExisting}
          </p>
          {syncResult.applied && (
            <p style={{ marginTop: '0.5rem' }}>
              Created on POA: {syncResult.created ?? 0} product(s)
              <br />
              Updated on POA: {syncResult.updated ?? 0} product(s)
            </p>
          )}
          {!syncResult.applied && (
            <p style={{ marginTop: '0.5rem' }}>
              Would create: {syncResult.toCreate.length} product(s)
              <br />
              Would update: {syncResult.toUpdate.length} product(s)
            </p>
          )}
          {syncResult.toCreate.length > 0 && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary>Products to create</summary>
              <ul>
                {syncResult.toCreate.map((p) => (
                  <li key={p.handle}>
                    {p.title} ({p.handle}) – {p.variantCount} variant(s)
                  </li>
                ))}
              </ul>
            </details>
          )}
          {syncResult.toUpdate.length > 0 && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary>Products to update</summary>
              <ul>
                {syncResult.toUpdate.map((p) => (
                  <li key={p.handle}>
                    {p.title} ({p.handle}) – existing variants:{' '}
                    {p.existingVariantCount}, POA-enabled variants:{' '}
                    {p.newVariantCount}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {products.map((product) => (
        <div
          key={product.id}
          style={{
            border: '1px solid #ddd',
            marginBottom: '1rem',
            padding: '0.75rem',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
            {product.title}{' '}
            <span style={{ fontSize: '0.85rem', color: '#666' }}>
              ({product.handle})
            </span>
          </h2>

          <table
            style={{
              width: '100%',
              marginTop: '0.5rem',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}
          >
            <thead>
              <tr>
                <th align="left">SKU</th>
                <th align="left">Variant title</th>
                <th align="left">Auricle price</th>
                <th align="left">POA price</th>
                <th align="left">Enabled</th>
                <th align="left">Save</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => (
                <tr key={variant.id}>
                  <td>{variant.sku || '—'}</td>
                  <td>{variant.title}</td>
                  <td>{variant.price}</td>
                  <td>
                    <input
                      type="text"
                      value={variant.poaPrice}
                      onChange={(e) =>
                        handlePriceChange(
                          product.id,
                          variant.id,
                          e.target.value,
                        )
                      }
                      style={{ width: '5rem' }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={variant.poaEnabled}
                      onChange={() =>
                        handleToggleEnabled(product.id, variant.id)
                      }
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => handleSaveVariant(variant)}
                      disabled={savingVariantId === variant.id}
                    >
                      {savingVariantId === variant.id ? 'Saving…' : 'Save'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
