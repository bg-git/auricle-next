import { useState, memo } from 'react';
import Link from 'next/link';
import { useChatDrawer } from '@/context/ChatDrawerContext';

const sections = [
  {
    title: 'CARE',
    links: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Register', href: '/register' },
    ],
  },
  {
    title: 'COMPANY',
    links: [
      { label: 'About Us', href: '/information/about-us' },
      { label: 'Pricing & Efficiency', href: '/information/pricing-and-efficiency' },
      { label: 'Blog', href: '/piercing-magazine' },
    ],
  },
  {
    title: 'LEGAL',
    links: [
      { label: 'Terms of Service', href: '/information/terms-of-service' },
      { label: 'Terms of Sale', href: '/information/terms-of-sale' },
      { label: 'Privacy Policy', href: '/information/privacy-policy' },
      { label: 'Cookie Policy', href: '/information/cookie-policy' },
      { label: 'Shipping & Delivery', href: '/information/shipping-and-delivery-policy' },
      { label: 'All Terms', href: '/information' },

      
      
    ],
  },
  {
    title: 'SOCIALS',
    links: [
      { label: 'Instagram', href: 'https://instagram.com/auricle.co.uk' },
    ],
  },
];

function Footer() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (index: number) => setOpenIndex(openIndex === index ? null : index);
  const { openDrawer: openChatDrawer } = useChatDrawer();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        {sections.map((section, index) => (
          <div
            key={section.title}
            className="footer-section"
            data-open={openIndex === index}
          >
            <button
              className="footer-toggle"
              onClick={() => toggle(index)}
              aria-expanded={openIndex === index}
            >
              {section.title}
              <span className="footer-toggle-icon">
                {openIndex === index ? '−' : '+'}
              </span>
            </button>
            <ul className="footer-links">
              {section.links.map((link) => (
                <li key={link.href}>
                  {link.label === 'Contact Us' ? (
                    <p
                      onClick={openChatDrawer}
                      style={{ cursor: 'pointer', margin: 0 }}
                    >
                      {link.label}
                    </p>
                  ) : link.href.startsWith('/') ? (
                    <Link href={link.href}>{link.label}</Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}

export default memo(Footer);
