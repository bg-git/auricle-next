// src/pages/admin/vip-subscribers.tsx
import Head from 'next/head';
import type {
  GetServerSidePropsContext,
  GetServerSidePropsResult,
  InferGetServerSidePropsType,
} from 'next';
import Stripe from 'stripe';
import Link from 'next/link';
import { withAdminBasicAuth } from '@/lib/withAdminBasicAuth';

type VipSubscriber = {
  subscriptionId: string;
  customerId: string;
  email: string | null;
  name: string | null;
  status: string;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  canceledAt: number | null;
};

type SubscriptionMetrics = {
  totalSubscribers: number;
  active: number;
  canceling: number;
  cancelled: number;
  churnThisMonth: number;
  mrrMinor: number; // Monthly Recurring Revenue, in pence
  arpuMinor: number; // Average Revenue Per User (per month), in pence
};

type RevenueMetrics = {
  monthToDateMinor: number;
  yearToDateMinor: number;
};

type VipSubscribersPageProps = {
  subscribers: VipSubscriber[];
  metrics: SubscriptionMetrics;
  revenue: RevenueMetrics;
  monthLabel: string;
  yearLabel: number;
};

type StripeSubscriptionWithTimestamps = Stripe.Subscription & {
  current_period_end: number;
  canceled_at: number | null;
  created: number;
};

// Invoice line type that supports both new-style pricing + legacy price object
type InvoiceLineWithPrice = Stripe.InvoiceLineItem & {
  pricing?: {
    price_details?: {
      price?: string | null;
    };
  };
  price?: Stripe.Price | null;
};

async function vipSubscribersHandler(
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  _ctx: GetServerSidePropsContext,
): Promise<GetServerSidePropsResult<VipSubscribersPageProps>> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const vipPriceId = process.env.STRIPE_PRICE_ID_VIP;

  if (!secretKey || !vipPriceId) {
    console.warn('Missing STRIPE_SECRET_KEY or STRIPE_PRICE_ID_VIP env vars');
    return {
      props: {
        subscribers: [],
        metrics: {
          totalSubscribers: 0,
          active: 0,
          canceling: 0,
          cancelled: 0,
          churnThisMonth: 0,
          mrrMinor: 0,
          arpuMinor: 0,
        },
        revenue: {
          monthToDateMinor: 0,
          yearToDateMinor: 0,
        },
        monthLabel: '',
        yearLabel: new Date().getFullYear(),
      },
    };
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const monthStartUnix = Math.floor(monthStart.getTime() / 1000);
  const yearStartUnix = Math.floor(yearStart.getTime() / 1000);

  const monthLabel = monthStart.toLocaleString('en-GB', { month: 'long' });
  const yearLabel = now.getFullYear();

  // --- Subscriptions for VIP price ---
  const subscriptionsResponse = await stripe.subscriptions.list({
    status: 'all',
    limit: 100,
    expand: ['data.customer'],
  });

  const vipSubscriptions = subscriptionsResponse.data
    .filter((sub) =>
      sub.items.data.some((item) => item.price.id === vipPriceId)
    )
    .map((sub) => sub as StripeSubscriptionWithTimestamps);

  const subscribers: VipSubscriber[] = vipSubscriptions.map((sub) => {
    const customer = sub.customer as Stripe.Customer;

    return {
      subscriptionId: sub.id,
      customerId: customer.id,
      email: customer.email ?? null,
      name: typeof customer.name === 'string' ? customer.name : null,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end ?? 0,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      canceledAt: sub.canceled_at ?? null,
    };
  });

  // --- Metrics: counts + churn ---
  const totalSubscribers = subscribers.length;
  const active = subscribers.filter((s) => s.status === 'active').length;
  const canceling = subscribers.filter(
    (s) => s.status === 'active' && s.cancelAtPeriodEnd
  ).length;
  const cancelled = subscribers.filter((s) => s.status === 'canceled').length;
  const churnThisMonth = subscribers.filter(
    (s) =>
      s.status === 'canceled' &&
      typeof s.canceledAt === 'number' &&
      s.canceledAt >= monthStartUnix
  ).length;

  // --- MRR + ARPU ---
  const activeVipSubscriptions = vipSubscriptions.filter(
    (sub) => sub.status === 'active'
  );

  let unitAmountMinor = 0;
  if (activeVipSubscriptions.length > 0) {
    const firstSub = activeVipSubscriptions[0];
    const matchingItem = firstSub.items.data.find(
      (item) => item.price.id === vipPriceId
    );
    const price = matchingItem?.price;
    if (price && typeof price.unit_amount === 'number') {
      unitAmountMinor = price.unit_amount;
    }
  }

  const mrrMinor = unitAmountMinor > 0 ? active * unitAmountMinor : 0;
  const arpuMinor = active > 0 ? Math.round(mrrMinor / active) : 0;

  const metrics: SubscriptionMetrics = {
    totalSubscribers,
    active,
    canceling,
    cancelled,
    churnThisMonth,
    mrrMinor,
    arpuMinor,
  };

  // --- Revenue (MTD & YTD from paid invoices) ---
  const invoicesResponse = await stripe.invoices.list({
    status: 'paid',
    limit: 100,
    expand: ['data.lines'],
  });

  const sumRevenueSince = (unixStart: number): number => {
    return invoicesResponse.data.reduce((sum, invoice) => {
      if (invoice.created < unixStart) return sum;

      const lines = (invoice.lines?.data ?? []) as InvoiceLineWithPrice[];

      const hasVipLine = lines.some((line) => {
        const pricingPriceId = line.pricing?.price_details?.price ?? undefined;
        const directPriceId = line.price?.id ?? undefined;

        const priceId = pricingPriceId ?? directPriceId;
        return priceId === vipPriceId;
      });

      if (!hasVipLine) return sum;

      const amount = invoice.amount_paid ?? 0;
      return sum + amount;
    }, 0);
  };

  const revenue: RevenueMetrics = {
    monthToDateMinor: sumRevenueSince(monthStartUnix),
    yearToDateMinor: sumRevenueSince(yearStartUnix),
  };

  return {
    props: {
      subscribers,
      metrics,
      revenue,
      monthLabel,
      yearLabel,
    },
  };
}

