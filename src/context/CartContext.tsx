import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useFavourites } from '@/context/FavouritesContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';

export interface CartItem {
  variantId: string;
  quantity: number;
  title?: string;
  variantTitle?: string;
  selectedOptions?: { name: string; value: string }[];
  price?: string;
  image?: string;
  handle?: string;
  metafields?: { key: string; value: string }[];
  quantityAvailable?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  checkoutUrl: string | null;
  addToCart: (
    variantId: string,
    quantity: number,
    meta?: Omit<CartItem, 'variantId' | 'quantity'>
  ) => void;
  updateQuantity: (variantId: string, newQty: number) => void;
  removeFromCart: (variantId: string) => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  flushSync: () => Promise<string | null>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const ITEMS_KEY = 'auricle-cart-items';
const CHECKOUT_ID_KEY = 'auricle-checkout-id';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const checkoutUrlRef = useRef<string | null>(checkoutUrl);

  const syncTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingSync = useRef<Promise<void> | null>(null);
  const syncVersion = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const latestItemsRef = useRef<CartItem[]>(cartItems);

  const { addFavourite, isFavourite } = useFavourites();
  const { showToast } = useToast();

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);
const { isApproved } = useAuth();
  useEffect(() => {
    checkoutUrlRef.current = checkoutUrl;
  }, [checkoutUrl]);

  const scheduleSync = (items: CartItem[]) => {
    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
    }
    if (abortController.current) {
      abortController.current.abort();
    }
    latestItemsRef.current = items;
    const current = ++syncVersion.current;
    abortController.current = new AbortController();
    syncTimeout.current = setTimeout(() => {
      pendingSync.current = syncShopifyCheckout(
        latestItemsRef.current,
        current,
        abortController.current?.signal
      ).finally(() => {
        pendingSync.current = null;
      });
    }, 100);
  };

  const flushSync = async (): Promise<string | null> => {
    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
      syncTimeout.current = null;
      pendingSync.current = syncShopifyCheckout(
        latestItemsRef.current,
        syncVersion.current,
        abortController.current?.signal
      ).finally(() => {
        pendingSync.current = null;
      });
    }
    if (pendingSync.current) {
      await pendingSync.current;
    }
    return checkoutUrlRef.current;
  };

  useEffect(() => {
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      abortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    const storedItems = localStorage.getItem(ITEMS_KEY);
    const storedId = localStorage.getItem(CHECKOUT_ID_KEY);

    let parsedItems: CartItem[] = [];

    if (storedItems) {
      try {
        parsedItems = JSON.parse(storedItems);
        setCartItems(parsedItems);
      } catch {
        setCartItems([]);
      }
    }

    if (storedId) {
      setCheckoutId(storedId);
      fetch('/api/get-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: storedId }),
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          const cart = data.cart;
          if (!cart) {
            fetch('/api/create-checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: parsedItems }),
              credentials: 'include',
            })
              .then((res) => res.json())
              .then((data) => {
                setCheckoutId(data.checkoutId);
                setCheckoutUrl(data.checkoutUrl);
                checkoutUrlRef.current = data.checkoutUrl;
              })
              .catch(() => {
                setCheckoutId(null);
                setCheckoutUrl(null);
                checkoutUrlRef.current = null;
              });
            return;
          }

          const items = (cart.lines.edges || []).map((edge: {
  node: {
    quantity: number;
    merchandise: {
      id: string;
      title?: string | null;
      selectedOptions?: { name: string; value: string }[];
      image?: { url?: string | null } | null;
      product?: {
        title?: string | null;
        handle?: string | null;
        featuredImage?: { url?: string | null } | null;
      } | null;
    };
    cost?: { amountPerQuantity?: { amount?: string } };
  };
}) => {
  const m = edge.node.merchandise;
  const p = m.product;

  const prodTitle = p?.title || '';
  const variantTitle = m?.title || '';
  const isDefaultVariant = /^default\s*title$/i.test(variantTitle || '');
  const selectedOptions = m?.selectedOptions || [];

  const imageUrl =
    m?.image?.url ||
    p?.featuredImage?.url ||
    undefined;

  const unitPrice =
    edge.node.cost?.amountPerQuantity?.amount || undefined;

  return {
    variantId: m.id,
    quantity: edge.node.quantity,
    title: prodTitle || 'Untitled Product',
    variantTitle: isDefaultVariant ? '' : variantTitle,
    selectedOptions,
    price: unitPrice,   // ← authoritative unit price
    image: imageUrl,
    handle: p?.handle || undefined,
    // keep your custom fields if you later add them
    metafields: undefined,
    quantityAvailable: undefined,
  } as CartItem;
});

          setCartItems(items);
          setCheckoutUrl(cart.checkoutUrl);
          checkoutUrlRef.current = cart.checkoutUrl;
        })
        .catch(() => {
          setCheckoutId(null);
          setCheckoutUrl(null);
          checkoutUrlRef.current = null;
        });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(cartItems));
    if (checkoutId) {
      localStorage.setItem(CHECKOUT_ID_KEY, checkoutId);
    } else {
      localStorage.removeItem(CHECKOUT_ID_KEY);
    }
  }, [cartItems, checkoutId]);

  useEffect(() => {
    latestItemsRef.current = cartItems;
  }, [cartItems]);
