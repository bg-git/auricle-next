import type {
  GetStaticProps,
  GetStaticPaths,
  GetStaticPropsContext,
} from 'next';
import { shopifyFetch } from '@/lib/shopify';
import { GET_PRODUCTS_BY_TAG } from '@/lib/shopify-queries';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback, useEffect } from 'react';
import Seo from '@/components/Seo';
import FavouriteToggle from '@/components/FavouriteToggle';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { STARTER_KITS, getStarterKitBySlug } from '@/lib/starter-kits-config';

type Metafield = {
  key: string;
  value: string;
};

type ProductImage = {
  node: {
    url: string;
    altText: string | null;
  };
};

type ProductVariant = {
  id: string;
  price: {
    amount: string;
  };
  metafield?: {
    value: string | null;
  } | null;
};

type Product = {
  id: string;
  title: string;
  handle: string;
  tags?: string[];
  images?: {
    edges: ProductImage[];
  };
  metafields?: Metafield[];
  variants?: {
    edges: {
      node: ProductVariant;
    }[];
  };
};

type StarterKitPageProps = {
  kit: {
    slug: string;
    title: string;
    description: string;
  };
  products: Product[];
  totalPrice: string;
  isSoldOut: boolean;
};

export default function StarterKitPage({ kit, products, totalPrice, isSoldOut }: StarterKitPageProps) {
  const { addMultipleToCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const approved: true | false | null = !mounted ? null : (authLoading ? null : Boolean(user?.approved));

  const isVipMember =
    mounted && Array.isArray(user?.tags)
      ? user!.tags!.includes('VIP-MEMBER')
      : false;

  // Calculate VIP total price
  const vipTotalPrice = products.reduce((sum, product) => {
    const variant = product.variants?.edges?.[0]?.node;
    if (!variant) return sum;
    
    const memberPriceRaw = variant.metafield?.value ?? null;
    const memberPrice =
      memberPriceRaw !== null && memberPriceRaw !== ''
        ? parseFloat(memberPriceRaw)
        : null;
    
    const price = memberPrice !== null ? memberPrice : parseFloat(variant.price.amount);
    return sum + price;
  }, 0);

  const handleAddAllToCart = useCallback(async () => {
    if (isAdding || products.length === 0) return;

    setIsAdding(true);
    try {
      const itemsToAdd = products
        .map((product) => {
          const variant = product.variants?.edges?.[0]?.node;
          if (!variant) return null;

          const basePrice = parseFloat(variant.price.amount);
          const memberPriceRaw = variant.metafield?.value ?? null;
          const memberPrice =
            memberPriceRaw !== null && memberPriceRaw !== ''
              ? parseFloat(memberPriceRaw)
              : null;
          const effectivePrice = memberPrice !== null ? memberPrice : basePrice;

          return {
            variantId: variant.id,
            quantity: 1,
            meta: {
              title: product.title,
              price: effectivePrice.toString(),
              basePrice: basePrice.toString(),
              memberPrice: memberPrice !== null ? memberPrice.toString() : undefined,
              currencyCode: 'GBP',
              image: product.images?.edges?.[0]?.node?.url,
              handle: product.handle,
              metafields: product.metafields,
              quantityAvailable: variant.quantityAvailable,
            },
          };
        })
        .filter(Boolean);

      if (itemsToAdd.length > 0) {
        addMultipleToCart(itemsToAdd as Parameters<typeof addMultipleToCart>[0]);
      }
    } finally {
      setIsAdding(false);
    }
  }, [products, addMultipleToCart, isAdding]);

  const productCount = products.length;

  return (
    <>
      <Seo
        title={`${kit.title} | AURICLE`}
        description={kit.description}
        canonical={`https://www.auricle.co.uk/starter-kits/${kit.slug}`}
      />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
        {approved !== true ? (
          <section style={{ padding: '40px 20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '12px' }}>Starter Kits</h1>
            <p style={{ fontSize: '15px', color: '#666', marginBottom: '40px', maxWidth: '500px', margin: '0 auto 40px' }}>
              Starter Kits are reserved for verified wholesale account holders.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/sign-in" legacyBehavior>
                <a style={{
                  padding: '14px 32px',
                  backgroundColor: '#181818',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  display: 'inline-block',
                }}>
                  SIGN IN
                </a>
              </Link>
              <Link href="/register" legacyBehavior>
                <a style={{
                  padding: '14px 32px',
                  backgroundColor: '#f9f9f9',
                  color: '#181818',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  display: 'inline-block',
                  border: '1px solid #e0e0e0',
                }}>
                  JOIN US
                </a>
              </Link>
            </div>
          </section>
        ) : (
          <>
        {/* Navigation */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/starter-kits" legacyBehavior>
            <a style={{ fontSize: '13px', color: '#666', textDecoration: 'none' }}>
              ← Back to Starter Kits
            </a>
          </Link>
        </div>

        {/* Header Section */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '12px', textTransform: 'uppercase' }}>{kit.title}</h1>
          <p style={{ fontSize: '15px', color: '#666', marginBottom: '20px', maxWidth: '600px' }}>
            {kit.description}
          </p>

          {/* Note about pricing */}
          <div style={{ 
            backgroundColor: '#f9f9f9', 
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '13px',
            color: '#666',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Starter kits are dynamically updated</strong> with our best-selling pieces, so kit contents and prices change regularly. Each time you&apos;ll find the most popular items from that metal range. This ensures you always get what your customers love most.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Excluded:</strong> Plain balls and solitaire gems
            </p>
          </div>

          {/* Kit Summary */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              padding: '20px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#999', marginBottom: '4px' }}>
                ITEMS IN KIT
              </p>
              <p style={{ fontSize: '18px', fontWeight: 600 }}>{productCount}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#999', marginBottom: '4px' }}>
                PRICE
              </p>
              {isVipMember && vipTotalPrice < parseFloat(totalPrice) ? (
                <>
                  <p style={{ fontSize: '18px', fontWeight: 600 }}>£{vipTotalPrice.toFixed(2)}</p>
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '4px', opacity: 0.7 }}>
                    Non-member: £{parseFloat(totalPrice).toFixed(2)}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '18px', fontWeight: 600 }}>£{parseFloat(totalPrice).toFixed(2)}</p>
                  {vipTotalPrice < parseFloat(totalPrice) && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', color: '#b00020' }}>VIP Member Price</span>
                        <span style={{ fontWeight: 600, color: '#b00020' }}>£{vipTotalPrice.toFixed(2)}</span>
                      </div>
                      <Link href="/vip-membership" legacyBehavior>
                        <a style={{ fontSize: '11px', textDecoration: 'underline', color: '#181818' }}>
                          Become a VIP Member
                        </a>
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Add All to Cart Button */}
          <button
            onClick={handleAddAllToCart}
            disabled={isAdding || productCount === 0 || isSoldOut}
            style={{
              padding: '14px 32px',
              backgroundColor: isSoldOut ? '#ccc' : isAdding ? '#ccc' : '#181818',
              color: '#fff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isAdding || productCount === 0 || isSoldOut ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              opacity: isAdding || productCount === 0 || isSoldOut ? 0.6 : 1,
            }}
          >
            {isSoldOut ? 'SOLD OUT' : isAdding ? 'Adding to Bag...' : 'ADD TO BAG'}
          </button>
        </div>

        {/* Products Grid */}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>
            What&apos;s in the Kit
          </h2>

          {products.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#999' }}>
              No products found for this starter kit yet.
            </p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px',
              }}
            >
              {products.map((product, index) => {
                const image = product.images?.edges?.[0]?.node;
                const variant = product.variants?.edges?.[0]?.node;

                return (
                  <Link href={`/item/${product.handle}`} key={product.id} legacyBehavior>
                    <a style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            paddingBottom: '120%',
                            backgroundColor: '#f5f5f5',
                            marginBottom: '12px',
                            overflow: 'hidden',
                            borderRadius: '4px',
                          }}
                        >
                          <Image
                            src={image?.url || '/placeholder.png'}
                            alt={image?.altText || product.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            priority={index === 0}
                            sizes="(min-width: 1400px) 220px, (min-width: 1024px) 20vw, (min-width: 768px) 33vw, 100vw"
                          />

                          <FavouriteToggle
                            handle={product.handle}
                            title={product.title}
                            image={image?.url}
                            price={variant?.price.amount}
                            metafields={product.metafields}
                          />
                        </div>

                        <h3 style={{ fontSize: '13px', fontWeight: 400, marginBottom: '8px' }}>
                          {product.title}
                        </h3>
                      </div>
                    </a>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
          </>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<StarterKitPageProps> = async (
  context: GetStaticPropsContext
) => {
  const slug = context.params?.slug;

  if (typeof slug !== 'string') {
    return { notFound: true };
  }

  const kit = getStarterKitBySlug(slug);

  if (!kit) {
    return { notFound: true };
  }

  try {
    // Fetch more items than needed to account for out-of-stock items and stands
    const bufferFactor = 3; // Fetch 3x to have buffer for OOS items and stands
    const fetchCount = kit.productLimit * bufferFactor;

    const data = await shopifyFetch({
      query: GET_PRODUCTS_BY_TAG,
      variables: {
        tag: `tag:${kit.tag}`,
        first: fetchCount,
      },
    });

    const allProducts = (data.products.edges || []).map((edge: { node: Product }) => ({
      ...edge.node,
      metafields: edge.node.metafields || [],
    }));

    // Separate stands from jewellery
    const stands = allProducts.filter(
      (product) =>
        product.tags?.includes('Displays & Stands') &&
        product.variants?.edges?.[0]?.node?.availableForSale &&
        product.variants?.edges?.[0]?.node?.quantityAvailable > 0
    );

    const jewellery = allProducts.filter((product) => !product.tags?.includes('Displays & Stands'));

    // Filter to in-stock jewellery and take (productLimit - 1) to leave room for stand
    const inStockJewellery = jewellery
      .filter((product) => {
        const variant = product.variants?.edges?.[0]?.node;
        return variant?.availableForSale && variant.quantityAvailable > 0;
      })
      .slice(0, kit.productLimit - 1);

    // Select the correct stand size: prefer stand matching kit size
    const standTag = kit.productLimit === 31 ? 'stand-30pc' : 'stand-20pc';
    const selectedStand = stands.find((s) => s.tags?.includes(standTag)) || stands[0];

    // Combine stand first + jewellery (stand at top of list)
    const inStockProducts = [...(selectedStand ? [selectedStand] : []), ...inStockJewellery];

    // Check if we have enough items (jewellery + stand) to fulfill the kit
    const isSoldOut = inStockProducts.length < kit.productLimit || stands.length === 0;

    // Calculate total price
    const totalPrice = inStockProducts.reduce((sum, product) => {
      const variant = product.variants?.edges?.[0]?.node;
      return sum + (variant ? parseFloat(variant.price.amount) : 0);
    }, 0);

    return {
      props: {
        kit: {
          slug: kit.slug,
          title: kit.title,
          description: kit.description,
        },
        products: inStockProducts,
        totalPrice: totalPrice.toString(),
        isSoldOut,
      },
      revalidate: 60,
    };
  } catch (error) {
    console.error(`Error fetching starter kit products for ${slug}:`, error);
    return { notFound: true };
  }
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = STARTER_KITS.map((kit) => ({
    params: { slug: kit.slug },
  }));

  return {
    paths,
    fallback: 'blocking',
  };
};