export const getServerSideProps = withAdminBasicAuth<VipSubscribersPageProps>(
  vipSubscribersHandler,
);

function VipSubscribersPage({
  subscribers,
  metrics,
  revenue,
  monthLabel,
  yearLabel,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const formatCurrency = (minor: number) =>
    (minor / 100).toLocaleString('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
    });

  const mrrFormatted = formatCurrency(metrics.mrrMinor);
  const arpuFormatted = formatCurrency(metrics.arpuMinor);

  return (
    <>
      <Head>
        <title>AURICLE Admin – VIP Subscriptions</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="admin-layout">
        {/* Sidebar – same structure as dashboard */}
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
            <button
              className="admin-sidebar__nav-item admin-sidebar__nav-item--active"
              type="button"
            >
              VIP Subscriptions
            </button>

            <button className="admin-sidebar__nav-item" type="button" disabled>
              Customers <span className="admin-sidebar__pill">Soon</span>
            </button>

            <p className="admin-sidebar__nav-label">Shopify</p>
            <button className="admin-sidebar__nav-item" type="button" disabled>
              Orders <span className="admin-sidebar__pill">Soon</span>
            </button>
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__user-email">Admin panel</span>
          </div>
        </aside>

        {/* Main area */}
        <main className="admin-main">
          <header className="admin-main__header">
            <div>
              <h1 className="admin-main__title">VIP Subscriptions</h1>
              <p className="admin-main__subtitle">
                Stripe subscriptions for VIP membership.
              </p>
            </div>
          </header>

          {/* Metrics row – counts */}
          <section className="admin-main__grid" style={{ marginTop: '1.5rem' }}>
            <article className="admin-card">
              <h2 className="admin-card__title">Total subscribers</h2>
              <p className="admin-card__value">{metrics.totalSubscribers}</p>
              <p className="admin-card__meta">All VIP subscriptions on Stripe.</p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Active</h2>
              <p className="admin-card__value">{metrics.active}</p>
              <p className="admin-card__meta">Currently active subscriptions.</p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Canceling</h2>
              <p className="admin-card__value">{metrics.canceling}</p>
              <p className="admin-card__meta">
                Active but set to cancel at period end.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Cancelled (all time)</h2>
              <p className="admin-card__value">{metrics.cancelled}</p>
              <p className="admin-card__meta">Subscriptions with status cancelled.</p>
            </article>
          </section>

          {/* Revenue + churn */}
          <section className="admin-main__grid" style={{ marginTop: '1.5rem' }}>
            <article className="admin-card">
              <h2 className="admin-card__title">Revenue {monthLabel} (MTD)</h2>
              <p className="admin-card__value">
                {formatCurrency(revenue.monthToDateMinor)}
              </p>
              <p className="admin-card__meta">
                Paid VIP invoices since the start of {monthLabel}.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Revenue {yearLabel} (YTD)</h2>
              <p className="admin-card__value">
                {formatCurrency(revenue.yearToDateMinor)}
              </p>
              <p className="admin-card__meta">
                Paid VIP invoices since 1 January {yearLabel}.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">Churn this month</h2>
              <p className="admin-card__value">{metrics.churnThisMonth}</p>
              <p className="admin-card__meta">
                Subscriptions cancelled since the start of {monthLabel}.
              </p>
            </article>
          </section>

          {/* Recurring metrics – MRR + ARPU */}
          <section className="admin-main__grid" style={{ marginTop: '1.5rem' }}>
            <article className="admin-card">
              <h2 className="admin-card__title">MRR</h2>
              <p className="admin-card__value">{mrrFormatted}</p>
              <p className="admin-card__meta">
                Monthly recurring revenue based on active VIP members.
              </p>
            </article>

            <article className="admin-card">
              <h2 className="admin-card__title">ARPU (monthly)</h2>
              <p className="admin-card__value">{arpuFormatted}</p>
              <p className="admin-card__meta">
                Average recurring revenue per active VIP member.
              </p>
            </article>
          </section>

          {/* Subscribers table */}
          <section className="admin-main__section" style={{ marginTop: '2rem' }}>
            <h2 className="admin-main__section-title">Subscribers</h2>

            {subscribers.length === 0 ? (
              <p>No VIP subscribers found.</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Cancel at period end</th>
                      <th>Current period ends</th>
                      <th>Stripe IDs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.subscriptionId}>
                        <td>{s.name || '—'}</td>
                        <td>{s.email || '—'}</td>
                        <td>{s.status}</td>
                        <td>{s.cancelAtPeriodEnd ? 'Yes' : 'No'}</td>
                        <td>
                          {s.currentPeriodEnd
                            ? new Date(s.currentPeriodEnd * 1000).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )
                            : '—'}
                        </td>
                        <td>
                          <code>{s.customerId}</code>
                          <br />
                          <code>{s.subscriptionId}</code>
                        </td>
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

export default VipSubscribersPage;
