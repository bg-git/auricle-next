import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
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
          <Link href="/join" style={{ color: '#fff', textDecoration: 'none', marginRight: '12px' }}>
            Join Us
          </Link>
          <span style={{ marginRight: '12px' }}>|</span>
          <Link href="/signin" style={{ color: '#fff', textDecoration: 'none' }}>
            Sign In
          </Link>
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
          {/* Logo (left) */}
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


          {/* Shopping bag (right) */}
         
<Link
  href="/cart"
  style={{
    display: 'block',
    color: '#000',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  }}
>
  My Bag
</Link>



        </div>

      </div>
      {/* Horizontal nav menu */}
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
