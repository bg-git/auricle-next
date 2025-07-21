import { useFavourites } from '@/context/FavouritesContext';
import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';

export default function FavouritesPage() {
  const { favourites } = useFavourites();

  return (
    <>
      <Seo title="My Favourites | AURICLE" />

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 900 }}>My Favourites</h1>
        {favourites.length === 0 && (
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            You haven’t added any favourites yet.
          </p>
        )}
      </div>

      <main className="collection-page">
        <aside className="filters-desktop" /> {/* Empty sidebar to preserve layout */}

        <section className="product-grid">
          {favourites.map((item) => (
            <Link href={`/product/${item.id}`} key={item.id} className="product-card">
              <div className="product-card-inner">
                <div className="product-image-wrapper">
                  <Image
                    src={item.image || '/placeholder.png'}
                    alt={item.title}
                    width={1200}
                    height={1500}
                    style={{ objectFit: 'cover', width: '100%', height: 'auto', display: 'block' }}
                    sizes="(min-width: 1400px) 350px, (min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                  />
                </div>

                <h3>{item.title}</h3>

                {item.price && (
                  <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                    £{parseFloat(item.price).toFixed(2)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
