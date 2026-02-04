import Link from 'next/link';
import Image from 'next/image';
import { memo, useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useFavourites } from '@/context/FavouritesContext';
import RegisterModal from '@/components/RegisterModal';

// Shared register email text
const wholesaleMailto = `mailto:info@auricle.co.uk?subject=${encodeURIComponent(
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
)}`;

// WhatsApp details
const whatsappNumber = '447757690863';

const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  `Hey,

Thank you for your interest in becoming an authorised AURICLE stockist.

To ensure access is reserved exclusively for verified piercing studios and jewellery retailers, please complete the details below and send them in this chat:

First Name = 
Last Name = 
Company Name = 
Email Address = 
Trading Address = 
Website = 
Social Media = 
Phone Number = 

Once we’ve confirmed your business details, we’ll respond via email or WhatsApp with your access credentials. Verification is usually completed within one hour.

Best Regards
Auricle`
)}`;

function Header() {
  const { openDrawer, cartItems } = useCart();
  const { isAuthenticated, user, signOut, loading } = useAuth();
  const { favourites } = useFavourites();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // prevent hydration mismatch
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  // ------------------------------
  // TAG LOGIC (ONLY SOURCE OF TRUTH)
  // ------------------------------
  const tags = Array.isArray(user?.tags) ? user!.tags.map((t) => t.toLowerCase()) : [];

  const isApproved = tags.includes('approved');
  const isVipMember = tags.includes('vip-member');

  // ✅ Use hasMounted so SSR/CSR trees match for the banner
  const showVipMemberBanner = isVipMember;
  const showVipPricingBanner =
    hasMounted && !loading && !showVipMemberBanner && isApproved;

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
            position: 'relative', // 🔑 allows VIP label overlay
          }}
        >
          {/* 🔹 VIP MEMBER label on the far left, only when tagged VIP-MEMBER */}
          {hasMounted && isVipMember && (
            <span
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                letterSpacing: '0.08em',
              }}
            >
              VIP MEMBER
            </span>
          )}

          {hasMounted && !loading && (
            isAuthenticated ? (
              <>
                <Link
                  href="/account"
                  style={{
                    color: '#fff',
                    textDecoration: 'none',
                    marginRight: '12px',
                  }}
                >
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
                    padding: 0,
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    marginRight: '12px',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Join Us
                </button>

                <span style={{ marginRight: '12px' }}>|</span>

                <Link
                  href="/sign-in"
                  style={{ color: '#fff', textDecoration: 'none' }}
                >
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
            { label: 'ESSENTIALS', href: '/collection/essentials' },
            { label: 'ENDS & GEMS', href: '/collection/ends-gems' },
            { label: 'CHAINS & CHARMS', href: '/collection/chains-charms' },
            { label: 'RINGS & HOOPS', href: '/collection/rings-hoops' },
            { label: 'DISPLAYS & STANDS', href: '/collection/displays-stands' },
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {label}
              {label === 'SEARCH' && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                  style={{ display: 'block' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* ================================
          VIP BANNERS
      ================================ */}

      {/* 1️⃣ VIP MEMBER BANNER — REMOVED as requested */}

      {/* 2️⃣ APPROVED (BUT NOT VIP) — FULL BANNER CLICKABLE */}
      {showVipPricingBanner && (
        <Link
          href="/vip-membership"
          style={{
            width: '100%',
            background: '#b00020',
            display: 'block',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              maxWidth: '1400px',
              margin: '0 auto',
              padding: '8px 16px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500,
              gap: '8px',
            }}
          >
            <span>Get exclusive VIP pricing</span>
            <span aria-hidden="true">→</span>
          </div>
        </Link>
      )}

      {/* MODAL */}
      <RegisterModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        whatsappLink={whatsappLink}
        emailHref={wholesaleMailto}
      />
    </>
  );
}

export default memo(Header);
