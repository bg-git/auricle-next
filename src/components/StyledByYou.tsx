// src/components/StyledByYou.tsx
import Image from "next/image";

export type UGCItem = {
  id: string;
  image: { url: string; width: number; height: number; altText?: string | null };
  alt?: string;
  credit?: string;
  url?: string;
  linkText?: string;
};

type Props = {
  items: UGCItem[];
  uploadUrl?: string;
};

export default function StyledByYou({
  items = [],
  uploadUrl = "https://form.jotform.com/252432451663050",
}: Props) {
  const hasItems = items.length > 0;

  return (
    <section aria-label="Styled by you" className="ugc">
      <h2 className="ugc-title">STYLED BY YOU</h2>
      <p>Upload your photo for a chance to be featured.</p>
      <a
        className="ugc-upload-btn"
        href={uploadUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Upload your photo (opens in a new tab)"
      >
        Upload Your Photo
      </a>

      <div className="ugc-grid">
        {hasItems ? (
          items.map((it) => (
            <figure key={it.id}>
              <div className="ugc-frame">
                <Image
                  src={it.image.url}
                  alt={(it.alt || it.image.altText || "Customer photo").slice(0, 100)}
                  width={it.image.width}
                  height={it.image.height}
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1024px) calc((min(1400px, 100vw) - 48px) / 5), 100vw"
                  quality={60}
                />
              </div>

              {(it.credit || it.url) && (
                <figcaption className="ugc-caption">
                  {it.credit && <span className="ugc-credit">{it.credit}</span>}
                  {it.url && (
                    <a className="ugc-link" href={it.url} rel="nofollow noopener">
                      {it.linkText || "View"}
                    </a>
                  )}
                </figcaption>
              )}
            </figure>
          ))
        ) : (
         /* Fallback placeholder card when no items */
<figure className="ugc-placeholder">
  <div className="ugc-frame has-shimmer">
    <Image
      src="/tiny-placeholder.jpg"  // or /placeholder.webp if you have it
      alt="Be the first to share a photo of this jewellery"
      width={1200}
      height={1500}                       // 4:5 portrait
      loading="lazy"
      decoding="async"
      sizes="(min-width: 1024px) calc((min(1400px, 100vw) - 48px) / 5), 100vw"
      quality={100}
    />
  </div>

  <figcaption className="ugc-caption">
    <span className="ugc-credit">Be the first to share a photo.</span>
    
  </figcaption>
</figure>

        )}
      </div>
    </section>
  );
}
