import { useState, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // 👈 add this
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

const contactMailto = `mailto:info@auricle.co.uk?subject=${encodeURIComponent(
  'Contact AURICLE'
)}&body=${encodeURIComponent(
  `Hey,

I have a question about:

- 

Best,
`
)}`;

const whatsappNumber = '447757690863';

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
      { label: 'ASTM F136', href: '/quality-assurance/astm-f136' },
      { label: 'ASTM F2999', href: '/quality-assurance/astm-f2999' },
      { label: 'ASTM F2923', href: '/quality-assurance/astm-f2923' },      
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
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const { openDrawer: openChatDrawer } = useChatDrawer();

  return (
    <>
      <footer className="site-footer">
        <div className="footer-inner">
          {sections.map((section) => (
            <div
              key={section.title}
              className="footer-section"
            >
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

        {/* 🔻 New bottom strip: copyright left, NAJ logo right */}
        <div className="footer-legal">
  <a
    href="https://www.naj.co.uk/"
    target="_blank"
    rel="noopener noreferrer"
    className="footer-naj-logo"
  >
    <Image
      src="/images/naj-logo.png"
      alt="National Association of Jewellers member"
      width={120}
      height={58}
    />
  </a>

  <p className="footer-copy">
  © {new Date().getFullYear()} AURICLE. All rights reserved.
  <br />
  <span className="footer-sitemap">
    <Link href="/wholesale-piercing-jewellery-uk">Wholesale Piercing Jewellery UK</Link><br />
    <Link href="/sitemap">Sitemap</Link>
    
  </span>
</p>

</div>


      </footer>

      <RegisterModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        whatsappLink={whatsappRegisterLink}
        emailHref={wholesaleMailto}
      />

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