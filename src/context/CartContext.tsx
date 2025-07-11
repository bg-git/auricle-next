import { createContext, useContext, useState, ReactNode } from 'react';

interface CartItem {
  variantId: string;
  quantity: number;
  title: string;
  price: string;
  image?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  checkoutUrl: string | null;
  addToCart: (variantId: string, quantity: number, meta: { title: string; price: string; image?: string }) => void;
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

  const addToCart = async (
    variantId: string,
    quantity: number,
    meta: { title: string; price: string; image?: string }
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

    const response = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: updatedItems.map(({ variantId, quantity }) => ({ variantId, quantity })),
      }),
    });

    const data = await response.json();
    setCheckoutUrl(data.checkoutUrl);
  };

  return (
    <CartContext.Provider
      value={{ cartItems, checkoutUrl, addToCart, isDrawerOpen, openDrawer, closeDrawer }}
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
