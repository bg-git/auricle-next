import { createContext, useContext, useState, ReactNode } from 'react';
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

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { addFavourite, isFavourite } = useFavourites();
  const { showToast } = useToast();

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const addToCart = (
    variantId: string,
    quantity: number,
    meta: Omit<CartItem, 'variantId' | 'quantity'> = {}
  ) => {
    const existing = cartItems.find((item) => item.variantId === variantId);
    const maxQty = meta.quantityAvailable ?? existing?.quantityAvailable ?? Infinity;
    const desiredQty = existing ? existing.quantity + quantity : quantity;
    if (desiredQty > maxQty && maxQty !== Infinity) {
      showToast(`We only have ${maxQty} available. Take them all while you can.`);
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

    fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: updatedItems }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCheckoutUrl(data.checkoutUrl);
      })
      .catch((err) => {
        console.error('Checkout error:', err);
      });
  };

  const updateQuantity = (variantId: string, newQty: number) => {
    const item = cartItems.find((i) => i.variantId === variantId);
    if (!item) return;
    const maxQty = item.quantityAvailable ?? Infinity;
    if (newQty > maxQty && maxQty !== Infinity) {
      showToast(`We only have ${maxQty} available. Take them all while you can.`);
      return;
    }
    const updated = cartItems
      .map((i) =>
        i.variantId === variantId ? { ...i, quantity: newQty } : i
      )
      .filter((i) => i.quantity > 0);

    setCartItems(updated);
  };

  const removeFromCart = (variantId: string) => {
    const updated = cartItems.filter((item) => item.variantId !== variantId);
    setCartItems(updated);
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
