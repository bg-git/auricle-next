import type {
  GetStaticProps,
  GetStaticPaths,
  GetStaticPropsContext,
} from 'next';
import { shopifyFetch } from '@/lib/shopify';
import { useCart } from '@/context/CartContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Seo from '@/components/Seo';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useMemo } from 'react';
import { mapStyledByYou } from "@/lib/mapStyledByYou";
import type { UGCItem } from "@/components/StyledByYou";
import ProductGallery from "@/components/ProductGallery";
import dynamic from 'next/dynamic';
import { useCopy } from '@/hooks/useCopy';
import { useRegion } from '@/context/RegionContext';
import QuantityModal from '@/components/QuantityModal';

const StyledByYouLazy = dynamic(() => import('@/components/StyledByYou'), {
  ssr: false,
  loading: () => null,
});

const FavouriteToggleLazy = dynamic(
  () => import('@/components/FavouriteToggle'),
  {
    ssr: false,
    loading: () => null,
  }
);
const vipPricingEnabled =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_VIP_PRICING_ENABLED === 'true'
    : process.env.NEXT_PUBLIC_VIP_PRICING_ENABLED === 'true';

const normalizeOptionText = (value?: string | null) =>
  (value ?? '').toString().trim().toLowerCase();

const isSameOptionName = (a: string, b: string) =>
  normalizeOptionText(a) === normalizeOptionText(b);

const isSameOptionValue = (a: string, b: string) =>
  normalizeOptionText(a) === normalizeOptionText(b);

// TYPES
interface Metafield {
  key: string;
  value: string;
  reference?: {
    __typename?: string;
    url?: string | null;
  } | null;
}


interface ProductVariantNode {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  metafield?: {
    value: string | null;
  } | null;
  availableForSale: boolean;
  quantityAvailable: number;
  selectedOptions: {
    name: string;
    value: string;
  }[];
  image?: {
    url: string;
    width: number;
    height: number;
    altText: string | null;
  } | null;
  sku: string;
}


interface Product {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: {
      node: {
        url: string;
        altText: string | null;
        width: number;
        height: number;
      };
    }[];
  };
  variants: {
    edges: {
      node: ProductVariantNode;
    }[];
  };
  metafields: Metafield[];
}
interface ProductPageProps {
  product: Product;
  ugcItems: UGCItem[];
}

type GalleryImage = {
  url: string;
  width: number;
  height: number;
  alt?: string | null;
  isUGC?: boolean;
  credit?: string;
};

