// src/pages/admin/index.tsx
import Head from 'next/head';
import type {
  InferGetServerSidePropsType,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import Stripe from 'stripe';
import Link from 'next/link';
import { withAdminBasicAuth } from '@/lib/withAdminBasicAuth';

type AdminDashboardProps = {
  activeVipCount: number;
  vipRevenueMonthMinor: number; // in pence
  shopifyOrdersMonthCount: number;
  shopifyRevenueMonthMinor: number;
};

// Stripe invoice line type that supports both old + new shapes
type InvoiceLineWithPrice = Stripe.InvoiceLineItem & {
  pricing?: {
    price_details?: {
      price?: string | null;
    };
  };
  price?: Stripe.Price | null;
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
  };
};

type ShopifyOrdersResponse = {
  data?: {
    orders?: {
      edges: ShopifyOrderEdge[];
    };
  };
};

// ----------------------------------------
// SINGLE, CORRECT HANDLER
// ----------------------------------------
async function adminHandler(
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<AdminDashboardProps>> {






  const secretKey = process.env.STRIPE_SECRET_KEY;
  const vipPriceId = process.env.STRIPE_PRICE_ID_VIP;

  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const shopifyAdminToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!secretKey || !vipPriceId) {
    console.warn('Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID_VIP env vars');
  }

  const stripe = secretKey
    ? new Stripe(secretKey, {
        apiVersion: '2025-11-17.clover',
      })
    : null;

  // Dates
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartUnix = Math.floor(monthStart.getTime() / 1000);

  // --- Stripe: Active VIP subscriptions + revenue MTD ---
  let activeVipCount = 0;
  let vipRevenueMonthMinor = 0;

  if (stripe && vipPriceId) {
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    activeVipCount = subscriptions.data.filter((sub) =>
      sub.items.data.some((item) => item.price.id === vipPriceId)
    ).length;

    const invoices = await stripe.invoices.list({
      status: 'paid',
      limit: 100,
      expand: ['data.lines'],
    });

    vipRevenueMonthMinor = invoices.data.reduce((sum, invoice) => {
      if (invoice.created < monthStartUnix) return sum;

      const lines = (invoice.lines?.data ?? []) as InvoiceLineWithPrice[];

      const hasVipLine = lines.some((line) => {
        const priceId =
          line.pricing?.price_details?.price ??
          line.price?.id ??
          undefined;

        return priceId === vipPriceId;
      });

      if (!hasVipLine) return sum;

      const amount = invoice.amount_paid ?? 0;
      return sum + amount;
    }, 0);
  }

  // --- Shopify: Orders this month ---
  let shopifyOrdersMonthCount = 0;
  let shopifyRevenueMonthMinor = 0;

  if (!shopifyDomain || !shopifyAdminToken) {
    console.warn('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN env vars');
  } else {
    const graphqlEndpoint = `https://${shopifyDomain}/admin/api/2023-10/graphql.json`;

    const query = `
      query OrdersDashboard($first: Int!) {
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
        variables: { first: 100 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('Shopify orders fetch failed', res.status, text);
    } else {
      const json = (await res.json()) as ShopifyOrdersResponse;
      const edges = json.data?.orders?.edges ?? [];

      const monthOrders = edges.filter((edge) => {
        const createdUnix = Math.floor(
          new Date(edge.node.createdAt).getTime() / 1000,
        );
        return createdUnix >= monthStartUnix;
      });

      shopifyOrdersMonthCount = monthOrders.length;

      shopifyRevenueMonthMinor = monthOrders.reduce((sum, edge) => {
        const amount = parseFloat(edge.node.currentTotalPriceSet.shopMoney.amount || '0');
        return sum + Math.round(amount * 100);
      }, 0);
    }
  }

  return {
    props: {
      activeVipCount,
      vipRevenueMonthMinor,
      shopifyOrdersMonthCount,
      shopifyRevenueMonthMinor,
    },
  };
}

// ----------------------------------------
// APPLY BASIC AUTH WRAPPER
// ----------------------------------------
export const getServerSideProps =
  withAdminBasicAuth<AdminDashboardProps>(adminHandler);

// ----------------------------------------
// PAGE COMPONENT (UNCHANGED)
// ----------------------------------------
function AdminDashboardPage({
  activeVipCount,
  vipRevenueMonthMinor,
  shopifyOrdersMonthCount,
  shopifyRevenueMonthMinor,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const vipRevenueMonthFormatted = (vipRevenueMonthMinor / 100).toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
  });

  const shopifyRevenueMonthFormatted = (shopifyRevenueMonthMinor / 100).toLocaleString(
    'en-GB',
    {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    }
  );

  return (
    <>
      <Head>
        <title>AURICLE Admin Dashboard</title>
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
            <button
              className="admin-sidebar__nav-item admin-sidebar__nav-item--active"
              type="button"
            >
              Dashboard
            </button>

            <p className="admin-sidebar__nav-label">Stripe</p>
            <Link href="/admin/vip-subscribers" className="admin-sidebar__nav-item">
              VIP Subscriptions
            </Link>

            <p className="admin-sidebar__nav-label">Shopify</p>
            <Link href="/admin/shopify-orders" className="admin-sidebar__nav-item">
              Orders
            </Link>
            <Link href="/admin/poa-pricing" className="admin-sidebar__nav-item">
              POA Pricing &amp; Sync
            </Link>
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__user-email">Admin panel</span>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-main__header">
            <div>
              <h1 className="admin-main__title">Dashboard</h1>
              <p className="admin-main__subtitle">
                High-level view of AURICLE performance.
              </p>
            </div>
          </header>

          <section className="admin-main__grid">
            <Link href="/admin/vip-subscribers" className="admin-card admin-card--clickable">
              <h2 className="admin-card__title">VIP Membership</h2>
              <p className="admin-card__value">{activeVipCount}</p>
              <p className="admin-card__meta">
                Active VIP members. Click to view subscribers.
              </p>
            </Link>

            <Link href="/admin/vip-subscribers" className="admin-card admin-card--clickable">
              <h2 className="admin-card__title">Subscription revenue (MTD)</h2>
              <p className="admin-card__value">{vipRevenueMonthFormatted}</p>
              <p className="admin-card__meta">
                Month-to-date revenue from VIP subscriptions.
              </p>
            </Link>

            <Link href="/admin/shopify-orders" className="admin-card admin-card--clickable">
              <h2 className="admin-card__title">Shopify orders (MTD)</h2>
              <p className="admin-card__value">{shopifyOrdersMonthCount}</p>
              <p className="admin-card__meta">
                Orders created this month (latest 100). Click to view breakdown.
              </p>
            </Link>

            <Link href="/admin/shopify-orders" className="admin-card admin-card--clickable">
              <h2 className="admin-card__title">Shopify revenue (MTD)</h2>
              <p className="admin-card__value">{shopifyRevenueMonthFormatted}</p>
              <p className="admin-card__meta">
                Month-to-date revenue across Shopify orders.
              </p>
            </Link>

            <Link href="/admin/poa-pricing" className="admin-card admin-card--clickable">
              <h2 className="admin-card__title">POA Product Sync</h2>
              <p className="admin-card__value">Manage</p>
              <p className="admin-card__meta">
                Enable Auricle products for Pierce of Art and set retail pricing.
              </p>
            </Link>
          </section>

          <section className="admin-main__section">
            <h2 className="admin-main__section-title">Next steps</h2>
            <ul className="admin-main__list">
              <li>Refine VIP subscription analytics (MRR, ARPU, cohort churn).</li>
              <li>Add payout visibility from Stripe.</li>
              <li>Deepen Shopify metrics (AOV, repeat rate, country breakdown).</li>
            </ul>
          </section>
        </main>
      </div>
    </>
  );
}

export default AdminDashboardPage;
