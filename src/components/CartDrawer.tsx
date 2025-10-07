import { useCart } from '@/context/CartContext';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useFavourites } from '@/context/FavouritesContext';

const formatPrice = (price: string | undefined) => {
  const num = parseFloat(price || '0');
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

const displayTitle = (title?: string, variantTitle?: string) => {
  const t = (s?: string) => (s || '').trim();
  const isDefault = (s?: string) => /^default\s*title$/i.test(s || '');
  const base = t(title);
  const variant = t(variantTitle);
  if (!variant || isDefault(variant) || variant.toLowerCase() === base.toLowerCase()) {
    return base || 'Untitled Product';
  }
  return `${base} | ${variant}`;
};

const unregisterServiceWorkersForCheckout = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        try {
          const scope = registration.scope;
          const isSameOrigin = !scope || scope.startsWith(window.location.origin);

          if (isSameOrigin) {
            const unregistered = await registration.unregister();

            if (!unregistered) {
              console.warn(
                'Service worker registration returned false when unregistering before checkout; continuing anyway.',
                { scope }
              );
            }
          }
        } catch (error) {
          console.warn(
            'Error while unregistering a service worker before checkout; continuing to Shopify checkout.',
            { scope: registration.scope, error }
          );
        }
      })
    );
  } catch (error) {
    console.warn(
      'Failed to list service worker registrations before checkout; continuing to Shopify checkout.',
      error
    );
  }
};

export default function CartDrawer() {
  const {
    cartItems,
    checkoutUrl,
    isDrawerOpen,
    closeDrawer,
    updateQuantity,
    flushSync,
  } = useCart();

  const { addFavourite } = useFavourites();

  const [isCheckingOut, setIsCheckingOut] = useState(false);


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
  <div
  className={`cart-backdrop${isDrawerOpen ? ' open' : ''}`}
  onMouseDown={(e) => {
    if (e.target === e.currentTarget) {
      closeDrawer()
    }
  }}
>

      <div
        className={`cart-drawer${isDrawerOpen ? ' open' : ''}`}
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
               {cartItems.map((item) => (
                <li key={item.variantId} className="cart-item-overlay">
                  <div className="cart-image-full">
                    {item.image && (
                      <Image
                        src={item.image}
                        alt={displayTitle(item.title, item.variantTitle)}
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
                        {displayTitle(item.title, item.variantTitle)}
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
            className={`checkout-button ${
              checkoutUrl && !isCheckingOut ? '' : 'disabled'
            }`}
            href={checkoutUrl || '#'}
            onClick={async (e) => {
              e.preventDefault();
              if (isCheckingOut) return;
              setIsCheckingOut(true);
              const url = await flushSync();
              setIsCheckingOut(false);
              if (!url) return;

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
              try {
                await unregisterServiceWorkersForCheckout();
              } catch (error) {
                console.warn(
                  'Unexpected error while preparing checkout; continuing to Shopify checkout.',
                  error
                );
              }
              window.location.href = url;
            }}
          >
            {isCheckingOut ? 'LOADING…' : 'CHECKOUT'}
          </a>


          <p
  style={{
    fontSize: '12px',
    color: '#595959',
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
