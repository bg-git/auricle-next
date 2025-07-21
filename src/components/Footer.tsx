import { useState } from 'react';

const sections = [
  {
    title: 'CARE',
    links: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'Returns', href: '/returns' },
      { label: 'Shipping Info', href: '/shipping' },
    ],
  },
  {
    title: 'COMPANY',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'LEGAL',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
  {
    title: 'SOCIALS',
    links: [
      { label: 'Instagram', href: 'https://instagram.com/auricle.co.uk' },
      { label: 'Facebook', href: 'https://facebook.com' },
    ],
  },
];

export default function Footer() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
</footer>

  );
}
