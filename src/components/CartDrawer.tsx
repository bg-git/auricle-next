import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { useEffect } from 'react';

export default function CartDrawer() {
  const {
    cartItems,
    checkoutUrl,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
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
                <li key={item.variantId} className="cart-item-overlay">
  <div className="cart-image-full">
    {item.image && (
      <Image
        src={item.image}
        alt={item.title || ''}
        width={600}
        height={750}
        style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
      />
    )}

    <div className="cart-image-overlay">
      <div className="overlay-title">{item.title || 'Untitled Product'}</div>
      <div className="overlay-controls">
        <div className="quantity-controls">
          <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>−</button>
          <span>{item.quantity}</span>
          <button onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>+</button>
        </div>
        <div className="cart-price">£{item.price}</div>
      </div>
    </div>
  </div>
</li>

              ))}
            </ul>
          )}
{cartItems.length > 0 && (
  <div className="cart-subtotal">
    Subtotal: £
    {cartItems
      .reduce((sum, item) => sum + (parseFloat(item.price || '0') * item.quantity), 0)
      .toFixed(2)}
    
  </div>
)}

          <a
  className={`checkout-button ${checkoutUrl ? '' : 'disabled'}`}
  href={checkoutUrl || '#'}
  onClick={(e) => {
    if (!checkoutUrl) e.preventDefault();
  }}
>
  CHECKOUT
</a>

        </div>
      </div>
    </div>
  );
}
