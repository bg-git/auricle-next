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

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page Not Found" />
      <div
        className="page-content"
        style={{ textAlign: 'center', padding: '80px 16px' }}
      >
        <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
          Aw Jeez it looks like this page has been moved
        </h1>
        <p style={{ marginBottom: '24px' }}>
          We can help you get back to the good stuff.
        </p>
        <Link href="/" style={linkStyle}>
          Click here for some eye candy happiness
        </Link>
      </div>
    </>
  );
}