export default function ProductPage({ product, ugcItems }: ProductPageProps) {
  const copy = useCopy();
  const region = useRegion();  // 👈 add this

  const { addToCart, openDrawer } = useCart();
  const { showToast } = useToast();
  const router = useRouter();


  
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [showVariantImage, setShowVariantImage] = useState(false);
  const [qty, setQty] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [marketPrices, setMarketPrices] = useState<{
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    variants: { id: string; price: { amount: string; currencyCode: string } }[];
  } | null>(null);

  // Load cached market prices after mount to prevent hydration mismatch
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`market-price-${product.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Only use cache if it's less than 1 hour old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
          setMarketPrices(parsed.data);
        }
      }
    } catch {
      // Ignore errors
    }
  }, [product.id]);

  const variantEdges = useMemo(() => product?.variants?.edges || [], [product]);
  const defaultVariant = useMemo<ProductVariantNode | null>(() => {
  const nodes = (variantEdges || []).map(v => v.node);
  if (nodes.length === 0) return null;

  // Prefer first in-stock variant; otherwise fall back to the first variant
  const firstInStock = nodes.find(
    v => v.availableForSale && (v.quantityAvailable ?? 0) > 0
  );
  return firstInStock ?? nodes[0];
}, [variantEdges]);
// Group variant options (e.g. Gauge, Length) from selectedOptions
const optionDefinitions = useMemo(() => {
  const optionMap = new Map<string, Set<string>>();

  variantEdges.forEach(({ node }) => {
    node.selectedOptions.forEach((opt) => {
      if (!optionMap.has(opt.name)) {
        optionMap.set(opt.name, new Set());
      }
      optionMap.get(opt.name)!.add(opt.value);
    });
  });

  let defs = Array.from(optionMap.entries()).map(([name, values]) => ({
    name,
    values: Array.from(values),
  }));

  // 🔎 Filter out the fake Shopify "Default Title" option
  // (single option set with only "Default Title" as a value)
  defs = defs.filter(
    (opt) =>
      !(
        opt.values.length === 1 &&
        opt.values[0] &&
        opt.values[0].toLowerCase() === 'default title'
      )
  );

  return defs;
}, [variantEdges]);


// Track current selection per option name
const [selectedOptionsState, setSelectedOptionsState] = useState<
  Record<string, string>
>({});

const getSelectedOptionValue = (
  state: Record<string, string>,
  name: string
) => {
  const entry = Object.entries(state).find(([key]) =>
    isSameOptionName(key, name)
  );

  return entry?.[1];
};

const setSelectedOption = (name: string, value: string) => {
  setSelectedOptionsState((prev) => {
    const next: Record<string, string> = {};
    Object.entries(prev).forEach(([key, val]) => {
      if (!isSameOptionName(key, name)) {
        next[key] = val;
      }
    });

    next[name] = value;
    return next;
  });
};


useEffect(() => {
  if (!defaultVariant) {
    setSelectedVariantId(null);
    setQty(0);
    setSelectedOptionsState({}); // 👈 clear options when no default variant
    return;
  }

  setSelectedVariantId(defaultVariant.id);
  setShowVariantImage(false);
  setQty(
    defaultVariant.availableForSale &&
    (defaultVariant.quantityAvailable ?? 0) > 0
      ? 1
      : 0
  );

  // 👇 NEW: initialise selected options from the default variant
  const initialOptions: Record<string, string> = {};
  defaultVariant.selectedOptions.forEach((opt) => {
    const existingKey = Object.keys(initialOptions).find((key) =>
      isSameOptionName(key, opt.name)
    );

    if (existingKey) {
      delete initialOptions[existingKey];
    }

    initialOptions[opt.name] = opt.value;
  });
  setSelectedOptionsState(initialOptions);
}, [router.asPath, product?.id, defaultVariant]);



// 🔽 ADD THIS RIGHT HERE 🔽
useEffect(() => {
  if (!variantEdges.length) return;
  if (!Object.keys(selectedOptionsState).length) return;

  const match = variantEdges.find(({ node }) =>
    node.selectedOptions.every((opt) => {
      const selectedValue = getSelectedOptionValue(
        selectedOptionsState,
        opt.name
      );

      return (
        selectedValue !== undefined &&
        isSameOptionValue(selectedValue, opt.value)
      );
    })
  );

  if (match) {
    setSelectedVariantId(match.node.id);
    setShowVariantImage(true);
  }
}, [selectedOptionsState, variantEdges]);
// 🔼 UP TO HERE 🔼

useEffect(() => {
  const v = variantEdges.find(e => e.node.id === selectedVariantId)?.node;
  if (!v) return;
  setQty((v.quantityAvailable ?? 0) > 0 ? 1 : 0);
  if (!v.image) {
    setShowVariantImage(false);
  }
}, [selectedVariantId, variantEdges]);




 const { user, refreshUser, loading } = useAuth();
const hasRefreshed = useRef(false);
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

const approved: true | false | null = !mounted ? null : (loading ? null : Boolean(user?.approved));

const isVipMember =
  mounted && Array.isArray(user?.tags)
    ? user!.tags!.includes('VIP-MEMBER')
    : false;



  useEffect(() => {
    if (user && !user.approved && !hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshUser();
    }
  }, [user, refreshUser]);

  // Fetch market-specific prices when user is authenticated
 useEffect(() => {
  if (!user || !product?.handle) {
    console.log('Skipping market price fetch:', {
      hasUser: !!user,
      hasHandle: !!product?.handle,
    });
    return;
  }

  console.log('Fetching market prices for user with address:', user.defaultAddress);

  const fetchMarketPrices = async () => {
    try {
      const response = await fetch('/api/shopify/get-product-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: product.handle }),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Market prices received:', data);
        setMarketPrices(data);

        try {
          localStorage.setItem(`market-price-${product.id}`, JSON.stringify({
            data,
            timestamp: Date.now(),
          }));
        } catch {
          // Ignore localStorage errors
        }
      } else {
        console.error('Failed to fetch market prices, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch market prices:', error);
    }
  };

  fetchMarketPrices();
}, [user, product?.handle, product?.id]);


  useEffect(() => {
    const v = variantEdges.find(e => e.node.id === selectedVariantId)?.node;
    if (!v) return;
    setQty((v.quantityAvailable ?? 0) > 0 ? 1 : 0);
    if (!v.image) {
      setShowVariantImage(false);
    }
  }, [selectedVariantId, variantEdges]);


  const selectedVariant = product?.variants?.edges?.find(
    v => v.node.id === selectedVariantId
  )?.node;

  // Build the combined gallery: official image first, optional variant image,
  // then up to 2 “Styled By You” images
  const galleryImages = useMemo<GalleryImage[]>(() => {
    const official: GalleryImage[] =
      (product.images?.edges || [])
        .slice(0, 1)
        .map(({ node }) => ({
          url: node.url,
          width: node.width,
          height: node.height,
          alt: node.altText || product.title,
          isUGC: false,
        }));

    const variantImg: GalleryImage[] =
      showVariantImage && selectedVariant?.image
        ? [{
            url: selectedVariant.image.url,
            width: selectedVariant.image.width,
            height: selectedVariant.image.height,
            alt: selectedVariant.image.altText || product.title,
            isUGC: false,
          }]
        : [];

    const sby: GalleryImage[] = (ugcItems || []).slice(0, 2).map((it) => ({
      url: it.image.url,
      width: it.image.width,
      height: it.image.height,
      alt: it.alt || "Styled by you",
      isUGC: true,
      credit: it.credit || undefined,
    }));

    // De-dupe by base URL, preserving order
    const seen = new Set<string>();
    return [...official, ...variantImg, ...sby].filter((img) => {
      const base = img.url.split("?")[0];
      if (seen.has(base)) return false;
      seen.add(base);
      return true;
    });
  }, [product.images, product.title, ugcItems, selectedVariant?.image, showVariantImage]);

  const isSoldOut =
    !selectedVariant?.availableForSale ||
    selectedVariant?.quantityAvailable <= 0;

  const maxQty = selectedVariant?.quantityAvailable ?? 9999;

  // Use market-specific prices if available, otherwise use default prices
  const currentPrice = useMemo(() => {
    if (marketPrices && selectedVariant) {
      const marketVariant = marketPrices.variants.find(v => v.id === selectedVariant.id);
      return marketVariant?.price || selectedVariant.price;
    } else if (marketPrices) {
      return marketPrices.priceRange.minVariantPrice;
    } else if (selectedVariant) {
      return selectedVariant.price;
    } else {
      return product?.priceRange?.minVariantPrice || { amount: '0', currencyCode: 'GBP' };
    }
  }, [marketPrices, selectedVariant, product]);

// Base price from marketPrices / Storefront API
const baseRawPrice = parseFloat(currentPrice.amount);
const currencyCode = currentPrice.currencyCode;

// Member price from variant metafield (custom.member_price)
const memberPriceRaw = selectedVariant?.metafield?.value ?? null;
const memberRaw =
  memberPriceRaw !== null && memberPriceRaw !== ''
    ? parseFloat(memberPriceRaw)
    : null;

// Effective price: VIP uses member price if available; otherwise default
const effectiveRawPrice =
  vipPricingEnabled && isVipMember && memberRaw !== null
    ? memberRaw
    : baseRawPrice;


const formattedPrice =
  effectiveRawPrice % 1 === 0
    ? effectiveRawPrice.toFixed(0)
    : effectiveRawPrice.toFixed(2);

// Currency symbol mapping
const currencySymbols: Record<string, string> = {
  GBP: '£',
  USD: '$',
  CAD: 'CA$',
  EUR: '€',
};
const currencySymbol = currencySymbols[currencyCode] || currencyCode;

// Labels for UI
const defaultLabel =
  baseRawPrice % 1 === 0
    ? `${currencySymbol}${baseRawPrice.toFixed(0)}`
    : `${currencySymbol}${baseRawPrice.toFixed(2)}`;

const memberLabel =
  memberRaw !== null
    ? memberRaw % 1 === 0
      ? `${currencySymbol}${memberRaw.toFixed(0)}`
      : `${currencySymbol}${memberRaw.toFixed(2)}`
    : null;



  const metafields = useMemo(
    () => product?.metafields || [],
    [product?.metafields]
  );

  const getFieldValue = (key: string): string | null => {
    const field = metafields.find((f: Metafield) => f?.key === key);
    if (!field?.value) return null;

    const value = field.value.trim();
    if (!value.startsWith('{') && !value.startsWith('[')) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
    } catch {
      return value;
    }
  };
const getFileUrl = (key: string): string | null => {
  const field = metafields.find((f: Metafield) => f?.key === key);
  if (!field) return null;

  // Prefer the reference GenericFile URL
  if (field.reference && typeof field.reference.url === 'string') {
    return field.reference.url;
  }

  // Fallback: if value *is* already a https URL, use it
  if (field.value && field.value.startsWith('http')) {
    return field.value;
  }

  return null;
};
  const selectedSku = selectedVariant?.sku || getFieldValue('sku');

  const currentVariantLabel = getFieldValue('variant_label') || 'Select an option';
  const rawVariants = getFieldValue('variants');

  const variantOptions = rawVariants
    ? rawVariants.split(',').map((entry: string) => {
        const [label, url] = entry.trim().split('::');
        return { label: label?.trim(), url: url?.trim() };
      })
    : [];

    type ExtraRow = { label: string; value: string };

const extraRows: ExtraRow[] = useMemo(() => {
  const field = metafields.find((f) => f?.key === 'extra_table_rows');
  const raw = field?.value?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && typeof r.label === 'string' && typeof r.value === 'string')
      .map((r) => ({ label: r.label.trim(), value: r.value.trim() }));
  } catch {
    return [];
  }
}, [metafields]);



  const cellLabelStyle = {
    padding: '8px',
    fontWeight: 500,
    background: '#f9f9f9',
    border: '1px solid #e0e0e0',
    textTransform: 'uppercase' as const,
    fontSize: '12px',
    width: '40%',
  };

  const cellValueStyle = {
    padding: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    width: '60%',
  };

const detailKeys: Array<
  | 'title'
  | 'name'
  | 'sku'
  | 'metal'
  | 'alloy'
  | 'metal_colour'
  | 'thread_type'
  | 'fitting'
  | 'gem_type'
  | 'gem_colour'
  | 'gauge'
  | 'base_size'
  | 'length'
  | 'width'
  | 'height'
  | 'sold_as'
  | 'shipping'
> = [
  'title',
  'name',
  'sku',
  'metal',
  'alloy',
  'metal_colour',
  'thread_type',
  'fitting',
  'gem_type',
  'gem_colour',
  'gauge',
  'base_size',
  'length',
  'width',
  'height',
  'sold_as',
  'shipping',
];

const testCertificateUrl = getFileUrl('test_certificate');



  // ✅ Viewport-gate "Styled By You"
  const sbyAnchorRef = useRef<HTMLDivElement | null>(null);
  const [showSBY, setShowSBY] = useState(false);

  useEffect(() => {
    const el = sbyAnchorRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowSBY(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ✅ Idle-load FavouriteToggle (with proper typing from src/types/idle-callback.d.ts)
  const [showFav, setShowFav] = useState(false);
  useEffect(() => {
    let cancel: (() => void) | undefined;

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(() => setShowFav(true));
      cancel = () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(id as number);
        }
      };
    } else {
      const t = window.setTimeout(() => setShowFav(true), 300);
      cancel = () => window.clearTimeout(t);
    }

    return () => { if (cancel) cancel(); };
  }, []);

  if (!product) {
    return <div style={{ padding: '16px' }}>Product not found.</div>;
  }

  return (
    <>
      <Seo
        title={getFieldValue('title') || product.title}
        description={
          getFieldValue('description') || `Buy ${product.title} in 14k gold or titanium.`
        }
        canonical={`https://www.auricle.co.uk/product/${product.handle}`}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "image": product.images?.edges?.map(img => img?.node?.url).filter(Boolean),
            "description":
              product.metafields?.find((m) => m?.key === "description")?.value || "",
            "sku": product.metafields?.find((m) => m?.key === "sku")?.value || "",
            "brand": {
              "@type": "Brand",
              "name": "AURICLE"
            },
            "offers": {
              "@type": "Offer",
              "url": `https://www.auricle.co.uk/product/${product.handle}`,
              "priceCurrency": currencyCode,
              "price": formattedPrice,
              "availability": isSoldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              "priceSpecification": {
                "@type": "UnitPriceSpecification",
                "priceCurrency": currencyCode,
                "price": formattedPrice
              }
            }
          })
        }}
      />

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        <div className="product-layout">
          <div className="product-image" style={{ position: 'relative' }}>
            <ProductGallery
              images={galleryImages}
              defaultActive={showVariantImage ? 1 : 0}
            />

            <div className="fav-wrapper">
              {showFav ? (
                <FavouriteToggleLazy
                  handle={router.query.handle as string}
                  title={product.title}
                  image={galleryImages[0]?.url || '/placeholder.png'}
                  price={formattedPrice}
                  metafields={metafields}
                />
              ) : (
                <span className="fav-placeholder" />
              )}
            </div>
          </div>

          <div className="product-info">
  <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
    {product.title}
  </h1>

  <p
    style={{
      fontSize: '12px',
      color: '#666',
      marginTop: '10px',
      marginBottom: '16px',
      textAlign: 'left',
      minHeight: 18,
    }}
  >
    {selectedSku || ''}
  </p>

    {/* Price */}
