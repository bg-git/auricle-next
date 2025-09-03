// src/components/ProductGallery.tsx
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

export type GalleryImage = {
  url: string;
  width: number;
  height: number;
  alt?: string | null;
  isUGC?: boolean;
  credit?: string; // name from metaobject
};

/** Only render the gallery variant for the current viewport */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)");
    const onChange = () => setIsDesktop(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const isDesktop = useIsDesktop();

  const safeImages = useMemo(() => (images || []).filter(Boolean), [images]);
  if (!safeImages.length) return null;

  const main = safeImages[Math.min(active, safeImages.length - 1)];

  return (
    <div>
      {isDesktop ? (
        /* DESKTOP: main image + overlayed thumbnail strip (bottom-left) */
        <div className="gallery-desktop">
          <div className="img-wrap">
            {main.isUGC && (
              <div className="badges">
                <span className="badge-ugc">Styled by you</span>
                {main.credit && (
                  <span className="badge-credit">Image provided by {main.credit}</span>
                )}
              </div>
            )}

            <Image
  key={main.url}
  src={main.url}
  alt={main.alt || ""}
  width={main.width}
  height={main.height}
  priority={active === 0}
  fetchPriority="high"
  sizes="(min-width:1024px) calc((min(1400px,100vw) - 32px - 24px)/2), 100vw"
  style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
/>


            {safeImages.length > 1 && (
              <div
                className="thumbs-overlay"
                role="group" /* simpler ARIA; avoids tablist requirements */
                aria-label="Product thumbnails"
              >
                {safeImages.map((img, i) => (
                  <button
                    key={img.url + i}
                    aria-label={`Show image ${i + 1}`}
                    className={`thumb ${i === active ? "is-active" : ""}`}
                    onClick={() => setActive(i)}
                    type="button"
                  >
                    <div className="thumb-frame">
                      {/* No labels on thumbnails */}
                      <Image
                        src={img.url}
                        alt=""
                        width={60}
                        height={75}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        sizes="60px"
                        quality={40} 
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MOBILE: swipe-only (scroll-snap), no thumbnails */
        <div className="gallery-mobile" aria-label="Product images">
          <div className="snap-row">
            {safeImages.map((img, i) => (
              <div className="snap-card" key={img.url + i}>
                {img.isUGC && (
                  <div className="badges">
                    <span className="badge-ugc">Styled by you</span>
                    {img.credit && (
                      <span className="badge-credit">Image provided by {img.credit}</span>
                    )}
                  </div>
                )}
                <Image
  src={img.url}
  alt={img.alt || ""}
  width={img.width}
  height={img.height}
  priority={i === 0}
  fetchPriority={i === 0 ? "high" : "low"}
  loading={i === 0 ? undefined : "lazy"}
  decoding="async"
  sizes="100vw"
  style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
/>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .img-wrap { position: relative; width: 100%; }

        /* Stacked badges (top-left) */
        .badges {
          position: absolute;
          left: 8px;
          top: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          z-index: 2;
          pointer-events: none;
        }
        .badge-ugc,
        .badge-credit {
          display: inline-block;
          background: #181818;
          color: #fff;
          border: 1px solid #181818;
          font-size: 11px;
          line-height: 1;
          padding: 6px 8px;
          white-space: nowrap;
          max-width: 90%;
          overflow: hidden;
          max-width: max-content;
        }

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
          z-index: 1;
        }
        .thumb { border: 0; padding: 0; background: transparent; cursor: pointer; }
        .thumb-frame {
          position: relative;
          width: 60px; height: 75px; /* 4:5 */
          overflow: hidden;
          border: 1px solid #e5e5e5;
        }
        .thumb.is-active .thumb-frame { outline: 2px solid #181818; outline-offset: -2px; }

        /* Mobile swipe-only */
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
      `}</style>
    </div>
  );
}
