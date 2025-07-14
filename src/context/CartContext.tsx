import { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  variantId: string;
  quantity: number;
  title?: string;
  price?: string;
  image?: string;
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

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  const addToCart = (
    variantId: string,
    quantity: number,
    meta: Omit<CartItem, 'variantId' | 'quantity'> = {}
  ) => {
    const existing = cartItems.find((item) => item.variantId === variantId);
    const updatedItems = existing
      ? cartItems.map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      : [...cartItems, { variantId, quantity, ...meta }];

    setCartItems(updatedItems);
    openDrawer();

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
    const updated = cartItems
      .map((item) =>
        item.variantId === variantId ? { ...item, quantity: newQty } : item
      )
      .filter((item) => item.quantity > 0);

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