<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
  <div
    style={{
      minWidth: '80px',
      position: 'relative',
      textAlign: 'right',
    }}
  >
    {approved === true ? (
      isVipMember && memberLabel ? (
        <>
          {/* VIP: show member price as main (no label, no purple) */}
          <div
            aria-live="polite"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '22px',
            }}
          >
            {memberLabel}
          </div>
          <div
            style={{
              fontSize: '12px',
              opacity: 0.7,
              marginTop: '2px',
            }}
          >
            Non-member: {defaultLabel}
          </div>
        </>
      ) : (
        <>
          {/* Non-VIP: show default price as main, VIP teaser underneath */}
          <div
            aria-live="polite"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '22px',
            }}
          >
            {defaultLabel}
          </div>
        {vipPricingEnabled && memberLabel && (
  <div className="vip-price-wrapper">
    <div className="vip-price-teaser">
      <span className="vip-price-teaser__label">VIP MEMBER PRICE</span>
      <span className="vip-price-teaser__value">{memberLabel}</span>
    </div>

    <Link href="/vip-membership" className="vip-price-link">
      Become a VIP MEMBER
    </Link>
  </div>
)}



        </>
      )
    ) : (
      // Reserve space but hide price when not approved
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          lineHeight: '22px',
          visibility: 'hidden',
        }}
      >
        {defaultLabel}
      </div>
    )}
  </div>
