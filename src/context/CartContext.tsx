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
  basePrice?: string;
  memberPrice?: string;
  currencyCode?: string;
  image?: string;
  handle?: string;
  metafields?: { key: string; value: string }[];
  quantityAvailable?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  checkoutUrl: string | null;
  draftCheckoutUrl: string | null;
  draftStatus: DraftStatus;
  draftSignature: string | null;
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
  ensureVipDraftCheckout: () => Promise<string | null>;
}

export type DraftStatus = 'idle' | 'building' | 'ready' | 'error';

const CartContext = createContext<CartContextType | undefined>(undefined);

const ITEMS_KEY = 'auricle-cart-items';
const CHECKOUT_ID_KEY = 'auricle-checkout-id';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [draftCheckoutUrl, setDraftCheckoutUrl] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle');
  const [draftSignature, setDraftSignature] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const checkoutUrlRef = useRef<string | null>(checkoutUrl);

  const syncTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingSync = useRef<Promise<void> | null>(null);
  const syncVersion = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const latestItemsRef = useRef<CartItem[]>(cartItems);
  const draftRequestRef = useRef(0);

  const { addFavourite, isFavourite } = useFavourites();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isVipMember = Array.isArray(user?.tags)
    ? user.tags.includes('VIP-MEMBER')
    : false;

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  useEffect(() => {
    checkoutUrlRef.current = checkoutUrl;
  }, [checkoutUrl]);

  const resetDraftState = () => {
    setDraftCheckoutUrl(null);
    setDraftSignature(null);
    setDraftStatus('idle');
    draftRequestRef.current += 1;
  };

  const computeDraftSignature = (items: CartItem[], vip: boolean) =>
    JSON.stringify({
      vip,
      items: items.map(({ variantId, quantity }) => ({ variantId, quantity })),
    });

  const buildVipDraftCheckout = async (
    signature: string,
    items: CartItem[],
    requestId: number
  ) => {
    try {
      setDraftStatus('building');
      setDraftCheckoutUrl(null);
      setDraftSignature(signature);

      const res = await fetch('/api/vip/create-draft-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      const url = data?.draftCheckoutUrl || data?.invoiceUrl;

      if (requestId !== draftRequestRef.current) return null;

      if (!res.ok || !url) {
        setDraftCheckoutUrl(null);
        setDraftStatus('error');
        return null;
      }

      setDraftCheckoutUrl(url);
      setDraftStatus('ready');
      return url as string;
    } catch (error) {
      if (requestId !== draftRequestRef.current) return null;
      console.error('VIP draft checkout error', error);
      setDraftCheckoutUrl(null);
      setDraftStatus('error');
      return null;
    }
  };

  const ensureVipDraftCheckout = async (): Promise<string | null> => {
    if (!isVipMember || cartItems.length === 0) return null;

    const signature = computeDraftSignature(cartItems, isVipMember);

    if (draftCheckoutUrl && draftStatus === 'ready' && draftSignature === signature) {
      return draftCheckoutUrl;
    }

    if (draftStatus === 'building') return null;

    const requestId = ++draftRequestRef.current;
    return buildVipDraftCheckout(signature, cartItems, requestId);
  };

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
      resetDraftState();
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

          const items = (cart.lines.edges || []).map(
            (
              edge: {
                node: { merchandise: { id: string }; quantity: number };
              }
            ) => {
              // Try to find existing item data from localStorage
              const existingItem = parsedItems.find(
                (item) => item.variantId === edge.node.merchandise.id
              );
              return {
                variantId: edge.node.merchandise.id,
                quantity: edge.node.quantity,
                // Preserve existing metadata from localStorage
                title: existingItem?.title,
                variantTitle: existingItem?.variantTitle,
                selectedOptions: existingItem?.selectedOptions,
                price: existingItem?.price,
                basePrice: existingItem?.basePrice,
                memberPrice: existingItem?.memberPrice,
                currencyCode: existingItem?.currencyCode,
                image: existingItem?.image,
                handle: existingItem?.handle,
                metafields: existingItem?.metafields,
                quantityAvailable: existingItem?.quantityAvailable,
              };
            }
          );
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

  useEffect(() => {
    if (!isVipMember) {
      resetDraftState();
      return;
    }

    if (cartItems.length === 0) {
      resetDraftState();
      return;
    }

    const signature = computeDraftSignature(cartItems, isVipMember);
    if (
      draftCheckoutUrl &&
      draftStatus === 'ready' &&
      draftSignature === signature
    ) {
      return;
    }

    let cancelled = false;
    const requestId = ++draftRequestRef.current;

    buildVipDraftCheckout(signature, cartItems, requestId).catch((error) => {
      if (cancelled) return;
      console.error('Failed to warm VIP draft checkout', error);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, isVipMember]);

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

    const validItems = items.filter((item) => item.quantity > 0);

    if (validItems.length !== items.length) {
      if (current !== syncVersion.current) return;
      setCartItems(validItems);
      latestItemsRef.current = validItems;
    }

    if (validItems.length === 0) {
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
          body: JSON.stringify({ items: validItems }),
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
          body: JSON.stringify({ checkoutId, items: validItems }),
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

          const updated = (cart.lines.edges || []).map(
            (
              edge: {
                node: { merchandise: { id: string }; quantity: number };
              }
            ) => {
              const existingItem = existingItemsMap.get(edge.node.merchandise.id);
              return {
                variantId: edge.node.merchandise.id,
                quantity: edge.node.quantity,
                // Preserve existing metadata
                title: existingItem?.title,
                variantTitle: existingItem?.variantTitle,
                selectedOptions: existingItem?.selectedOptions,
                price: existingItem?.price,
                basePrice: existingItem?.basePrice,
                memberPrice: existingItem?.memberPrice,
                currencyCode: existingItem?.currencyCode,
                image: existingItem?.image,
                handle: existingItem?.handle,
                metafields: existingItem?.metafields,
                quantityAvailable: existingItem?.quantityAvailable,
              };
            }
          );
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
    const existing = cartItems.find((item) => item.variantId === variantId);
    const maxQty = meta.quantityAvailable ?? existing?.quantityAvailable ?? Infinity;
    if (maxQty <= 0) {
      showToast('More coming soon.');
      return;
    }
    const desiredQty = existing ? existing.quantity + quantity : quantity;
    if (desiredQty > maxQty && maxQty !== Infinity) {
      showToast(`More coming soon 😉`);
    }
    const finalQty = Math.min(desiredQty, maxQty);
    const updatedItems = existing
      ? cartItems.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: finalQty, quantityAvailable: maxQty }
            : item
        )
      : [{ variantId, quantity: finalQty, ...meta }, ...cartItems];

    setCartItems(updatedItems);
    
    // Open drawer immediately for better UX
    openDrawer();

    // ✅ Add to favourites silently
    if (meta.handle && !isFavourite(meta.handle)) {
      addFavourite({
        handle: meta.handle,
        title: meta.title || '',
        image: meta.image,
        price: meta.price,
        metafields: meta.metafields,
      });
    }

    scheduleSync(updatedItems);
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
        draftCheckoutUrl,
        draftStatus,
        draftSignature,
        addToCart,
        updateQuantity,
        removeFromCart,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        flushSync,
        ensureVipDraftCheckout,
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
