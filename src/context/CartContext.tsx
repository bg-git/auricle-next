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

export interface CartItem {
  variantId: string;
  quantity: number;
  title?: string;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const ITEMS_KEY = 'auricle-cart-items';
const CHECKOUT_ID_KEY = 'auricle-checkout-id';

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const syncTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingSync = useRef<Promise<void> | null>(null);

  const { addFavourite, isFavourite } = useFavourites();
  const { showToast } = useToast();

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const scheduleSync = (items: CartItem[]) => {
    if (syncTimeout.current) {
      clearTimeout(syncTimeout.current);
    }
    syncTimeout.current = setTimeout(() => {
      pendingSync.current = syncShopifyCheckout(items).finally(() => {
        pendingSync.current = null;
      });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
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
          if (!cart || cart.status !== 'ACTIVE') {
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
              })
              .catch(() => {
                setCheckoutId(null);
                setCheckoutUrl(null);
              });
            return;
          }

          const items = (cart.lines.edges || []).map((edge: any) => ({
            variantId: edge.node.merchandise.id,
            quantity: edge.node.quantity,
          }));
          setCartItems(items);
          setCheckoutUrl(cart.checkoutUrl);
        })
        .catch(() => {
          setCheckoutId(null);
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

  const syncShopifyCheckout = async (items: CartItem[]) => {
    if (items.length === 0) {
      setCheckoutUrl(null);
      setCheckoutId(null);
      return;
    }

    try {
      if (!checkoutId) {
        const res = await fetch('/api/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
          credentials: 'include',
        });
        const data = await res.json();
        setCheckoutUrl(data.checkoutUrl);
        setCheckoutId(data.checkoutId);
      } else {
        const res = await fetch('/api/update-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutId, items }),
          credentials: 'include',
        });
        const data = await res.json();
        if (data.completed) {
          setCartItems([]);
          setCheckoutId(null);
          setCheckoutUrl(null);
          return;
        }
        const cart = data.cart;
        if (cart) {
          const updated = (cart.lines.edges || []).map((edge: any) => ({
            variantId: edge.node.merchandise.id,
            quantity: edge.node.quantity,
          }));
          setCartItems(updated);
          setCheckoutUrl(cart.checkoutUrl);
        }
      }
    } catch (err) {
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
      : [...cartItems, { variantId, quantity: finalQty, ...meta }];

    setCartItems(updatedItems);
    if (meta?.handle) {
  addFavourite({
    handle: meta.handle,
    title: meta.title || '',
    image: meta.image,
    price: meta.price,
    metafields: meta.metafields,
  });
}

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
        addToCart,
        updateQuantity,
        removeFromCart,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
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
