import { useState, memo } from 'react';
import Link from 'next/link';
import { useChatDrawer } from '@/context/ChatDrawerContext';
import RegisterModal from '@/components/RegisterModal';
import ContactModal from '@/components/ContactModal';

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

// General contact email
const contactMailto = `mailto:info@auricle.co.uk?subject=${encodeURIComponent(
  'Contact AURICLE'
)}&body=${encodeURIComponent(
  `Hey,

I have a question about:

- 

Best,
`
)}`;

// WhatsApp details – same as register flow
const whatsappNumber = '447757690863';

// WhatsApp links
const whatsappRegisterLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  `Hey,

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
Auricle`
)}`;

const whatsappContactLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
  `Hey,

I have a question about:

- 

Best,
`
)}`;

const sections = [
  {
    title: 'CARE',
    links: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Join Us', href: wholesaleMailto },
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
      { label: 'All Terms', href: '/information' },
      { label: 'Privacy Policy', href: '/information/privacy-policy' },
      { label: 'Cookie Policy', href: '/information/cookie-policy' },
    ],
  },
  {
    title: 'SOCIALS',
    links: [
      { label: 'Instagram', href: 'https://instagram.com/auricle.co.uk' },
      { label: 'WhatsApp', href: 'https://wa.me/447757690863' },
      { label: 'TikTok', href: 'https://www.tiktok.com/@auriclejewellery' },
    ],
  },
];

function Footer() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const toggle = (index: number) =>
    setOpenIndex(openIndex === index ? null : index);

  const { openDrawer: openChatDrawer } = useChatDrawer();

  return (
    <>
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
                  <li key={`${section.title}-${link.label}`}>
                    {link.label === 'Contact Us' ? (
                      <button
                        type="button"
                        className="footer-join-link"
                        onClick={() => setIsContactModalOpen(true)}
                      >
                        {link.label}
                      </button>
                    ) : link.label === 'Join Us' ? (
                      <button
                        type="button"
                        className="footer-join-link"
                        onClick={() => setIsJoinModalOpen(true)}
                      >
                        {link.label}
                      </button>
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

      {/* Register modal (Join Us) */}
      <RegisterModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        whatsappLink={whatsappRegisterLink}
        emailHref={wholesaleMailto}
      />

      {/* Contact modal (Contact Us) */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        whatsappLink={whatsappContactLink}
        emailHref={contactMailto}
        onOpenChat={openChatDrawer}
      />
    </>
  );
}

export default memo(Footer);
