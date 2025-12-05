// src/pages/vip-membership.tsx
import Seo from '@/components/Seo';
import Link from 'next/link';

export default function VipMembershipPage() {
  return (
    <>
      <Seo
        title="VIP Membership | AURICLE"
        description="AURICLE VIP Membership is coming soon. Aggressive wholesale pricing and stronger studio margins are on the way."
        canonical="https://www.auricle.co.uk/vip-membership"
      />

      <main className="vip-page vip-page--coming-soon">
        <section className="vip-hero">
          <p className="vip-hero__tag">AURICLE VIP MEMBERSHIP</p>

          <h1 className="vip-hero__title">
            VIP Membership
            <br />
            Coming soon.
          </h1>

          <p className="vip-hero__subtitle">
            VIP pricing, stronger margins, and member-only benefits are being finalised.
            Membership will open first to verified piercing studios and jewellery retailers.
          </p>

          <div className="vip-hero__meta">
            <span className="vip-note">
              VIP Membership is not yet available. Pricing and launch date to be confirmed.
            </span>
          </div>

          <div className="vip-hero__cta-row">
            <span className="vip-status">
              Coming soon for verified studios only.
            </span>
          </div>
        </section>

        <section className="vip-sections">
          <section className="vip-section">
            <div className="vip-section__content">
              <h2 className="vip-section__title">What to expect</h2>
              <p className="vip-section__body">
                VIP Membership will unlock a lower B2B price across selected AURICLE
                products. The goal is simple: reduce unit costs so every order delivers
                stronger margins without increasing retail prices.
              </p>

              <p className="vip-section__body">
                Details on exact discounts, eligibility, and billing will be published
                here before launch.
              </p>

              <div className="vip-section__actions">
                <Link href="/" className="vip-link-button">
                  Back to homepage
                </Link>
              </div>
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
