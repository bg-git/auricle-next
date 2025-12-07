// src/pages/vip-membership.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Seo from '@/components/Seo';
import { useAuth } from '@/context/AuthContext';
import RegisterModal from '@/components/RegisterModal';

type ApiResponse = {
  url?: string;
  error?: string;
};

type VipSection = {
  id: string;
  imageSrc: string;
  imageAlt: string;
  title: string;
  kicker?: string;
  body: string;
  align?: 'left' | 'right'; // image position on desktop
  showVipCta?: boolean;
  linkButton?: {
    label: string;
    href: string;
  };
};

// 🔹 Same mailto as footer “Join Us”
const wholesaleMailto = `mailto:info@auricle.co.uk?subject=${encodeURIComponent(
  'Wholesale Enquiry'
)}&body=${encodeURIComponent(
  `Hey,
    
Thank you for your interest in becoming an authorised AURICLE stockist.

To ensure access is reserved exclusively for verified piercing studios and jewellery retailers, please complete the details below. This helps us confirm eligibility and activate your wholesale account as quickly as possible.

First Name = 

Last Name = 

Company Name = 

Email Address = 

Trading Address = 

Website = 

Social Media = 

Phone Number =

Once we’ve confirmed your business details, we’ll respond to this email with your access credentials. Verification is usually completed within one hour.

Best Regards
Auricle`
)}`;

// 🔹 Reuseable WhatsApp VIP registration text
const vipWhatsappText = `Hey,

Thank you for your interest in becoming an authorised AURICLE stockist.

To ensure access is reserved exclusively for verified piercing studios and jewellery retailers, please complete the details below and send them in this chat:

First Name =
Last Name = 
Company Name = 
Email Address = 
Trading Address = 
Website = 
Social Media = 
Phone Number =

Once we’ve confirmed your business details, we’ll respond via email or WhatsApp with your access credentials. Verification is usually completed within one hour.

Best Regards
Auricle`;

const vipWhatsappLink = `https://wa.me/447757690863?text=${encodeURIComponent(
  vipWhatsappText
)}`;

const sections: VipSection[] = [
  {
    id: 'earn-more',
    imageSrc: '/images/vip/AURICLE-VIP-MEMBER1-1.jpg',
    imageAlt: 'Organised drawers of jewellery in studio',
    title: 'Pay less, earn more on every order',
    kicker: 'Membership that pays for itself',
    body: `VIP pricing is applied to every eligible product in the catalogue. 
Save up to 50% on your jewellery costs while keeping your retail prices exactly where they are. 
The difference goes straight to your profit marging margin, not to your supplier.`,
    align: 'left',
    showVipCta: true,
  },
  {
    id: 'always-in-stock',
    imageSrc: '/images/vip/VIP-MEMBER.jpg',
    imageAlt: 'Piercing jewellery neatly displayed on trays',
    title: 'Feel like royalty',
    kicker: 'Power comes from the numbers',
    body: `VIP pricing puts your studio in a stronger, more profitable position instantly. Better margins, better flexibility, and a buying experience that simply feels premium.`,
    align: 'right',
    showVipCta: true,
  },
  {
    id: 'always-in-stock',
    imageSrc: '/images/vip/operate-from-strength.jpg',
    imageAlt: 'Piercing jewellery neatly displayed on trays',
    title: 'An advantage your competitors can’t see',
    kicker: 'Same jewellery. Better prices.',
    body: `Every VIP order builds stronger margins and healthier cash flow. Your clients see beautiful jewellery, only you see the financial edge behind it.`,
    align: 'left',
    showVipCta: true,
  },
  {
    id: 'simple-membership',
    imageSrc: '/images/vip/grow-at-your-own-pace.jpg',
    imageAlt: 'Piercing studio front desk and jewellery display',
    title: 'Grow at your own pace',
    kicker: 'Scale without the strain',
    body: `Lower B2B costs mean you can expand your jewellery range, add services, or level up your displays without feeling the financial pressure. VIP makes growth feel achievable instead of risky`,
    align: 'right',
    showVipCta: true,
  },
   
  // {
  //   id: 'simple-membership',
  //   imageSrc: '/images/vip/tree-planting.jpg',
  //   imageAlt: 'Piercing studio front desk and jewellery display',
  //   title: 'Meaningful choices start with stronger margins',
  //   kicker: 'Tree planting helps the world. Lower costs help your studio',
  //   body: `Eco initiatives are admirable, but they don’t improve your studio’s margins. VIP focuses on delivering lower prices by avoiding expensive add-ons. With healthier profit, you choose where your impact goes, even if that means planting your own tree, on your own terms.`,
  //   align: 'left',
  //   showVipCta: true,
  // },
   {
    id: 'always-in-stock',
    imageSrc: '/images/vip/cancel-anytime.jpg',
    imageAlt: 'Piercing jewellery neatly displayed on trays',
    title: 'Your membership. Your terms',
    kicker: 'Cancel anytime with total freedom',
    body: `VIP is built on transparency and choice. No contracts. No hidden conditions. Just the freedom to keep the membership while it benefits your studio, and walk away whenever it doesn’t.`,
    align: 'left',
    showVipCta: true,
  },
];

