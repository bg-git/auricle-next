// src/components/ContactModal.tsx
import React from 'react';

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  whatsappLink: string;   // e.g. https://wa.me/4477...?text=...
  emailHref: string;      // contact mailto:
  onOpenChat: () => void; // AI live chatbot (chat drawer)
};

const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  whatsappLink,
  emailHref,
  onOpenChat,
}) => {
  if (!isOpen) return null;

  const handleChatClick = () => {
    onClose();
    onOpenChat();
  };

  return (
    <div className="join-modal">
      <div
        className="join-modal__backdrop"
        onClick={onClose}
      />
      <div className="join-modal__content">
        <button
          type="button"
          aria-label="Close"
          className="join-modal__close"
          onClick={onClose}
        >
          ×
        </button>

        <h2>CONTACT AURICLE</h2>
        <p>Choose how you&apos;d like to reach us.</p>

        <div className="join-modal__options">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="join-modal__option join-modal__option--whatsapp"
            onClick={onClose}
          >
            WhatsApp (Fastest)
          </a>

          <a
            href={emailHref}
            className="join-modal__option join-modal__option--email"
            onClick={onClose}
          >
            Email (1–2 Days)
          </a>

          <button
            type="button"
            className="join-modal__option join-modal__option--chat"
            onClick={handleChatClick}
          >
            AI Live Chatbot
          </button>
        </div>

        <p className="join-modal__note">
          WhatsApp is ideal for almost instant response times during working hours.
        </p>
      </div>
    </div>
  );
};

export default ContactModal;