</div>


    

  {/* Variant options (unchanged) */}
  {variantOptions.length > 0 && (
    <div style={{ marginTop: '24px' }}>
      <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
        Available in:
      </p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {variantOptions.map((variant) => {
          const isCurrent = variant.label === currentVariantLabel;
          return isCurrent ? (
            <span
              key={variant.label}
              style={{
                padding: '8px 12px',
                borderRadius: '5px',
                background: '#181818',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                border: '2px solid #181818',
              }}
            >
              {variant.label}
            </span>
          ) : (
            <Link
              key={variant.url}
              href={variant.url}
              style={{
                padding: '8px 12px',
                borderRadius: '5px',
                background: '#fff',
                color: '#181818',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid #ccc',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              {variant.label}
            </Link>
          );
        })}
      </div>
    </div>
  )}

{/* Variant selectors – one per option (e.g. Fitting, Length) */}
{optionDefinitions.length > 0 && (
  <div className="variant-wrapper">
    {optionDefinitions.map((option, optionIndex) => (
      <div key={option.name} style={{ marginTop: '16px' }}>
        <p className="variant-label">{option.name}</p>

        <div className="variant-grid">
          {option.values.map((value) => {
            const currentSelection = getSelectedOptionValue(
              selectedOptionsState,
              option.name
            );
            const isSelected =
              currentSelection !== undefined &&
              isSameOptionValue(currentSelection, value);

            let variantsForValue;

            if (optionIndex === 0) {
              // FIRST OPTION (e.g. Fitting):
              // Show all values that exist on ANY variant.
              variantsForValue = variantEdges
                .map(({ node }) => node)
                .filter((node) =>
                  node.selectedOptions.some(
                    (opt) =>
                      isSameOptionName(opt.name, option.name) &&
                      isSameOptionValue(opt.value, value)
                  )
                );
            } else {
  // SECOND+ OPTION:
  // Only show values that exist for the CURRENT FULL SELECTION
  // (i.e. candidate value + all other selected options)
  variantsForValue = variantEdges
    .map(({ node }) => node)
    .filter((node) => {
      // 1) candidate value must exist on this node for THIS option
      const hasThisValue = node.selectedOptions.some(
        (opt) =>
          isSameOptionName(opt.name, option.name) &&
          isSameOptionValue(opt.value, value)
      );
      if (!hasThisValue) return false;

      // 2) every OTHER selected option in state must match this node
      const otherSelections = Object.entries(selectedOptionsState).filter(
        ([selectedName]) => !isSameOptionName(selectedName, option.name)
      );

      return otherSelections.every(([selectedName, selectedValue]) => {
        return node.selectedOptions.some(
          (opt) =>
            isSameOptionName(opt.name, selectedName) &&
            isSameOptionValue(opt.value, selectedValue)
        );
      });
    });
}


            const hasVariant = variantsForValue.length > 0;

            // If there is no variant at all for this value (+ primary), hide it completely.
            if (!hasVariant) {
              return null;
            }

            // If all matching variants are OOS, show but disable.
            const allOOS = variantsForValue.every(
              (node) =>
                !node.availableForSale ||
                (node.quantityAvailable ?? 0) <= 0
            );

            const isDisabled = allOOS;

            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedOption(option.name, value);
                }}
                className={`variant-button${
                  isSelected ? ' selected' : ''
                }${isDisabled ? ' is-disabled' : ''}`}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                title={allOOS ? 'Sold out' : undefined}
                aria-label={
                  allOOS ? `${option.name} ${value} (Sold out)` : undefined
                }
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
)}






  {/* Quantity + Add to Cart (always rendered; masked when not approved) */}
  <div className="desktop-add-to-cart" style={{ marginTop: '24px' }}>
    <div style={{ display: 'flex', gap: '12px' }}>
      <label htmlFor="qty" style={{ position: 'absolute', left: '-9999px' }}>
        Quantity
      </label>

      {/* Qty control */}
      <div
        style={{
          flex: '0 0 120px',
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #ccc',
          borderRadius: '4px',
          overflow: 'hidden',
          paddingInline: '4px',
          opacity: approved !== true ? 0.6 : 1,
        }}
      >
        <button
          style={{
            width: '48px',
            height: '48px',
            minWidth: '48px',
            minHeight: '48px',
            background: '#fff',
            border: 'none',
            fontSize: '20px',
            cursor: approved === true ? 'pointer' : 'not-allowed',
          }}
          onClick={() => setQty((prev) => Math.max(isSoldOut ? 0 : 1, prev - 1))}
          disabled={approved !== true}
          aria-disabled={approved !== true}
          title={approved !== true ? 'Sign in to purchase' : undefined}
        >
          −
        </button>
        <span
          id="qty"
          style={{
            width: '100%',
            height: '40px',
            textAlign: 'center',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            cursor: 'pointer',
          }}
          onClick={() => setIsModalOpen(true)}
        >
          {qty}
        </span>
        <button
          style={{
            width: '48px',
            height: '48px',
            minWidth: '48px',
            minHeight: '48px',
            fontSize: '20px',
            background: '#fff',
            border: 'none',
            cursor: approved === true ? 'pointer' : 'not-allowed',
          }}
          onClick={() => {
            if (approved !== true) return;
            if (maxQty <= 0) { showToast('More coming soon 😉'); return; }
            if (qty >= maxQty) { showToast(`We only have ${maxQty} available. Sorry 😞`); return; }
            setQty((prev) => prev + 1);
          }}
          disabled={approved !== true}
          aria-disabled={approved !== true}
          title={approved !== true ? 'Sign in to purchase' : undefined}
        >
          +
        </button>
      </div>

      {/* CTA */}
      <button
        style={{
          flex: '1',
          height: '48px',
          minHeight: '48px',
          background: '#181818',
          color: '#fff',
          border: 'none',
          fontSize: '14px',
          fontWeight: 900,
          cursor: 'pointer',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          opacity: approved !== true ? 0.85 : 1,
        }}
        onClick={() => {
          if (approved !== true) {
            router.push(`/sign-in?next=${encodeURIComponent(router.asPath)}`);
            return;
          }
          if (isSoldOut) { showToast('SOLD OUT. More coming soon.'); return; }
          if (!selectedVariantId || !selectedVariant) return;

          addToCart(selectedVariantId, qty, {
  handle: router.query.handle as string,
  title: product.title,
  variantTitle: selectedVariant.title,
  selectedOptions: selectedVariant.selectedOptions,
  price: effectiveRawPrice.toString(),
  basePrice: baseRawPrice.toString(),
  memberPrice: memberRaw !== null ? memberRaw.toString() : undefined,
  currencyCode: currentPrice.currencyCode,
  image: product.images?.edges?.[0]?.node?.url || undefined,
  metafields: product.metafields,
  quantityAvailable: selectedVariant.quantityAvailable,
});


          openDrawer();
        }}
        disabled={approved !== true || isSoldOut}
        aria-disabled={approved !== true || isSoldOut}
      >
        {approved !== true ? 'SIGN IN' : (isSoldOut ? 'SOLD OUT' : 'ADD TO BAG')}
      </button>
    </div>
  </div>

  {/* VAT Note (reserve height to avoid CLS) */}
  <p
    style={{
      fontSize: '12px',
      color: '#666',
      marginTop: '10px',
      marginBottom: '16px',
      textAlign: 'right',
      minHeight: 18,
    }}
  >
    {copy.taxLabel}
  </p>

  {/* Details block (unchanged) */}
  <div style={{ marginTop: '32px' }}>
    <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Details</h2>
    <table
  style={{
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
    border: '1px solid #e0e0e0',
  }}
>
  <tbody>
  {detailKeys.map((key) => {
    const value =
      key === 'shipping'
        ? copy.shippingFromText
        : getFieldValue(key);

    if (!value && key !== 'shipping') return null;

    const label = copy.detailLabels[key];

    return (
      <>
        {key === 'shipping' && extraRows.map((row, i) => (
          <tr key={`extra-${i}`}>
            <td style={cellLabelStyle}>{row.label.toUpperCase()}</td>
            <td style={cellValueStyle}>{row.value}</td>
          </tr>
        ))}

        {value ? (
          <tr key={key}>
            <td style={cellLabelStyle}>{label.toUpperCase()}</td>
            <td style={cellValueStyle}>{value}</td>
          </tr>
        ) : null}
      </>
    );
  })}
</tbody>

</table>

{/* ✅ Test Certificate box (only shows when user is approved AND metafield exists) */}
{approved === true && testCertificateUrl && (
  <div
    style={{
      marginTop: '16px',
      display: 'flex',
      justifyContent: 'flex-start',
      alignItems: 'center',
    }}
  >
    <a
      href={testCertificateUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '4px',
        border: '1px solid #181818',
        background: '#fff',
        color: '#181818',
        fontSize: '14px',
        fontWeight: 600,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g strokeWidth="0" />
        <g strokeLinecap="round" strokeLinejoin="round" />
        <g>
          <path
            d="M719.8 651.8m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0Z"
            fill="#E73B37"
          />
          <path
            d="M512.1 64H172v896h680V385.6L512.1 64z m278.8 324.3h-280v-265l280 265zM808 916H216V108h278.6l0.2 0.2v296.2h312.9l0.2 0.2V916z"
            fill="#39393A"
          />
          <path d="M280.5 530h325.9v16H280.5z" fill="#39393A" />
          <path d="M639.5 530h90.2v16h-90.2z" fill="#E73B37" />
          <path d="M403.5 641.8h277v16h-277z" fill="#39393A" />
          <path d="M280.6 641.8h91.2v16h-91.2z" fill="#E73B37" />
          <path d="M279.9 753.7h326.5v16H279.9z" fill="#39393A" />
          <path d="M655.8 753.7h73.9v16h-73.9z" fill="#E73B37" />
        </g>
      </svg>
      <span>VIEW TEST CERTIFICATE</span>
    </a>
  </div>
)}



{region === 'uk' && product.descriptionHtml && (
  <div
    style={{ marginTop: '24px', fontSize: '14px', lineHeight: '1.6' }}
    dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
  />
)}


  </div>
</div>
</div>

        {/* ✅ Styled By You (renders when near viewport) */}
        <div
          ref={sbyAnchorRef}
          style={{ minHeight: showSBY ? undefined : '400px' }}
        >
          {showSBY ? <StyledByYouLazy items={ugcItems} /> : null}
        </div>

        <div style={{ height: '80px' }} />
        
      </main>

      <QuantityModal
        isOpen={isModalOpen}
        currentQty={qty}
        maxQty={maxQty}
        onAdd={(newQty) => {
          if (isSoldOut) { showToast('SOLD OUT. More coming soon.'); return; }
          if (!selectedVariantId || !selectedVariant) return;
          addToCart(selectedVariantId, newQty, {
            handle: router.query.handle as string,
            title: product.title,
            variantTitle: selectedVariant.title,
            selectedOptions: selectedVariant.selectedOptions,
            price: effectiveRawPrice.toString(),
            basePrice: baseRawPrice.toString(),
            memberPrice: memberRaw !== null ? memberRaw.toString() : undefined,
            currencyCode: currentPrice.currencyCode,
            image: product.images?.edges?.[0]?.node?.url || undefined,
            metafields: product.metafields,
            quantityAvailable: selectedVariant.quantityAvailable,
          });
          openDrawer();
        }}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const query = `
    {
      products(first: 250) {
        edges {
          node {
            handle
          }
        }
      }
    }
  `;

  const data = await shopifyFetch({ query });

  const paths = data.products.edges.map(
    ({ node }: { node: { handle: string } }) => ({
      params: { handle: node.handle },
    })
  );

  return {
    paths,
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<ProductPageProps> = async (
  context: GetStaticPropsContext
) => {
  const handle = context.params?.handle as string;

  // 🚀 301 redirect for the VIP membership product
  if (handle === 'vip-membership') {
    return {
      redirect: {
        destination: '/vip-membership',
        permanent: true,
      },
    };
  }


const query = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      descriptionHtml
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }

      images(first: 5) {
        edges {
          node {
            url(transform: { maxWidth: 1600, preferredContentType: WEBP })
            width
            height
            altText
          }
        }
      }

      variants(first: 250) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            metafield(namespace: "custom", key: "member_price") {
              value
            }
            availableForSale
            quantityAvailable
            selectedOptions {
              name
              value
            }
            sku
            image {
              url
              width
              height
              altText
            }
          }
        }
      }

      metafields(identifiers: [
        { namespace: "custom", key: "alloy" },
        { namespace: "custom", key: "metal" },
        { namespace: "custom", key: "metal_colour" },
        { namespace: "custom", key: "thread_type" },
        { namespace: "custom", key: "gem_type" },
        { namespace: "custom", key: "gem_colour" },
        { namespace: "custom", key: "name" },
        { namespace: "custom", key: "title" },
        { namespace: "custom", key: "sku" },
        { namespace: "custom", key: "width" },
        { namespace: "custom", key: "height" },
        { namespace: "custom", key: "length" },
        { namespace: "custom", key: "gauge" },
        { namespace: "custom", key: "sold_as" },
        { namespace: "custom", key: "shipping" },
        { namespace: "custom", key: "base_size" },
        { namespace: "custom", key: "variants" },
        { namespace: "custom", key: "variant_label" },
        { namespace: "custom", key: "fitting" },
        { namespace: "custom", key: "extra_table_rows" },
        { namespace: "custom", key: "test_certificate" }

      ]) {
        key
        value
        reference {
          __typename
          ... on GenericFile {
            url
          }
        }
      }

      styledByYou: metafield(namespace: "custom", key: "styled_by_you") {
        references(first: 50) {
          edges {
            node {
              ... on Metaobject {
                id
                type
                fields {
                  key
                  value
                  reference {
                    __typename
                    ... on MediaImage {
                      image {
                        url(transform: { maxWidth: 1200, preferredContentType: WEBP })
                        width
                        height
                        altText
                      }
                    }
                    ... on Product {
                      id
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



  const data = await shopifyFetch({ query, variables: { handle } });

  const ugcItems = mapStyledByYou(
    data.productByHandle.styledByYou?.references?.edges ?? [],
    data.productByHandle.id
  );

return {
    props: {
      product: data.productByHandle,
      ugcItems,
    },
    revalidate: 60,
  };
};
