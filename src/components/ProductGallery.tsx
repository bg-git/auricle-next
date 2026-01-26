// src/components/ProductGallery.tsx
import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";

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

export default function ProductGallery({
  images,
  defaultActive = 0,
}: {
  images: GalleryImage[];
  defaultActive?: number;
}) {
  const [active, setActive] = useState(defaultActive);
  const [heroIndex, setHeroIndex] = useState(defaultActive);
  const isDesktop = useIsDesktop();
  const snapRowRef = useRef<HTMLDivElement | null>(null);

  const safeImages = useMemo(() => (images || []).filter(Boolean), [images]);

  // Keep active in sync if images or requested default changes
  useEffect(() => {
    setActive(defaultActive);
    setHeroIndex(defaultActive);
  }, [images, defaultActive]);

  // Track the last non-UGC image that was active (hero image)
  useEffect(() => {
    if (!safeImages[active]?.isUGC) setHeroIndex(active);
  }, [active, safeImages]);

  // Thumbnails: hero + UGC images (if any UGC exists)
  const thumbs = useMemo(() => {
    if (!safeImages.some((img) => img.isUGC)) return [];
    return [
      { img: safeImages[0], i: 0 },
      ...safeImages
        .map((img, i) => ({ img, i }))
        .filter(({ img, i }) => i > 0 && img.isUGC),
    ];
  }, [safeImages]);

  // Mobile: active hero + all UGC images
  const mobileImages = useMemo(() => {
    const imgs: { img: GalleryImage; i: number }[] = [];
    if (safeImages[heroIndex]) imgs.push({ img: safeImages[heroIndex], i: heroIndex });
    safeImages.forEach((img, i) => {
      if (img.isUGC && i !== heroIndex) imgs.push({ img, i });
    });
    return imgs;
  }, [safeImages, heroIndex]);

  // Scroll the mobile carousel when the active index changes (e.g. variant switch)
  useEffect(() => {
    if (isDesktop) return;
    const el = snapRowRef.current;
    if (!el) return;
    const slideIndex = mobileImages.findIndex(({ i }) => i === active);
    const target = el.offsetWidth * Math.max(slideIndex, 0);
    if (Math.abs(el.scrollLeft - target) < 1) return;
    el.scrollTo({ left: target });
  }, [active, isDesktop, mobileImages]);

  if (!safeImages.length) return null;

  const main = safeImages[Math.min(active, safeImages.length - 1)];
  let thumbIndex = 0;

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
              priority={true}
              fetchPriority="high"
              loading="eager"
              sizes="(min-width:1024px) calc((min(1400px,100vw) - 32px - 24px)/2), 100vw"
              style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
            />

            {thumbs.length > 0 && (
              <div
                className="thumbs-overlay"
                role="group"
                aria-label="Product thumbnails"
              >
                {thumbs.map(({ img, i }) => {
                  thumbIndex += 1;
                  return (
                    <button
                      key={img.url + i}
                      aria-label={`Show image ${thumbIndex}`}
                      className={`thumb ${i === active ? "is-active" : ""}`}
                      onClick={() => setActive(i)}
                      type="button"
                    >
                      <div className="thumb-frame">
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MOBILE: swipe-only (scroll-snap), with dots */
        <div className="gallery-mobile" aria-label="Product images">
          <div
            className="snap-row"
            ref={snapRowRef}
            onScroll={(e) => {
              const idx = Math.round(
                e.currentTarget.scrollLeft / e.currentTarget.offsetWidth
              );
              const safeIdx = mobileImages[idx]?.i ?? 0;
              setActive(safeIdx);
            }}
          >
            {mobileImages.map(({ img, i }, mIdx) => (
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
                  priority={mIdx === 0}
                  fetchPriority={mIdx === 0 ? "high" : "low"}
                  loading={mIdx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  sizes="100vw"
                  style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
                />
              </div>
            ))}
          </div>
          {mobileImages.length > 1 && (
            <div className="dots">
              {mobileImages.map(({ i }, idx) => (
                <div key={idx} className={`dot ${i === active ? "is-active" : ""}`} />
              ))}
            </div>
          )}
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
          max-width: max-content;
          overflow: hidden;
          text-overflow: ellipsis;
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
        .gallery-mobile { position: relative; }
        .snap-row {
          display: flex;
          overflow-x: auto;
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

        /* Mobile dots */
        .dots {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }
        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(24, 24, 24, 0.25);
        }
        .dot.is-active { background: #181818; }
      `}</style>
    </div>
  );
}
