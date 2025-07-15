import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';

export default function Home() {
  return (
    <>
      <Seo
        title="Wholesale Body Piercing Jewellery"
        description="Boutique wholesaler of 14k gold & ASTM F136 titanium body jewellery. Dainty styles, low MOQs, fast UK dispatch. Limited-run piercing jewellery for pros."
      />

      <main className="home-page">
        <section className="info-grid">
          <Link href="#" className="info-link">
            <div className="info-block">NEW HERE?<br />GET YOUR FIRST-TIMER DISCOUNT</div>
          </Link>
          <Link href="#" className="info-link">
            <div className="info-block">FAST SHIPPING<br />FROM UNITED KINGDOM</div>
          </Link>
          <Link href="#" className="info-link">
            <div className="info-block">REGISTER YOUR<br />FREE B2B ACCOUNT</div>
          </Link>
          <Link href="#" className="info-link">
            <div className="info-block">SEARCH DAINTY GOLD PIERCING JEWELLERY</div>
          </Link>
        </section>

        <section className="custom-grid">
          <div className="custom-card">
            <div className="image-container">
              <Image
                src="/images/piercing_ends_and_gems_wholesale_uk.jpg"
                alt="Gold Ends"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 800px) 50vw, 600px"
              />
              <div className="overlay">
                <h2 className="overlay-title">ENDS & GEMS</h2>
                <p className="overlay-subtitle">Browse our collection of ends & gems</p>
                <div className="overlay-buttons">
                  <Link href="/collection/ends-gems" className="button">VIEW ALL ENDS & GEMS &#x27F6;</Link>
                  {/*<Link href="#" className="button secondary">VIEW</Link>*/}
                </div>
              </div>
            </div>
          </div>

          <div className="custom-card">
            <div className="image-container">
              <Image
                src="/images/Titanium_and_gold_rings_for_piercing.jpg"
                alt="Gold Twist Ring Made from Titanium with pave gems"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 800px) 50vw, 600px"
              />
              <div className="overlay">
                <h2 className="overlay-title">RINGS</h2>
                <p className="overlay-subtitle">View our collection of rings</p>
                <div className="overlay-buttons">
                  <Link href="/collection/rings" className="button">VIEW ALL RINGS &#x27F6;</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="custom-card">
            <div className="image-container">
              <Image
                src="/images/piercing_chains_and_charms_wholesale_uk.jpg"
                alt="Gold Twist Ring Made from Titanium with pave gems"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 800px) 50vw, 600px"
              />
              <div className="overlay">
                <h2 className="overlay-title">CHAINS & CHARMS</h2>
                <p className="overlay-subtitle">View our collection of chains & charms</p>
                <div className="overlay-buttons">
                  <Link href="/collection/chains-charms" className="button">VIEW ALL CHAINS & CHARMS &#x27F6;</Link>
                </div>
              </div>
            </div>
          </div>

          <div className="custom-card">
            <div className="image-container">
              <Image
                src="/images/high_polish_titanium_and_gold_labret_base_wholesale_uk.jpg"
                alt="Gold Twist Ring Made from Titanium with pave gems"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 800px) 50vw, 600px"
              />
              <div className="overlay">
                <h2 className="overlay-title">BASE</h2>
                <p className="overlay-subtitle">View our collection of labret bases</p>
                <div className="overlay-buttons">
                  <Link href="/collection/base" className="button">VIEW ALL LABRET BASES &#x27F6;</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
