import Image from "next/image";

export type UGCItem = {
  id: string;
  image: { url: string; width: number; height: number; altText?: string | null };
  alt?: string;
  credit?: string;
  url?: string;
  linkText?: string;
};

export default function StyledByYou({ items }: { items: UGCItem[] }) {
  if (!items?.length) return null;

  return (
    <section aria-label="Styled by you" className="ugc">
      <h2>STYLED BY YOU</h2>
      <p>Upload your photo for a chance to be featured. </p>
      <a
  className="ugc-upload-btn"
  href="https://form.jotform.com/252432451663050"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Upload your photo (opens in a new tab)"
>
  Upload Your Photo
</a>
      <div className="ugc-grid">
        {items.map((it) => (
          <figure key={it.id}>
            <div className="ugc-frame">
              <Image
                src={it.image.url}
                alt={(it.alt || it.image.altText || "Customer photo").slice(0, 100)}
                width={it.image.width}
                height={it.image.height}
                loading="lazy"
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
        ))}
      </div>
    </section>
  );
}
