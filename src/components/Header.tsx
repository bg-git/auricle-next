import Link from 'next/link';
import Image from 'next/image';
import { memo } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useFavourites } from '@/context/FavouritesContext';


function Header() {
  const { openDrawer, cartItems } = useCart();
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
const { favourites } = useFavourites();

  return (
    <>
      {/* Top grey bar */}
      <header
        style={{
          width: '100%',
          background: '#181818',
          borderTop: '1px solid #fff',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            fontSize: '12px',
            color: '#fff',
          }}
        >
          {!loading && (
            isAuthenticated ? (
              <>
                <Link href="/account" style={{ color: '#fff', textDecoration: 'none', marginRight: '12px' }}>
                  {user?.firstName ? 'My Account' : 'My Account'}


                </Link>
                <span style={{ marginRight: '12px' }}>|</span>
                <button 
                  onClick={signOut}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: '#fff', 
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: 0
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
  href={`mailto:info@auricle.co.uk?subject=${encodeURIComponent(
    'Wholesale Enquiry'
  )}&body=${encodeURIComponent(
    `Hey,
    
Thank you for your interest in becoming an authorised AURICLE stockist.

To ensure access is reserved exclusively for verified piercing studios and jewellery retailers, please complete the details below. This helps us confirm eligibility and activate your wholesale account as quickly as possible.

First Name = 

Last Name = 

Company Name = 

Email Address = 

Trading Address = 

Website = 

Social Media = 

Phone Number =

Once we’ve confirmed your business details, we’ll respond to this email with your access credentials. Verification is usually completed within one hour.

Best Regards
Auricle`
  )}`}
  style={{ color: '#fff', textDecoration: 'none', marginRight: '12px' }}
>
  Join Us
</Link>

                <span style={{ marginRight: '12px' }}>|</span>
                <Link href="/sign-in" style={{ color: '#fff', textDecoration: 'none' }}>
                  Sign In
                </Link>
              </>
            )
          )}
        </div>
      </header>

      {/* Main white bar */}
      <div
        style={{
          width: '100%',
          background: '#ffffff',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #ececec',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="/auricle-logo.png"
              alt="AURICLE's Ram skull logo"
              width={60}
              height={40}
              priority
              style={{ verticalAlign: 'middle', display: 'block' }}
            />
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
  <Link
    href="/favourites"
    aria-label="My Favourites"
    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={favourites.length > 0 ? 'red' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      width="24"
      height="24"
      style={{ display: 'block' }}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21c-1.1-1.04-5.55-5.08-7.62-7.51C2.64 11.21 2 9.66 2 8.25 2 5.4 4.4 3 7.25 3c1.49 0 2.94.68 3.75 1.75A5.48 5.48 0 0116.75 3C19.6 3 22 5.4 22 8.25c0 1.41-.64 2.96-2.38 5.24C17.55 15.92 13.1 19.96 12 21z"
      />
    </svg>
  </Link>

  <button
    onClick={openDrawer}
    style={{
      background: 'none',
      border: 'none',
      padding: 0,
      margin: 0,
      fontSize: '14px',
      fontWeight: 500,
      color: '#181818',
      cursor: 'pointer',
      textDecoration: 'none',
    }}
  >
    My Bag{itemCount > 0 ? ` (${itemCount})` : ''}
  </button>
</div>

        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          width: '100%',
          background: '#f9f9f9',
          borderBottom: '1px solid #ececec',
          overflowX: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 16px',
            whiteSpace: 'nowrap',
          }}
        >
          {[
  { label: 'ENDS & GEMS', href: '/collection/ends-gems' },
  { label: 'CHAINS & CHARMS', href: '/collection/chains-charms' },
  { label: 'RINGS & HOOPS', href: '/collection/rings-hoops' },
  { label: 'SEARCH', href: '/search' },

].map(({ label, href }) => (
  <Link
    key={label}
    href={href}
    style={{
      padding: '16px 12px',
      fontSize: '16px',
      color: '#181818',
      fontWeight: '600',
      textDecoration: 'none',
      flexShrink: 0,
    }}
  >
    {label}
  </Link>
))}

        </div>
      </nav>
    </>
  );
}

export default memo(Header);

