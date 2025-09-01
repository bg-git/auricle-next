// src/components/ProductGallery.tsx
import Image from "next/image";
import { useMemo, useState } from "react";

export type GalleryImage = {
  url: string;
  width: number;
  height: number;
  alt?: string | null;
  isUGC?: boolean;
  credit?: string; // name from metaobject
};

export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const safeImages = useMemo(() => (images || []).filter(Boolean), [images]);
  if (!safeImages.length) return null;

  const main = safeImages[Math.min(active, safeImages.length - 1)];
  const mainBadgeText =
    main.isUGC && main.credit ? `Image provided by ${main.credit}` : null;

  return (
    <div>
      {/* Desktop: main image + overlayed thumbnail strip (bottom-left) */}
      <div className="gallery-desktop">
        <div className="img-wrap">
          {mainBadgeText && <span className="badge-ugc">{mainBadgeText}</span>}

          <Image
            key={main.url}
            src={main.url}
            alt={main.alt || ""}
            width={main.width}
            height={main.height}
            priority={active === 0}
            sizes="(min-width: 1400px) 600px, (min-width: 1024px) 50vw, 100vw"
            style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
          />

          {safeImages.length > 1 && (
            <div className="thumbs-overlay" role="tablist" aria-label="Product thumbnails">
              {safeImages.map((img, i) => (
                <button
                  key={img.url + i}
                  aria-label={`Show image ${i + 1}`}
                  className={`thumb ${i === active ? "is-active" : ""}`}
                  onClick={() => setActive(i)}
                  type="button"
                >
                  <div className="thumb-frame">
                    {/* No label on thumbnails */}
                    <Image
                      src={img.url}
                      alt=""
                      width={60}
                      height={75}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: swipe-only (scroll-snap), no thumbnails */}
      <div className="gallery-mobile" aria-label="Product images">
        <div className="snap-row">
          {safeImages.map((img, i) => {
            const badgeText =
              img.isUGC && img.credit ? `Image provided by ${img.credit}` : null;
            return (
              <div className="snap-card" key={img.url + i}>
                {badgeText && <span className="badge-ugc">{badgeText}</span>}
                <Image
                  src={img.url}
                  alt={img.alt || ""}
                  width={img.width}
                  height={img.height}
                  priority={i === 0}
                  loading={i === 0 ? undefined : "lazy"}
                  decoding="async"
                  sizes="100vw"
                  style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .img-wrap { position: relative; width: 100%; aspect-ratio: 4 / 5; }

        /* Overlayed horizontal thumbs on the LEFT (desktop) */
        .thumbs-overlay {
          position: absolute;
          left: 12px;
          bottom: 12px;
          display: flex;
          gap: 8px;
          padding: 6px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
        }

        .thumb { border: 0; padding: 0; background: transparent; cursor: pointer; }
        .thumb-frame {
          position: relative;
          width: 60px; height: 75px; /* 4:5 */
          overflow: hidden;
          border: 1px solid #e5e5e5;
        }
        .thumb.is-active .thumb-frame { outline: 2px solid #181818; outline-offset: -2px; }

        /* Badge on main image (desktop & mobile UGC) */
        .badge-ugc {
          position: absolute;
          left: 8px; top: 8px;
          background: #181818; color: #fff; border: 1px solid #181818;
          font-size: 11px; line-height: 1; padding: 6px 8px;
          white-space: nowrap; max-width: 90%;
          overflow: hidden; text-overflow: ellipsis;
        }

        /* Mobile swipe-only */
        .gallery-mobile { display: none; }
        .snap-row {
          display: flex; overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          gap: 8px;
        }
        .snap-card {
          min-width: 100%;
          scroll-snap-align: start;
          aspect-ratio: 4 / 5;
          position: relative;
        }

        @media (max-width: 768px) {
          .gallery-desktop { display: none; }
          .gallery-mobile { display: block; }
        }
      `}</style>
    </div>
  );
}
