import Link from 'next/link';
import Seo from '@/components/Seo';
import type { CSSProperties } from 'react';

const linkStyle: CSSProperties = {
  display: 'block',
  background: '#181818',
  color: '#fff',
  padding: '10px 16px',
  textDecoration: 'none',
  fontWeight: 600,
};

const secondaryStyle: CSSProperties = {
  ...linkStyle,
  background: 'transparent',
  color: '#181818',
  border: '1px solid #181818',
};

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page Not Found" />
      <div
        className="page-content"
        style={{ textAlign: 'center', padding: '80px 16px' }}
      >
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
          404 – Page Not Found
        </h1>
        <p style={{ marginBottom: '24px' }}>
          Sorry, the page you are looking for doesn&apos;t exist.
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '320px',
            margin: '0 auto',
          }}
        >
          <Link href="/collection/ends-gems" style={linkStyle}>
            Shop Ends &amp; Gems &#x27F6;
          </Link>
          <Link href="/collection/chains-charms" style={linkStyle}>
            Shop Chains &amp; Charms &#x27F6;
          </Link>
          <Link href="/collection/backs-bars" style={linkStyle}>
            Shop Backs &amp; Bars &#x27F6;
          </Link>
          <Link href="/collection/rings-hoops" style={linkStyle}>
            Shop Rings &amp; Hoops &#x27F6;
          </Link>
          <Link href="/" style={secondaryStyle}>
            Back to Home
          </Link>
        </div>
      </div>
    </>
  );
}
