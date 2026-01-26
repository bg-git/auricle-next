import Link from 'next/link';
import Seo from '@/components/Seo';
import Image from 'next/image';

export default function WholesalePiercingJewelleryUKPage() {
  return (
    <>
      <Seo
        title="Wholesale Piercing Jewellery UK"
        description="UK-based wholesale piercing jewellery supplier for professional studios. Trade-only access."
        canonical="https://www.auricle.co.uk/wholesale-piercing-jewellery-uk"
      />

      <main className="home-page">
        {/* HERO */}
        <section className="wholesale-hero">
          <h1>Wholesale Piercing Jewellery for Professional Studios</h1>
          <p>
  AURICLE is a UK-based wholesale piercing jewellery supplier for professional
  studios and retailers, offering 14k gold designs and premium titanium body jewellery.
</p>


          
        </section>

        {/* REUSED GRID (paste from homepage) */}
          <section className="custom-grid">
  {/* ENDS & GEMS (above the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/piercing_ends_and_gems_wholesale_uk.jpg"
        alt="Ends & gems"
        fill
        priority
        fetchPriority="high"
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">ENDS & GEMS</h2>
        <p className="overlay-subtitle">View our collection of ends & gems</p>
        <div className="overlay-buttons">
          <Link href="/collection/ends-gems" className="button">
            VIEW ALL ENDS & GEMS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* CHAINS & CHARMS (above the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/piercing_chains_and_charms_wholesale_uk.jpg"
        alt="Chains & Charms"
        fill
        priority
        fetchPriority="high"
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">CHAINS & CHARMS</h2>
        <p className="overlay-subtitle">
          Browse our collection of chains & charms
        </p>
        <div className="overlay-buttons">
          <Link href="/collection/chains-charms" className="button">
            VIEW ALL CHAINS & CHARMS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* RINGS (above the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/Titanium_and_gold_rings_for_piercing.jpg"
        alt="Gold Twist Ring Made from Titanium with pave gems"
        fill
        priority
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">RINGS & HOOPS</h2>
        <p className="overlay-subtitle">View our collection of rings</p>
        <div className="overlay-buttons">
          <Link href="/collection/rings-hoops" className="button">
            VIEW ALL RINGS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* Labrets (below the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/polished-silver-titanium-labret-back-internal-thread-4mm-base-16g-1.2mm.jpg"
        alt="Labrets"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">LABRET BARS</h2>
        <p className="overlay-subtitle">
          Browse our collection of labret bars
        </p>
        <div className="overlay-buttons">
          <Link
            href="/product/labret-base-titanium-polished-16-gauge"
            className="button"
          >
            VIEW ALL LABRETS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* Plain Hinged Rings (below the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/polished-silver-titanium-hinged-piercing-ring.jpg"
        alt="Plain Hinged Rings"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">PLAIN HINGED RINGS</h2>
        <p className="overlay-subtitle">
          Browse our collection of plain hinged rings
        </p>
        <div className="overlay-buttons">
          <Link
            href="/product/piercing-jewellery-plain-hinged-ring-polished-silver-titanium"
            className="button"
          >
            VIEW ALL PLAIN HINGED RINGS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* Plain Curved Barbells (below the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/16g Titanium Curved Barbell Polished SIlver.jpg"
        alt="Curved Barbells"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">CURVED BARBELLS</h2>
        <p className="overlay-subtitle">
          Browse our collection of curved barbells
        </p>
        <div className="overlay-buttons">
          <Link href="/product/curved-barbell-titanium-polished" className="button">
            VIEW ALL CURVED BARBELLS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* Plain Circular Barbells (below the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/16g Internal Thread Titanium Circular Barbell Polished SIlver.jpg"
        alt="Circular Barbells"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">CIRCULAR BARBELLS</h2>
        <p className="overlay-subtitle">
          Browse our collection of circular barbells
        </p>
        <div className="overlay-buttons">
          <Link href="/product/circular-barbell-titanium-polished" className="button">
            VIEW ALL CIRCULAR BARBELLS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* Plain Straight Barbells (below the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/16g Titanium Barbell Polished SIlver.jpg"
        alt="Straight Barbells"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">STRAIGHT BARBELLS</h2>
        <p className="overlay-subtitle">
          Browse our collection of straight barbells
        </p>
        <div className="overlay-buttons">
          <Link href="/product/barbell-titanium-polished" className="button">
            VIEW ALL STRAIGHT BARBELLS &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>

  {/* Piercing Aftercare (below the fold) */}
  <div className="custom-card">
    <div className="image-container">
      <Image
        src="/images/piercemed-piercing-aftercare-spray.jpg"
        alt="Piercing Aftercare"
        fill
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 800px) 50vw, 600px"
      />
      <div className="overlay">
        <h2 className="overlay-title">PIERCING AFTERCARE</h2>
        <p className="overlay-subtitle">Browse our piercing aftercare</p>
        <div className="overlay-buttons">
          <Link href="/product/piercemed-piercing-aftercare" className="button">
            VIEW PIERCING AFTERCARE &#x27F6;
          </Link>
        </div>
      </div>
    </div>
  </div>
</section>

        {/* SEO COPY */}
       <section className="wholesale-seo">
  <h2>Wholesale piercing jewellery supplier in the UK</h2>

  <p>
    AURICLE is a UK-based wholesale supplier of body piercing jewellery, supplying
    professional piercing studios and retailers. The catalogue is trade-only, with
    pricing and ordering available through verified accounts.
  </p>

  <p>
    Studios searching for{' '}
    <strong>wholesale piercing jewellery UK</strong> typically compare catalogue
    depth, material transparency, and supply consistency. AURICLE is positioned for
    studios that already have trusted suppliers but want an additional source of
    high quality body jewellery with reliable UK dispatch.
  </p>

  <h3>Materials: 14k gold and titanium</h3>

  <p>
    Professional wholesale piercing jewellery commonly includes{' '}
    <Link href="/collection/real-gold-ends-gems">14k solid gold</Link> for premium placements and{' '}
    <Link href="/collection/titanium-ends-gems">implant-grade titanium</Link> for everyday studio use. Gold is
    selected for composition and finish, while titanium is chosen for strength and
    corrosion resistance.
  </p>

  <p>
    For studios comparing{' '}
    <strong>titanium piercing jewellery wholesale</strong> options, consistent
    finishing and documented material standards are often key considerations.
  </p>

  <h3>Verification and documentation</h3>

  <p>
    When evaluating{' '}
    <strong>piercing jewellery wholesale suppliers UK</strong>, many studios look
    beyond raw material certificates alone. Third-party documentation and
    independent testing provide additional assurance that finished jewellery meets
    the expectations of professional piercing environments.
  </p>

  <h3>Trade-only access for professional studios</h3>

  <p>
    AURICLE supplies{' '}
    <strong>body piercing jewellery wholesale</strong> to professional studios and
    retailers only. Trade registration is required to view
    pricing, place orders, and access account-level wholesale services. Tap the &quot;Join Us&quot; button in the top right of the page.
  </p>

  <p>
    Studios researching{' '}
    <strong>best piercing jewellery wholesale</strong> suppliers often prioritise
    quality control, consistent supply, and clear product specifications. AURICLE
    is built around those fundamentals, with a boutique catalogue focused on
    wearable designs intended for professional use.
  </p>

   <h3>Professional guide</h3>

  <p>
    A longer breakdown covering materials, verification, MOQs, and wholesale terms is available in our piercing magazine:{' '}
    <Link href="/piercing-magazine/best-wholesale-piercing-jewellery-uk">
      Best Wholesale Piercing Jewellery in the UK
    </Link>.
  </p>
</section>

      </main>
    </>
  );
}
