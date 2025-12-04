// src/pages/vip-membership.tsx
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Seo from '@/components/Seo';
import { useAuth } from '@/context/AuthContext';

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

const sections: VipSection[] = [
  {
    id: 'earn-more',
    imageSrc: '/images/vip/VIP-MEMBER.jpg',
    imageAlt: 'Organised drawers of jewellery in studio',
    title: 'Pay less, earn more on every order',
    kicker: 'Membership that pays for itself',
    body: `VIP pricing is applied to every eligible product in the catalogue. 
Save up to 50% on B2B costs while keeping your retail prices exactly where they are. 
The difference goes straight to your margin, not to your supplier.`,
    align: 'left',
    showVipCta: true,
  },
  {
    id: 'always-in-stock',
    imageSrc: '/images/vip/VIP-MEMBER.jpg',
    imageAlt: 'Piercing jewellery neatly displayed on trays',
    title: 'Keep bestsellers in stock without overcommitting',
    kicker: 'Smaller invoices, faster turns',
    body: `Lower B2B costs mean smaller, more frequent restocks instead of 
large, risky orders. Keep your most-requested pieces on the bar without tying 
up cash in slow-moving stock.`,
    align: 'right',
    linkButton: {
      label: 'Browse catalogue',
      href: '/collections/all',
    },
  },
  {
    id: 'simple-membership',
    imageSrc: '/images/vip/VIP-MEMBER.jpg',
    imageAlt: 'Piercing studio front desk and jewellery display',
    title: 'Simple, flexible membership',
    kicker: 'No hidden tiers or upsells',
    body: `One flat monthly fee unlocks VIP pricing across your account. 
Manage billing, update card details, or cancel directly through Stripe with 
no emails or support tickets needed.`,
    align: 'left',
    showVipCta: true,
  },
];

export default function VipMembershipPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    const label = isVipMember ? 'Manage membership' : 'Become a VIP member';

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
        <section className="vip-hero">
          <p className="vip-hero__tag">AURICLE VIP MEMBERSHIP</p>
          <h1 className="vip-hero__title">
            Lower B2B costs.
            <br />
            Stronger studio margins.
          </h1>

          <p className="vip-hero__subtitle">
            A flat monthly membership that unlocks VIP pricing across the
            catalogue. Pay less for the jewellery you already buy and keep more
            of every sale.
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
              {mounted && !authLoading && isVipMember && 'VIP active on this account.'}
              {mounted && !authLoading && !isVipMember && 'Available to verified studios only.'}
            </span>
          </div>

          {error && (
            <p className="vip-error">
              {error}
            </p>
          )}
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
      </main>
    </>
  );
}
