// pages/index.tsx
import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import { useState, ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Seo from '@/components/Seo';

const REGION_COOKIE_NAME = 'auricle_region_pref';

// --- small helper to read one cookie from the header ---
function getCookieFromHeader(
  ctx: GetServerSidePropsContext,
  name: string
): string | null {
  const cookieHeader = ctx.req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

type HomeProps = {
  showSelector: boolean;
  noLayout?: boolean; // when true, _app.tsx will NOT wrap with header/footer
};

export const getServerSideProps: GetServerSideProps<HomeProps> = async (
  ctx
) => {
  const host = ctx.req.headers.host || '';

  const isDotCom =
  host.endsWith('auriclejewelry.com') ||
  host.endsWith('auricle.com');


  // Only read the preference on .com (and localhost in dev)
  if (isDotCom) {
    const pref = getCookieFromHeader(ctx, REGION_COOKIE_NAME);

    if (pref) {
      // If pref is a full URL, redirect there
      if (pref.startsWith('http://') || pref.startsWith('https://')) {
        return {
          redirect: {
            destination: pref,
            permanent: false,
          },
        };
      }

      // Otherwise treat as a path on .com, e.g. "/us" or "/us-es"
      return {
        redirect: {
          destination: pref,
          permanent: false,
        },
      };
    }

    // No preference yet → show selector (and turn off global layout)
    return {
      props: {
        showSelector: true,
        noLayout: true,
      },
    };
  }

  // Not .com → normal homepage (e.g. .co.uk)
  return {
    props: {
      showSelector: false,
      noLayout: false,
    },
  };
};

// --- REGION SELECTOR COMPONENT (for .com root) ---

type Region = {
  id: 'gb' | 'us';
  label: string;
};

type Language = {
  id: 'en' | 'es';
  label: string;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const regions: Region[] = [
  { id: 'gb', label: 'United Kingdom' },
  { id: 'us', label: 'United States' },
];

// All languages we support overall
const languages: Language[] = [
  { id: 'en', label: 'English' },
  // Uncomment when ready for US Spanish:
  // { id: 'es', label: 'Español' },
];

// Mapping: region -> language -> href
const regionLanguageHref: Record<string, Record<string, string>> = {
  gb: {
    en: 'https://auricle.co.uk', // UK–English
  },
  us: {
    en: '/us', // US–English
    // es: '/us/es', // US–Spanish (later)
  },
};

function RegionSelector() {
  const [selectedRegion, setSelectedRegion] = useState<Region['id'] | ''>('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language['id'] | ''>(
    ''
  );
  const [rememberPreference, setRememberPreference] = useState<boolean>(false);

  const handleRegionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Region['id'] | '';
    setSelectedRegion(value);
    // Reset language + remember when changing region
    setSelectedLanguage('');
    setRememberPreference(false);
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Language['id'] | '';
    setSelectedLanguage(value);
  };

  const handleRememberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setRememberPreference(e.target.checked);
  };

  const handleContinue = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedRegion || !selectedLanguage) return;

    const href = regionLanguageHref[selectedRegion]?.[selectedLanguage];
    if (!href) return;

    if (rememberPreference) {
      // Save preference cookie (on .com)
      document.cookie = `${REGION_COOKIE_NAME}=${encodeURIComponent(
        href
      )}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`;
    }

    // Redirect
    window.location.href = href;
  };

  const availableLanguagesForSelectedRegion: Language[] = selectedRegion
    ? languages.filter((lang) => regionLanguageHref[selectedRegion]?.[lang.id])
    : [];

  const canShowRememberRow =
    Boolean(selectedRegion) &&
    Boolean(selectedLanguage) &&
    availableLanguagesForSelectedRegion.some((l) => l.id === selectedLanguage);

  return (
    <>
      <Seo
        title="Choose region | AURICLE"
        description="Select your country and language to continue to AURICLE."
      />

      <main className="region-selector">
        <form className="region-selector__panel" onSubmit={handleContinue}>
          {/* Logo / brand */}
          <header className="region-selector__brand">
            <Image
              src="/auricle-logo.png"
              alt="AURICLE"
              width={140}
              height={94}              priority
            />
            <p className="region-selector__welcome">
              Welcome to the AURICLE international website.
            </p>
          </header>

          {/* Region selection */}
          <section className="region-selector__section">
            <label htmlFor="region-select" className="region-selector__label">
              Choose your region
            </label>
            <p className="region-selector__hint-text">
              Select where you are based to see the correct store.
            </p>
            <div className="region-selector__field">
              <select
                id="region-select"
                className="region-selector__select"
                value={selectedRegion}
                onChange={handleRegionChange}
              >
                <option value="">Select region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Language selection */}
          <section className="region-selector__section">
            <label htmlFor="language-select" className="region-selector__label">
              Choose your language
            </label>
            <p className="region-selector__hint-text">
              Languages are based on the region selected above.
            </p>
            <div className="region-selector__field">
              <select
                id="language-select"
                className="region-selector__select"
                value={selectedLanguage}
                onChange={handleLanguageChange}
                disabled={
                  !selectedRegion || availableLanguagesForSelectedRegion.length === 0
                }
              >
                <option value="">
                  {selectedRegion
                    ? 'Select language'
                    : 'Select a region first'}
                </option>
                {availableLanguagesForSelectedRegion.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Remember + Continue (only after language is chosen) */}
          {canShowRememberRow && (
            <section className="region-selector__section region-selector__section--remember">
              <label className="region-selector__remember">
                <input
                  type="checkbox"
                  checked={rememberPreference}
                  onChange={handleRememberChange}
                  className="region-selector__remember-checkbox"
                />
                <span className="region-selector__remember-label">
                  Remember this preference on this device
                </span>
              </label>

              <button
                type="submit"
                className="region-selector__continue"
              >
                Continue
              </button>
            </section>
          )}

          <footer className="region-selector__footer">
            <p>
              Looking for wholesale access in another country? Email{' '}
              <a href="mailto:info@auricle.co.uk">info@auricle.co.uk</a>.
            </p>
          </footer>
        </form>
      </main>
    </>
  );
}


