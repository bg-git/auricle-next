import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import Image from 'next/image';

export default function CartDrawer() {
  const { cartItems, checkoutUrl, isDrawerOpen, closeDrawer } = useCart();

  return (
    <div className={`cart-drawer ${isDrawerOpen ? 'open' : ''}`}>
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
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={60}
                      height={60}
                      className="cart-item-image"
                    />
                  )}
                  <div>
                    <div className="cart-item-title">{item.title}</div>
                    <div className="cart-item-meta">
                      {item.quantity} × £{item.price}
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
  );
}
