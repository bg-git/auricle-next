import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext<any>(null);

export const CartProvider = ({ children }: any) => {
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const addToCart = async (variantId: string, quantity: number = 1) => {
    let cart;

    if (!cartId) {
      const res = await fetch('/api/cart/create', { method: 'POST' });
      cart = await res.json();
      setCartId(cart.id);
    }

    const res = await fetch('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({
        cartId: cartId || cart.id,
        lines: [{ merchandiseId: variantId, quantity }],
      }),
    });

    const updatedCart = await res.json();
    setCartItems(updatedCart.lines.edges);
    setCartId(updatedCart.id);
    setIsOpen(true);
  };

  return (
    <CartContext.Provider value={{ cartId, cartItems, addToCart, isOpen, setIsOpen }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
