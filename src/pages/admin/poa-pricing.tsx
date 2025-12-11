// src/pages/admin/poa-pricing.tsx
import Head from 'next/head';
import Link from 'next/link';
import type {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import { useEffect, useState, useMemo } from 'react';
import { withAdminBasicAuth } from '@/lib/withAdminBasicAuth';

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

type PoaPricingPageProps = Record<string, never>;

async function poaPricingHandler(
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<PoaPricingPageProps>> {
  return { props: {} };
}

export const getServerSideProps = withAdminBasicAuth<PoaPricingPageProps>(
  poaPricingHandler,
);

export default function PoaPricingPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [savingVariantId, setSavingVariantId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/auricle-product-feed');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const reason = typeof body.error === 'string' ? body.error : res.status;
          throw new Error(`Feed error: ${reason}`);
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

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const term = search.toLowerCase();
    return products.filter((p) => {
      return (
        p.title.toLowerCase().includes(term) ||
        p.handle.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

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
        const body = await res.json().catch(() => ({}));
        const reason = typeof body.error === 'string' ? body.error : res.status;
        throw new Error(`Sync error: ${reason}`);
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
        const body = await res.json().catch(() => ({}));
        const reason = typeof body.error === 'string' ? body.error : res.status;
        throw new Error(`Live sync error: ${reason}`);
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

      await runDryRunSync();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSavingVariantId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <title>POA Pricing &amp; Sync | AURICLE Admin</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="admin-layout">
          <main className="admin-main admin-main--center">
            <p className="admin-status admin-status--muted">Loading POA pricing…</p>
          </main>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>POA Pricing &amp; Sync | AURICLE Admin</title>
          <meta name="robots" content="noindex,nofollow" />
        </Head>
        <div className="admin-layout">
          <main className="admin-main admin-main--center">
            <div className="admin-alert admin-alert--error">
              <h2 className="admin-alert__title">Error loading POA pricing</h2>
              <p className="admin-alert__body">{error}</p>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>POA Pricing &amp; Sync | AURICLE Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-sidebar__brand">
            <span className="admin-sidebar__logo">A</span>
            <span className="admin-sidebar__name">AURICLE Admin</span>
          </div>

          <nav className="admin-sidebar__nav">
            <p className="admin-sidebar__nav-label">Overview</p>
            <Link href="/admin" className="admin-sidebar__nav-item">
              Dashboard
            </Link>

            <p className="admin-sidebar__nav-label">Stripe</p>
            <Link href="/admin/vip-subscribers" className="admin-sidebar__nav-item">
              VIP Subscriptions
            </Link>

            <p className="admin-sidebar__nav-label">Shopify</p>
            <Link href="/admin/shopify-orders" className="admin-sidebar__nav-item">
              Orders
            </Link>
            <button
              type="button"
              className="admin-sidebar__nav-item admin-sidebar__nav-item--active"
            >
              POA Pricing &amp; Sync
            </button>
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__user-email">Auricle → Pierce of Art</span>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-main__header">
            <div>
              <h1 className="admin-main__title">POA Pricing &amp; Sync</h1>
              <p className="admin-main__subtitle">
                Control which Auricle variants appear in Pierce of Art and at what price.
              </p>
            </div>
            <div className="admin-main__actions">
              <button
                type="button"
                className="admin-button admin-button--ghost"
                onClick={runDryRunSync}
                disabled={syncLoading}
              >
                {syncLoading ? 'Running dry-run…' : 'Run dry-run'}
              </button>
              <button
                type="button"
                className="admin-button admin-button--primary"
                onClick={runLiveSync}
                disabled={syncLoading}
              >
                {syncLoading ? 'Syncing…' : 'Run live sync'}
              </button>
            </div>
          </header>

          <section className="admin-main__section admin-main__section--flush">
            <div className="admin-toolbar">
              <div className="admin-toolbar__left">
                <label className="admin-field">
                  <span className="admin-field__label">Filter products</span>
                  <input
                    type="text"
                    className="admin-field__input"
                    placeholder="Search by title or handle…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="admin-toolbar__right">
                {syncLoading && (
                  <span className="admin-status admin-status--muted">
                    Sync in progress…
                  </span>
                )}
                {syncError && (
                  <span className="admin-status admin-status--error">
                    Sync error: {syncError}
                  </span>
                )}
                {syncResult && !syncLoading && !syncError && (
                  <span className="admin-status admin-status--success">
                    {syncResult.applied ? 'Live sync complete' : 'Dry-run complete'}
                  </span>
                )}
              </div>
            </div>

            {syncResult && (
              <div className="admin-panel admin-panel--summary">
                <div className="admin-panel__header">
                  <h2 className="admin-panel__title">
                    {syncResult.applied ? 'Live sync summary' : 'Dry-run summary'}
                  </h2>
                  <span className="admin-tag">
                    {syncResult.applied ? 'Live' : 'Dry-run'}
                  </span>
                </div>

                <div className="admin-panel__grid">
                  <div className="admin-metric">
                    <p className="admin-metric__label">Auricle products (active)</p>
                    <p className="admin-metric__value">
                      {syncResult.auricleProducts}
                    </p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric__label">
                      Auricle products enabled for POA
                    </p>
                    <p className="admin-metric__value">
                      {syncResult.auricleProductsForPoa}
                    </p>
                  </div>
                  <div className="admin-metric">
                    <p className="admin-metric__label">POA products existing</p>
                    <p className="admin-metric__value">
                      {syncResult.poaProductsExisting}
                    </p>
                  </div>
                  {syncResult.applied && (
                    <>
                      <div className="admin-metric">
                        <p className="admin-metric__label">Created on POA</p>
                        <p className="admin-metric__value">
                          {syncResult.created ?? 0}
                        </p>
                      </div>
                      <div className="admin-metric">
                        <p className="admin-metric__label">Updated on POA</p>
                        <p className="admin-metric__value">
                          {syncResult.updated ?? 0}
                        </p>
                      </div>
                    </>
                  )}
                  {!syncResult.applied && (
                    <>
                      <div className="admin-metric">
                        <p className="admin-metric__label">Would create</p>
                        <p className="admin-metric__value">
                          {syncResult.toCreate.length}
                        </p>
                      </div>
                      <div className="admin-metric">
                        <p className="admin-metric__label">Would update</p>
                        <p className="admin-metric__value">
                          {syncResult.toUpdate.length}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {(syncResult.toCreate.length > 0 ||
                  syncResult.toUpdate.length > 0) && (
                  <div className="admin-panel__details">
                    {syncResult.toCreate.length > 0 && (
                      <details className="admin-details">
                        <summary className="admin-details__summary">
                          Products to create
                        </summary>
                        <ul className="admin-details__list">
                          {syncResult.toCreate.map((p) => (
                            <li key={p.handle}>
                              <strong>{p.title}</strong> ({p.handle}) –{' '}
                              {p.variantCount} variant(s)
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {syncResult.toUpdate.length > 0 && (
                      <details className="admin-details">
                        <summary className="admin-details__summary">
                          Products to update
                        </summary>
                        <ul className="admin-details__list">
                          {syncResult.toUpdate.map((p) => (
                            <li key={p.handle}>
                              <strong>{p.title}</strong> ({p.handle}) – existing variants:{' '}
                              {p.existingVariantCount}, POA-enabled variants:{' '}
                              {p.newVariantCount}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}

            <section className="admin-main__section admin-main__section--stack">
              {filteredProducts.length === 0 ? (
                <p className="admin-status admin-status--muted">
                  No products match that filter.
                </p>
              ) : (
                filteredProducts.map((product) => (
                  <div key={product.id} className="admin-product">
                    <header className="admin-product__header">
                      <div>
                        <h2 className="admin-product__title">{product.title}</h2>
                        <p className="admin-product__meta">Handle: {product.handle}</p>
                      </div>
                      <span className="admin-tag admin-tag--light">
                        {product.variants.length} variant
                        {product.variants.length !== 1 ? 's' : ''}
                      </span>
                    </header>

                    <div className="admin-table-wrapper">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Variant</th>
                            <th>Auricle price</th>
                            <th>POA price</th>
                            <th>Enabled</th>
                            <th></th>
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
                                  className="admin-input admin-input--price"
                                />
                              </td>
                              <td>
                                <label className="admin-toggle">
                                  <input
                                    type="checkbox"
                                    checked={variant.poaEnabled}
                                    onChange={() =>
                                      handleToggleEnabled(product.id, variant.id)
                                    }
                                  />
                                  <span className="admin-toggle__label">
                                    {variant.poaEnabled ? 'Enabled' : 'Disabled'}
                                  </span>
                                </label>
                              </td>
                              <td className="admin-table__actions">
                                <button
                                  type="button"
                                  onClick={() => handleSaveVariant(variant)}
                                  disabled={savingVariantId === variant.id}
                                  className="admin-button admin-button--small"
                                >
                                  {savingVariantId === variant.id ? 'Saving…' : 'Save'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </section>
          </section>
        </main>
      </div>
    </>
  );
}
