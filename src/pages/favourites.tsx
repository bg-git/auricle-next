import { useFavourites } from '@/context/FavouritesContext';
import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';

export default function FavouritesPage() {
  const { favourites } = useFavourites();

  return (
    <>
      <Seo title="My Favourites | AURICLE" />

      <div className="collection-page">
        <div className="filters-desktop" /> {/* Empty sidebar to preserve layout */}

        <section className="product-grid">
          <div style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
            <h1 style={{ fontSize: '30px', fontWeight: 900 }}>My Favourites</h1>
            {favourites.length === 0 && (
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                You haven’t added any favourites yet.
              </p>
            )}
          </div>

          {favourites.map((item) => (
            <Link href={`/product/${item.id}`} key={item.id} className="product-card">
              <div className="product-card-inner">
                <div className="product-image-wrapper">
                  <Image
                    src={item.image || '/placeholder.png'}
                    alt={item.title}
                    width={1200}
                    height={1500}
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
      </div>
    </>
  );
}
