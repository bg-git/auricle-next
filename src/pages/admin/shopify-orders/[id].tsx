// src/pages/admin/shopify-orders/[id].tsx
/* eslint-disable @next/next/no-img-element */
import Head from 'next/head';
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import Link from 'next/link';

type Money = {
  amount: string;
  currencyCode: string;
};

type OrderLineItem = {
  id: string;
  name: string;
  quantity: number;
  sku: string | null;
  totalMinor: number;
  currency: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

type OrderDetail = {
  id: string;
  legacyId: string;
  name: string;
  createdAt: string;
  currentTotalMinor: number;
  subtotalMinor: number;
  shippingMinor: number;
  currency: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  customerName: string | null;
  customerEmail: string | null;
  shippingAddress: string | null;
  billingAddress: string | null;
  lineItems: OrderLineItem[];
};

type OrderDetailProps = {
  order: OrderDetail | null;
};

type ShopifyOrderDetailResponse = {
  data?: {
    order?: {
      id: string;
      name: string;
      createdAt: string;
      currentTotalPriceSet: { shopMoney: Money };
      subtotalPriceSet: { shopMoney: Money } | null;
      totalShippingPriceSet: { shopMoney: Money } | null;
      displayFinancialStatus: string | null;
      displayFulfillmentStatus: string | null;
      customer: {
        displayName: string | null;
        email: string | null;
      } | null;
      shippingAddress: {
        name: string | null;
        company: string | null;
        address1: string | null;
        address2: string | null;
        city: string | null;
        province: string | null;
        zip: string | null;
        country: string | null;
      } | null;
      billingAddress: {
        name: string | null;
        company: string | null;
        address1: string | null;
        address2: string | null;
        city: string | null;
        province: string | null;
        zip: string | null;
        country: string | null;
      } | null;
      lineItems: {
        edges: {
          node: {
            id: string;
            name: string;
            quantity: number;
            sku: string | null;
            discountedTotalSet: { shopMoney: Money } | null;
            variant: {
              image: {
                url: string;
                altText: string | null;
              } | null;
              product: {
                featuredImage: {
                  url: string;
                  altText: string | null;
                } | null;
              } | null;
            } | null;
          };
        }[];
      };
    };
  };
};

export const getServerSideProps: GetServerSideProps<OrderDetailProps> = async (context) => {
  const { id } = context.params as { id: string };

  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const shopifyAdminToken = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!shopifyDomain || !shopifyAdminToken) {
    console.warn('Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_API_ACCESS_TOKEN env vars');
    return { props: { order: null } };
  }

  const graphqlEndpoint = `https://${shopifyDomain}/admin/api/2023-10/graphql.json`;
  const globalId = `gid://shopify/Order/${id}`;

  const query = `
    query OrderDetail($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        subtotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalShippingPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        displayFinancialStatus
        displayFulfillmentStatus
        customer {
          displayName
          email
        }
        shippingAddress {
          name
          company
          address1
          address2
          city
          province
          zip
          country
        }
        billingAddress {
          name
          company
          address1
          address2
          city
          province
          zip
          country
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              name
              quantity
              sku
              discountedTotalSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              variant {
                image {
                  url
                  altText
                }
                product {
                  featuredImage {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  let json: ShopifyOrderDetailResponse | null = null;

  try {
    const res = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shopifyAdminToken,
      },
      body: JSON.stringify({
        query,
        variables: { id: globalId },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn('Order detail fetch failed', res.status, text);
      return { props: { order: null } };
    }

    json = (await res.json()) as ShopifyOrderDetailResponse;
  } catch (error) {
    console.error('Order detail network error', error);
    return { props: { order: null } };
  }

  const orderNode = json?.data?.order;

  if (!orderNode) {
    return { props: { order: null } };
  }

  const totalMoney = orderNode.currentTotalPriceSet.shopMoney;
  const subtotalMoney = orderNode.subtotalPriceSet?.shopMoney ?? totalMoney;
  const shippingMoney = orderNode.totalShippingPriceSet?.shopMoney ?? {
    amount: '0',
    currencyCode: totalMoney.currencyCode,
  };

  const parseMoney = (m: Money | null | undefined): number => {
    if (!m) return 0;
    const parsed = parseFloat(m.amount ?? '0');
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
  };

  const lineItems: OrderLineItem[] =
    orderNode.lineItems.edges.map((edge) => {
      const m = edge.node.discountedTotalSet?.shopMoney ?? {
        amount: '0',
        currencyCode: totalMoney.currencyCode,
      };

      // Prefer variant image; fallback to product featured image
      const variant = edge.node.variant;
      const variantImage = variant?.image ?? null;
      const productImage = variant?.product?.featuredImage ?? null;
      const imageNode = variantImage || productImage || null;

      return {
        id: edge.node.id,
        name: edge.node.name,
        quantity: edge.node.quantity,
        sku: edge.node.sku ?? null,
        totalMinor: parseMoney(m),
        currency: m.currencyCode,
        imageUrl: imageNode?.url ?? null,
        imageAlt: imageNode?.altText ?? null,
      };
    }) ?? [];

  const formatAddress = (
    addr:
      | {
          name: string | null;
          company: string | null;
          address1: string | null;
          address2: string | null;
          city: string | null;
          province: string | null;
          zip: string | null;
          country: string | null;
        }
      | null
  ): string | null => {
    if (!addr) return null;
    const parts = [
      addr.name,
      addr.company,
      addr.address1,
      addr.address2,
      addr.city,
      addr.province,
      addr.zip,
      addr.country,
    ]
      .filter((p) => p && p.trim().length > 0)
      .join(', ');
    return parts || null;
  };

  const order: OrderDetail = {
    id: orderNode.id,
    legacyId: id,
    name: orderNode.name,
    createdAt: orderNode.createdAt,
    currentTotalMinor: parseMoney(totalMoney),
    subtotalMinor: parseMoney(subtotalMoney),
    shippingMinor: parseMoney(shippingMoney),
    currency: totalMoney.currencyCode,
    displayFinancialStatus: orderNode.displayFinancialStatus,
    displayFulfillmentStatus: orderNode.displayFulfillmentStatus,
    customerName: orderNode.customer?.displayName ?? null,
    customerEmail: orderNode.customer?.email ?? null,
    shippingAddress: formatAddress(orderNode.shippingAddress),
    billingAddress: formatAddress(orderNode.billingAddress),
    lineItems,
  };

  return {
    props: {
      order,
    },
  };
};

function OrderDetailPage({
  order,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const formatCurrency = (minor: number, currency: string) =>
    (minor / 100).toLocaleString('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    });

  return (
    <>
      <Head>
        <title>
          {order ? `Order ${order.name} – AURICLE Admin` : 'Order not found – AURICLE Admin'}
        </title>
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
            <Link
              href="/admin/shopify-orders"
              className="admin-sidebar__nav-item admin-sidebar__nav-item--active"
            >
              Orders
            </Link>
          </nav>

          <div className="admin-sidebar__footer">
            <span className="admin-sidebar__user-email">Admin panel</span>
          </div>
        </aside>

        {/* Main */}
        <main className="admin-main">
          <header className="admin-main__header">
            <div>
              <h1 className="admin-main__title">
                {order ? order.name : 'Order not found'}
              </h1>
              <p className="admin-main__subtitle">
                {order
                  ? `Created ${new Date(order.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Unable to load this order from Shopify.'}
              </p>
            </div>
            <div>
              <Link href="/admin/shopify-orders" className="admin-sidebar__nav-item">
                ← Back to orders
              </Link>
            </div>
          </header>

          {!order ? (
            <p>Order could not be loaded. It may have been deleted or is not accessible.</p>
          ) : (
            <>
              {/* Summary cards */}
              <section className="admin-main__grid" style={{ marginTop: '1.5rem' }}>
                <article className="admin-card">
                  <h2 className="admin-card__title">Total</h2>
                  <p className="admin-card__value">
                    {formatCurrency(order.currentTotalMinor, order.currency)}
                  </p>
                  <p className="admin-card__meta">
                    Subtotal{' '}
                    {formatCurrency(order.subtotalMinor, order.currency)} · Shipping{' '}
                    {formatCurrency(order.shippingMinor, order.currency)}
                  </p>
                </article>

                <article className="admin-card">
                  <h2 className="admin-card__title">Financial status</h2>
                  <p className="admin-card__value">
                    {order.displayFinancialStatus || '—'}
                  </p>
                  <p className="admin-card__meta">As reported by Shopify.</p>
                </article>

                <article className="admin-card">
                  <h2 className="admin-card__title">Fulfilment status</h2>
                  <p className="admin-card__value">
                    {order.displayFulfillmentStatus || '—'}
                  </p>
                  <p className="admin-card__meta">As reported by Shopify.</p>
                </article>

                <article className="admin-card">
                  <h2 className="admin-card__title">Customer</h2>
                  <p className="admin-card__value">
                    {order.customerName || 'Unknown customer'}
                  </p>
                  <p className="admin-card__meta">
                    {order.customerEmail || 'No email on record'}
                  </p>
                </article>
              </section>

              {/* Addresses */}
              <section className="admin-main__grid" style={{ marginTop: '1.5rem' }}>
                <article className="admin-card">
                  <h2 className="admin-card__title">Shipping address</h2>
                  <p className="admin-card__meta">
                    {order.shippingAddress || 'No shipping address on file.'}
                  </p>
                </article>

                <article className="admin-card">
                  <h2 className="admin-card__title">Billing address</h2>
                  <p className="admin-card__meta">
                    {order.billingAddress || 'No billing address on file.'}
                  </p>
                </article>
              </section>

              {/* Line items */}
              <section className="admin-main__section" style={{ marginTop: '2rem' }}>
                <h2 className="admin-main__section-title">Line items</h2>

                {order.lineItems.length === 0 ? (
                  <p>No line items found for this order.</p>
                ) : (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>SKU</th>
                          <th>Quantity</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.lineItems.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="admin-order-item">
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.imageAlt || item.name}
                                    className="admin-order-item__image"
                                  />
                                )}
                                <div className="admin-order-item__text">
                                  <div>{item.name}</div>
                                </div>
                              </div>
                            </td>
                            <td>{item.sku || '—'}</td>
                            <td>{item.quantity}</td>
                            <td>
                              {formatCurrency(item.totalMinor, item.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default OrderDetailPage;
