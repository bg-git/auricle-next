// src/pages/admin/shopify-orders.tsx
import Head from 'next/head';
import type {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  InferGetServerSidePropsType,
} from 'next';
import Link from 'next/link';
import { withAdminBasicAuth } from '@/lib/withAdminBasicAuth';

type ShopifyOrder = {
  id: string; // global ID gid://shopify/Order/1234567890
  legacyId: string; // numeric part 1234567890
  name: string;
  createdAt: string;
  totalMinor: number;
  currency: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
};

type ShopifyOrderMetrics = {
  totalOrders: number;
  monthToDateOrders: number;
  monthToDateRevenueMinor: number;
  yearToDateOrders: number;
  yearToDateRevenueMinor: number;
  monthToDateAovMinor: number; // AOV (MTD), in minor units
  allTimeAovMinor: number; // AOV across the fetched sample (up to 100 orders)
};

type ShopifyOrdersPageProps = {
  orders: ShopifyOrder[];
  metrics: ShopifyOrderMetrics;
  monthLabel: string;
  yearLabel: number;
};

type ShopifyOrderEdge = {
  node: {
    id: string;
    name: string;
    createdAt: string;
    currentTotalPriceSet: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
    displayFinancialStatus: string | null;
    displayFulfillmentStatus: string | null;
  };
};

type ShopifyOrdersResponse = {
  data?: {
    orders?: {
      edges: ShopifyOrderEdge[];
    };
  };
};

async function shopifyOrdersHandler(
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<ShopifyOrdersPageProps>> {
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const shopifyAdminToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const monthStartUnix = Math.floor(monthStart.getTime() / 1000);
  const yearStartUnix = Math.floor(yearStart.getTime() / 1000);

  const monthLabel = monthStart.toLocaleString('en-GB', { month: 'long' });
  const yearLabel = now.getFullYear();

  if (!shopifyDomain || !shopifyAdminToken) {
    console.warn('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN env vars');
    return {
      props: {
        orders: [],
        metrics: {
          totalOrders: 0,
          monthToDateOrders: 0,
          monthToDateRevenueMinor: 0,
          yearToDateOrders: 0,
          yearToDateRevenueMinor: 0,
          monthToDateAovMinor: 0,
          allTimeAovMinor: 0,
        },
        monthLabel,
        yearLabel,
      },
    };
  }

  const graphqlEndpoint = `https://${shopifyDomain}/admin/api/2023-10/graphql.json`;

  const query = `
    query OrdersAll($first: Int!) {
      orders(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            currentTotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            displayFinancialStatus
            displayFulfillmentStatus
          }
        }
      }
    }
  `;

  const res = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': shopifyAdminToken,
    },
    body: JSON.stringify({
      query,
      variables: { first: 100 }, // cap for now
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn('Shopify orders fetch failed', res.status, text);
    return {
      props: {
        orders: [],
        metrics: {
          totalOrders: 0,
          monthToDateOrders: 0,
          monthToDateRevenueMinor: 0,
          yearToDateOrders: 0,
          yearToDateRevenueMinor: 0,
          monthToDateAovMinor: 0,
          allTimeAovMinor: 0,
        },
        monthLabel,
        yearLabel,
      },
    };
  }

  const json = (await res.json()) as ShopifyOrdersResponse;
  const edges = json.data?.orders?.edges ?? [];

  const orders: ShopifyOrder[] = edges.map((edge) => {
    const amountStr = edge.node.currentTotalPriceSet.shopMoney.amount;
    const parsed = parseFloat(amountStr ?? '0');
    const amount = Number.isFinite(parsed) ? parsed : 0; // avoid NaN
    const currency = edge.node.currentTotalPriceSet.shopMoney.currencyCode;

    const globalId = edge.node.id; // e.g. gid://shopify/Order/1234567890
    const legacyId = globalId.split('/').pop() ?? '';

    return {
      id: globalId,
      legacyId,
      name: edge.node.name,
      createdAt: edge.node.createdAt,
      totalMinor: Math.round(amount * 100),
      currency,
      displayFinancialStatus: edge.node.displayFinancialStatus,
      displayFulfillmentStatus: edge.node.displayFulfillmentStatus,
    };
  });

  const totalOrders = orders.length;

  const monthToDateOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() / 1000 >= monthStartUnix
  ).length;

  const monthToDateRevenueMinor = orders.reduce((sum, o) => {
    const createdUnix = new Date(o.createdAt).getTime() / 1000;
    if (createdUnix < monthStartUnix) return sum;
    return sum + (Number.isFinite(o.totalMinor) ? o.totalMinor : 0);
  }, 0);

  const yearToDateOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() / 1000 >= yearStartUnix
  ).length;

  const yearToDateRevenueMinor = orders.reduce((sum, o) => {
    const createdUnix = new Date(o.createdAt).getTime() / 1000;
    if (createdUnix < yearStartUnix) return sum;
    return sum + (Number.isFinite(o.totalMinor) ? o.totalMinor : 0);
  }, 0);

  const monthToDateAovMinor =
    monthToDateOrders > 0 && Number.isFinite(monthToDateRevenueMinor)
      ? Math.round(monthToDateRevenueMinor / monthToDateOrders)
      : 0;

  const totalRevenueMinor = orders.reduce(
    (sum, o) => sum + (Number.isFinite(o.totalMinor) ? o.totalMinor : 0),
    0
  );

  const allTimeAovMinor =
    totalOrders > 0 && Number.isFinite(totalRevenueMinor)
      ? Math.round(totalRevenueMinor / totalOrders)
      : 0;

  const metrics: ShopifyOrderMetrics = {
    totalOrders,
    monthToDateOrders,
    monthToDateRevenueMinor,
    yearToDateOrders,
    yearToDateRevenueMinor,
    monthToDateAovMinor,
    allTimeAovMinor,
  };

  return {
    props: {
      orders,
      metrics,
      monthLabel,
      yearLabel,
    },
  };
}

