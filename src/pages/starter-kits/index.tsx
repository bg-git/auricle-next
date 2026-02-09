import type { NextPage } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';
import { STARTER_KITS } from '@/lib/starter-kits-config';

const StarterKitsPage: NextPage = () => {
  return (
    <>
      <Seo
        title="Starter Kits | AURICLE"
        description="Discover our curated starter kits. Each kit includes a selection of premium jewellery pieces and a stand. Choose from Gold Titanium, Polished Ti, White Gold, or Yellow Gold."
        canonical="https://www.auricle.co.uk/starter-kits"
      />

      <main style={{ maxWidth: '870px', margin: '0 auto', padding: '16px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 900, marginBottom: '8px', textTransform: 'uppercase' }}>STARTER KITS</h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '32px' }}>
          Curated collections of premium jewellery pieces with stand included. Perfect for building your collection fast with our best selling items.
        </p>

        {/* Note about pricing */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          padding: '16px',
          marginBottom: '32px',
          fontSize: '13px',
          color: '#666',
          lineHeight: '1.6'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Starter kits are dynamically updated</strong> with our best-selling pieces, so kit contents and prices change regularly. Each time you browse, you&apos;ll find the most popular items from that metal range. This ensures you always get what your customers love most.
          </p>
        </div>

        {/* Grid of starter kits */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginTop: '32px',
          }}
        >
          {STARTER_KITS.map((kit) => (
            <Link href={`/starter-kits/${kit.slug}`} key={kit.slug} legacyBehavior>
              <a
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '125%', // 1500/1200 = 1.25
                    backgroundColor: '#f5f5f5',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    borderRadius: '4px',
                  }}
                >
                  {kit.image ? (
                    <Image
                      src={kit.image}
                      alt={kit.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      priority={STARTER_KITS.indexOf(kit) < 2}
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#999',
                      }}
                    >
                      No Image
                    </div>
                  )}
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>{kit.title}</h2>
                <p style={{ fontSize: '13px', color: '#666', lineHeight: '1.5', flex: 1 }}>
                  {kit.description}
                </p>
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 16px',
                    backgroundColor: '#181818',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '4px',
                  }}
                >
                  View Kit
                </div>
              </a>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
};

export default StarterKitsPage;