// When wholesale status flips, swap each line to its twin variant (retail ↔ wholesale)
useEffect(() => {
  let cancelled = false;

  // nothing to do
  if (!cartItems.length) return;

  (async () => {
    const replacements: Record<string, string> = {}; // oldVariantId -> newVariantId

    // ask the API for each line's twin variant
    for (const li of cartItems) {
      if (cancelled) return;
      try {
        const resp = await fetch('/api/shopify/variant-to-twin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ variantId: li.variantId }),
        });
        if (!resp.ok) continue;
        const { twinVariantId } = await resp.json();
        if (twinVariantId && twinVariantId !== li.variantId) {
          replacements[li.variantId] = twinVariantId;
        }
      } catch {
        // ignore; leave this line unchanged if lookup fails
      }
    }

    if (cancelled) return;
    const ids = Object.keys(replacements);
    if (ids.length === 0) return;

    // swap variantId in-place; keep product/title/image/meta the same
    const updated = cartItems.map((i) => {
      const newId = replacements[i.variantId];
      return newId ? { ...i, variantId: newId } : i;
    });

    setCartItems(updated);
    // push the new variant ids to Shopify so prices recalc server-side
    scheduleSync(updated);
  })();

  return () => { cancelled = true; };
  // re-run any time approval toggles (sign-in/out or tag change)
}, [isApproved]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncShopifyCheckout = async (
    items: CartItem[],
    current: number,
    signal?: AbortSignal
  ) => {
    // Validate variant IDs
    const invalidItems = items.filter(item => !item.variantId || !item.variantId.startsWith('gid://shopify/'));
    if (invalidItems.length > 0) {
      console.error('❌ Invalid variant IDs found:', invalidItems);
      return;
    }
    
    if (items.length === 0) {
      if (current !== syncVersion.current) return;
      setCheckoutUrl(null);
      setCheckoutId(null);
      checkoutUrlRef.current = null;
      return;
    }

    try {
      if (!checkoutId) {
        const res = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
          credentials: 'include',
          signal,
        });
        const data = await res.json();
        if (current !== syncVersion.current) return;
        setCheckoutUrl(data.checkoutUrl);
        setCheckoutId(data.checkoutId);
        checkoutUrlRef.current = data.checkoutUrl;
      } else {
        const res = await fetch('/api/update-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutId, items }),
          credentials: 'include',
          signal,
        });
        const data = await res.json();
        if (current !== syncVersion.current) return;
        // Handle completed checkout if API returns it
        if (data.completed) {
          setCartItems([]);
          setCheckoutId(null);
          setCheckoutUrl(null);
          checkoutUrlRef.current = null;
          return;
        }
        const cart = data.cart;
        if (cart) {
          // Preserve existing metadata when updating from Shopify
          const existingItemsMap = new Map(
            latestItemsRef.current.map(item => [item.variantId, item])
          );
          
          const updated = (cart.lines.edges || []).map((edge: {
  node: {
    quantity: number;
    merchandise: {
      id: string;
      title?: string | null;
      selectedOptions?: { name: string; value: string }[];
      image?: { url?: string | null } | null;
      product?: {
        title?: string | null;
        handle?: string | null;
        featuredImage?: { url?: string | null } | null;
      } | null;
    };
    cost?: { amountPerQuantity?: { amount?: string } };
  };
}) => {
  const m = edge.node.merchandise;
  const p = m.product;
  const existingItem = existingItemsMap.get(m.id);

  const prodTitle = p?.title || existingItem?.title || '';
  const variantTitle = m?.title || existingItem?.variantTitle || '';
  const isDefaultVariant = /^default\s*title$/i.test(variantTitle || '');
  const selectedOptions = m?.selectedOptions || existingItem?.selectedOptions || [];

  const imageUrl =
    m?.image?.url ||
    p?.featuredImage?.url ||
    existingItem?.image ||
    undefined;

  const unitPrice =
    edge.node.cost?.amountPerQuantity?.amount ||
    existingItem?.price ||
    undefined;

  return {
    variantId: m.id,
    quantity: edge.node.quantity,
    title: prodTitle || 'Untitled Product',
    variantTitle: isDefaultVariant ? '' : variantTitle,
    selectedOptions,
    price: unitPrice,   // ← authoritative unit price
    image: imageUrl,
    handle: p?.handle || existingItem?.handle || undefined,
    metafields: existingItem?.metafields,
    quantityAvailable: existingItem?.quantityAvailable,
  } as CartItem;
});

          if (current !== syncVersion.current) return;
          setCartItems(updated);
          setCheckoutUrl(cart.checkoutUrl);
          checkoutUrlRef.current = cart.checkoutUrl;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Checkout error:', err);
    }
  };

  const addToCart = (
  variantId: string,
  quantity: number,
  meta: Omit<CartItem, 'variantId' | 'quantity'> = {}
) => {
  // run the normalization asynchronously without changing the function’s type
  (async () => {
    // 1) Determine the twin of the incoming variant (if any)
    let twinOfIncoming: string | null = null;
    try {
      const resp = await fetch('/api/shopify/variant-to-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId }),
      });
      if (resp.ok) {
        const json = await resp.json();
        twinOfIncoming = json?.twinVariantId ?? null;
      }
    } catch {
      // ignore; we’ll still add the item
    }

    // 2) Build a helper to detect “same item” across channels
    const sameItemAsIncoming = (id: string) =>
      id === variantId || (twinOfIncoming && id === twinOfIncoming);

    // 3) If the cart already has this item (retail OR wholesale),
    //    merge the quantities under the *current* variantId.
    const existingSame = cartItems.find(i => sameItemAsIncoming(i.variantId));

    // quantity guard
    const maxQty =
      meta.quantityAvailable ??
      existingSame?.quantityAvailable ??
      Infinity;

    if (maxQty <= 0) {
      showToast('More coming soon.');
      return;
    }

    const desiredQty = (existingSame ? existingSame.quantity : 0) + quantity;
    const finalQty = Math.min(desiredQty, maxQty);

    // 4) Remove any existing twin line(s), then insert/replace with current variantId
    const filtered = cartItems.filter(i => !sameItemAsIncoming(i.variantId));

    const updatedItems: CartItem[] = [
      {
        variantId,                 // normalize to the variant we’re adding now
        quantity: finalQty,
        title: meta.title,
        variantTitle: meta.variantTitle,
        selectedOptions: meta.selectedOptions,
        price: meta.price,         // drawer will refresh from Shopify on sync
        image: meta.image,
        handle: meta.handle,
        metafields: meta.metafields,
        quantityAvailable: maxQty,
      },
      ...filtered,
    ];

    setCartItems(updatedItems);

    // Open drawer immediately for better UX
    openDrawer();

    // Add to favourites silently
    if (meta.handle && !isFavourite(meta.handle)) {
      addFavourite({
        handle: meta.handle,
        title: meta.title || '',
        image: meta.image,
        price: meta.price,
        metafields: meta.metafields,
      });
    }

    // 5) Sync to Shopify — prices will update to retail/wholesale correctly
    scheduleSync(updatedItems);
  })();
};


  const updateQuantity = (variantId: string, newQty: number) => {
    const item = cartItems.find((i) => i.variantId === variantId);
    if (!item) return;
    const maxQty = item.quantityAvailable ?? Infinity;
    if (maxQty <= 0) {
      showToast('More coming soon.');
      return;
    }
    if (newQty > maxQty && maxQty !== Infinity) {
      showToast(`We only have ${maxQty} available. Sorry 😞`);
      return;
    }
    const updated = cartItems
      .map((i) =>
        i.variantId === variantId ? { ...i, quantity: newQty } : i
      )
      .filter((i) => i.quantity > 0);

    setCartItems(updated);
    scheduleSync(updated);
  };

  const removeFromCart = (variantId: string) => {
    const updated = cartItems.filter((item) => item.variantId !== variantId);
    setCartItems(updated);
    scheduleSync(updated);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        checkoutUrl,
        addToCart,
        updateQuantity,
        removeFromCart,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        flushSync,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