export default function VipMembershipPage() {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ Gate flag – same concept as product page
  const approved =
    !mounted || authLoading ? null : Boolean(user?.approved);

  const isVipMember =
    mounted && Array.isArray(user?.tags)
      ? user!.tags!.includes('VIP-MEMBER')
      : false;

  const parseJsonSafely = (text: string): ApiResponse | null => {
    try {
      const data = JSON.parse(text) as ApiResponse;
      return data;
    } catch {
      return null;
    }
  };

  // --- Become VIP handler ---
  const handleBecomeVip = async () => {
    try {
      setError(null);
      setSubmitting(true);

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const text = await res.text();
      const data = parseJsonSafely(text);

      if (!data) {
        console.error('Non-JSON response from checkout-session API:', text);
        setError('Unexpected server response starting checkout.');
        setSubmitting(false);
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error || 'Unable to start VIP checkout.');
        setSubmitting(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error starting VIP checkout:', err);
      setError('Something went wrong starting the VIP checkout.');
      setSubmitting(false);
    }
  };

  // --- Manage Membership handler ---
  const handleManageMembership = async () => {
    try {
      setError(null);
      setSubmitting(true);

      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      const text = await res.text();
      const data = parseJsonSafely(text);

      if (!data) {
        console.error('Non-JSON response from portal-session API:', text);
        setError('Unexpected server response opening billing portal.');
        setSubmitting(false);
        return;
      }

      if (!res.ok || !data.url) {
        setError(data.error || 'Unable to open billing portal.');
        setSubmitting(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError('Something went wrong opening billing portal.');
      setSubmitting(false);
    }
  };

  // Reusable VIP CTA that auto-switches label / handler
  const renderVipCta = (variant: 'primary' | 'ghost' = 'primary') => {
    const label = isVipMember ? 'Manage membership' : 'Become a VIP member →';

    const handleClick = () => {
      if (isVipMember) {
        void handleManageMembership();
      } else {
        void handleBecomeVip();
      }
    };

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className={`vip-cta vip-cta--${variant}`}
      >
        {submitting ? 'Processing…' : label}
      </button>
    );
  };

  return (
    <>
      <Seo
        title="VIP Membership | AURICLE"
        description="Unlock aggressive wholesale pricing with AURICLE VIP Membership. Lower B2B costs, protect margins, and keep your studio stocked with less risk."
        canonical="https://www.auricle.co.uk/vip-membership"
      />

      <main className="vip-page">
        {/* ✅ Gate: only approved users see the full VIP content */}
        {approved !== true ? (
          <section className="vip-gate">
            <h1 className="vip-hero__title">VIP Membership</h1>
            <p className="vip-hero__subtitle">
              VIP Membership is reserved for verified wholesale account holders.
            </p>
            <p className="vip-hero__subtitle">
              You do not have a verified account. Please{' '}
              <Link href="/sign-in" className="vip-link-button">
                Sign in
              </Link>{' '}
              or{' '}
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(true)}
                className="vip-link-button"
              >
                Join Us
              </button>
              .
            </p>
          </section>
        ) : (
          <>
            <section className="vip-hero">
              <p className="vip-hero__tag">AURICLE VIP MEMBERSHIP</p>
              <h1 className="vip-hero__title">
                Lower product prices.
                <br />
                Bigger profit margins.
              </h1>

              <p className="vip-hero__subtitle">
                A flat monthly membership that unlocks VIP pricing across our entire
                catalogue. Pay less for the jewellery you already buy and keep more profit
                on every sale. It just makes sense!
              </p>

              <div className="vip-hero__meta">
                <span className="vip-pill">£11.99 / month</span>
                <span className="vip-note">
                  Cancel or manage anytime via Stripe.
                </span>
              </div>

              <div className="vip-hero__cta-row">
                {renderVipCta('primary')}

                <span className="vip-status">
                  {authLoading && !mounted && 'Checking membership status…'}
                  {mounted && !authLoading && isVipMember && 'I am a VIP member.'}
                  {mounted && !authLoading && !isVipMember && 'Start saving money today!'}
                </span>
              </div>

              {error && <p className="vip-error">{error}</p>}
            </section>

            <section className="vip-sections">
              {sections.map((section) => {
                const sectionClass = `vip-section${
                  section.align === 'right' ? ' vip-section--reverse' : ''
                }`;

                return (
                  <section key={section.id} className={sectionClass}>
                    <div className="vip-section__image">
                      <div className="vip-section__image-inner">
                        <img src={section.imageSrc} alt={section.imageAlt} />
                      </div>
                    </div>

                    <div className="vip-section__content">
                      {section.kicker && (
                        <p className="vip-section__kicker">{section.kicker}</p>
                      )}
                      <h2 className="vip-section__title">{section.title}</h2>
                      <p className="vip-section__body">{section.body}</p>

                      <div className="vip-section__actions">
                        {section.showVipCta && renderVipCta('ghost')}

                        {section.linkButton && (
                          <Link
                            href={section.linkButton.href}
                            className="vip-link-button"
                          >
                            {section.linkButton.label}
                          </Link>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </section>
          </>
        )}

        {/* 🔹 Always render the modal so the Join Us button can open it */}
        <RegisterModal
          isOpen={isJoinModalOpen}
          onClose={() => setIsJoinModalOpen(false)}
          whatsappLink={vipWhatsappLink}
          emailHref={wholesaleMailto}
        />
      </main>
    </>
  );
}