// --- YOUR EXISTING HOMEPAGE CONTENT, FACTORED OUT ---

export function HomeContent() {
  return (
    <>
      <Seo
        title="Wholesale Body Piercing Jewellery"
        description="Boutique wholesaler of 14k gold & ASTM F136 titanium body jewellery. Dainty styles, low MOQs, fast UK dispatch. Limited-run piercing jewellery for pros."
        schemaType="Organization"
        schemaData={{
          name: "AURICLE",
          description: "UK's leading provider of premium, independently-tested body piercing jewellery for professional piercers. All products verified to ASTM standards (F136, F2923, F2999) with independent third-party testing and mill certificates. Specializing in high-quality, safe, and compliant professional piercing jewellery.",
          url: "https://www.auricle.co.uk",
          logo: "https://www.auricle.co.uk/auricle-logo.png",
          areaServed: ["GB", "US", "AU", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "PL", "SE", "DK", "IE", "PT", "GR", "CZ", "HU"],
          knowsAbout: [
            "ASTM F136 Implant-Grade Titanium",
            "ASTM F2923 Children's Jewellery Safety",
            "ASTM F2999 Adult Jewellery Safety",
            "EU Nickel Release Compliance",
            "Professional Body Piercing",
            "Material Certification",
            "Independent Third-Party Testing",
            "UK & EU Consumer Product Safety",
            "Medical-Grade Jewellery",
            "Professional Piercer Supply",
            "Wholesale Body Jewellery",
            "High Quality Piercing Jewellery",
            "Piercing Jewellery Wholesale"
          ],
          sameAs: []
        }}
      />

      <main className="home-page">
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

      </main>
    </>
  );
}

// --- MAIN EXPORT: decides which view to show based on props ---

export default function Home({ showSelector }: HomeProps) {
  if (showSelector) {
    // .com root with no cookie → show country/language selector
    return <RegionSelector />;
  }

  // .co.uk root (and any non-.com domain) → normal homepage
  return <HomeContent />;
}
