import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';

export default function CartDrawer() {
  const {
    cartItems,
    checkoutUrl,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    removeFromCart,
  } = useCart();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeDrawer]);

  if (!isDrawerOpen) return null;

  return (
    <div className="cart-backdrop" onClick={closeDrawer}>
      <div
        className="cart-drawer open"
        onClick={(e) => e.stopPropagation()} // prevent click from bubbling up
      >
        <div className="cart-drawer-inner">
          <div className="cart-header">
            <h2>Bag</h2>
            <button onClick={closeDrawer}>&times;</button>
          </div>

          {cartItems.length === 0 ? (
            <p className="empty-message">Your cart is empty.</p>
          ) : (
            <ul className="cart-items">
              {cartItems.map((item) => (
                <li key={item.variantId} className="cart-item">
                  <div className="cart-item-content">
                    {item.image && (
  <div className="cart-item-image-wrapper">
    <Image
      src={item.image}
      alt={item.title || ''}
      fill
    />
  </div>
)}

                    <div className="cart-item-details">
                      <div className="cart-item-title">
                        {item.title || 'Untitled Product'}
                      </div>
                      <div className="cart-item-controls">
                        <div className="quantity-controls">
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <div className="cart-price">£{item.price}</div>
                        <button
                          className="cart-remove"
                          onClick={() => removeFromCart(item.variantId)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {checkoutUrl && (
            <Link href={checkoutUrl} className="checkout-button">
              Checkout
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
