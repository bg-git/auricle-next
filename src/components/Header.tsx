import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { openDrawer, cartItems } = useCart();
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Top grey bar */}
      <header
        style={{
          width: '100%',
          background: '#181818',
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
                  {user?.firstName ? `Hi, ${user.firstName}` : 'My Account'}
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
                <Link href="/register" style={{ color: '#fff', textDecoration: 'none', marginRight: '12px' }}>
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

          {/* My Bag button */}
          <button
            onClick={openDrawer}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              fontSize: '14px',
              fontWeight: 500,
              color: '#000',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            My Bag{itemCount > 0 ? ` (${itemCount})` : ''}
          </button>
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
          {['ENDS & GEMS', 'CHAINS & CHARMS', 'BASICS', 'BASE', 'RINGS'].map((label) => (
            <Link
              key={label}
              href={`/collection/${label.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-')}`}
              style={{
                padding: '16px 12px',
                fontSize: '16px',
                color: '#000',
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
