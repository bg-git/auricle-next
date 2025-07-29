import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { useEffect } from 'react';
import { useFavourites } from '@/context/FavouritesContext';

const formatPrice = (price: string | undefined) => {
  const num = parseFloat(price || '0');
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

export default function CartDrawer() {
  const {
    cartItems,
    checkoutUrl,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
  } = useCart();

  const { addFavourite } = useFavourites();


  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };

    if (isDrawerOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDrawerOpen, closeDrawer]);

  return (
    <div className="cart-backdrop">
      <div
        className="cart-drawer open"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cart-drawer-inner">
          <div className="cart-header">
            <h2 id="cart-drawer-title">MY BAG</h2>
            <button onClick={closeDrawer}>&times;</button>
          </div>

          {cartItems.length === 0 ? (
            <p className="empty-message">Your cart is empty.</p>
          ) : (
            <ul className="cart-items">
               {[...cartItems].reverse().map((item) => (
                <li key={item.variantId} className="cart-item-overlay">
                  <div className="cart-image-full">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={item.title || ''}
                        width={600}
                        height={750}
                        style={{
                          objectFit: 'cover',
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                        }}
                      />
                    )}

                    <div className="cart-image-overlay">
                      <div className="overlay-title">
                        {item.title || 'Untitled Product'}
                      </div>
                      <div className="overlay-controls">
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
                        <div className="cart-price">£{formatPrice(item.price)}</div>

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
  {formatPrice(
    cartItems
      .reduce(
        (sum, item) => sum + parseFloat(item.price || '0') * item.quantity,
        0
      )
      .toString()
  )}
</div>

          )}

          <a
  className={`checkout-button ${checkoutUrl ? '' : 'disabled'}`}
  href={checkoutUrl || '#'}
  onClick={(e) => {
    if (!checkoutUrl) {
      e.preventDefault();
      return;
    }

    cartItems.forEach((item) => {
      if (item.handle) {
        addFavourite({
          handle: item.handle,
          title: item.title || '',
          image: item.image,
          price: item.price,
          metafields: item.metafields,
          orderAgain: true, // ✅ This sets the flag
        });
      }
    });
  }}
>
  CHECKOUT
</a>


          <p
  style={{
    fontSize: '12px',
    color: '#888',
    marginTop: '8px',
    marginBottom: '16px',
    textAlign: 'right',
  }}
>
  VAT & shipping calculated at checkout
</p>
        </div>
      </div>
    </div>
  );
}