export const getServerSideProps = withAdminBasicAuth<ShopifyOrdersPageProps>(
  shopifyOrdersHandler,
);

function ShopifyOrdersPage({
  orders,
  metrics,
  monthLabel,
  yearLabel,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const formatCurrency = (minor: number) =>
    (minor / 100).toLocaleString('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    });

  const aovMonthFormatted = formatCurrency(metrics.monthToDateAovMinor);
  const aovAllTimeFormatted = formatCurrency(metrics.allTimeAovMinor);

  return (
    <>
      <Head>
        <title>AURICLE Admin – Shopify Orders</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="admin-layout">
        {/* Sidebar */}
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
            <button className="admin-sidebar__nav-item" type="button" disabled>
              VIP Subscriptions <span className="admin-sidebar__pill">Stripe</span>
            </button>

            <p className="admin-sidebar__nav-label">Shopify</p>
            <button
              className="admin-sidebar__nav-item admin-sidebar__nav-item--active"
              type="button"
            >
              Orders
            </button>
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__user-email">Admin panel</span>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <header className="admin-main__header">
            <div>
              <h1 className="admin-main__title">Shopify Orders</h1>
              <p className="admin-main__subtitle">High-level view of Shopify performance.</p>
            </div>
          </header>

          {/* Metrics */}
          <section className="admin-main__grid" style={{ marginTop: '1.5rem' }}>
            <article className="admin-card">
              <h2 className="admin-card__title">Total orders (sample)</h2>
              <p className="admin-card__value">{metrics.totalOrders}</p>
              <p className="admin-card__meta">
                Orders in the last {orders.length} records (up to 100).
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Orders {monthLabel} (MTD)</h2>
              <p className="admin-card__value">{metrics.monthToDateOrders}</p>
              <p className="admin-card__meta">Orders since the start of {monthLabel}.</p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Revenue {monthLabel} (MTD)</h2>
              <p className="admin-card__value">
                {formatCurrency(metrics.monthToDateRevenueMinor)}
              </p>
              <p className="admin-card__meta">
                Order totals since the start of {monthLabel}.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Revenue {yearLabel} (YTD)</h2>
              <p className="admin-card__value">
                {formatCurrency(metrics.yearToDateRevenueMinor)}
              </p>
              <p className="admin-card__meta">
                Order totals since 1 January {yearLabel}.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">AOV {monthLabel} (MTD)</h2>
              <p className="admin-card__value">{aovMonthFormatted}</p>
              <p className="admin-card__meta">
                Average order value for orders since the start of {monthLabel}.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">AOV (sample)</h2>
              <p className="admin-card__value">{aovAllTimeFormatted}</p>
              <p className="admin-card__meta">
                Average order value across the last {orders.length} orders (up to 100).
              </p>
            </article>
          </section>

          {/* Table */}
          <section className="admin-main__section" style={{ marginTop: '2rem' }}>
            <h2 className="admin-main__section-title">Orders</h2>

            {orders.length === 0 ? (
              <p>No orders found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Created</th>
                      <th>Total</th>
                      <th>Financial</th>
                      <th>Fulfilment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link
                            href={`/admin/shopify-orders/${o.legacyId}`}
                            className="admin-table__link"
                          >
                            {o.name}
                          </Link>
                        </td>
                        <td>
                          {new Date(o.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>{formatCurrency(o.totalMinor)}</td>
                        <td>{o.displayFinancialStatus || '—'}</td>
                        <td>{o.displayFulfillmentStatus || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

export default ShopifyOrdersPage;
