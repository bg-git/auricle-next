// src/components/RegisterModal.tsx

import React from 'react';

type RegisterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  whatsappLink: string;   // e.g. https://wa.me/4477... ?text=...
  emailHref: string;      // your wholesaleMailto mailto: string
};

const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  whatsappLink,
  emailHref,
}) => {
  if (!isOpen) return null;

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

        <h2>REGISTER YOUR WAY</h2>
        <p>WhatsApp is the fastest way to get your wholesale account approved.</p>

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
        </div>

        <p className="join-modal__note">
          We aim to have your whatsapp account request approved in under 1 hour during our opening times.</p>
          <p className="join-modal__note">
          Email requests can take 1–2 business days.
        </p>
      </div>
    </div>
  );
};

export default RegisterModal;
