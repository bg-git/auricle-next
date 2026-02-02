import React, { useState, useEffect } from 'react';

type QuantityModalProps = {
  isOpen: boolean;
  currentQty: number;
  maxQty: number;
  onAdd: (qty: number) => void;
  onClose: () => void;
};

export default function QuantityModal({
  isOpen,
  currentQty,
  maxQty,
  onAdd,
  onClose,
}: QuantityModalProps) {
  const [input, setInput] = useState(currentQty.toString());

  useEffect(() => {
    setInput(currentQty.toString());
  }, [isOpen, currentQty]);

  if (!isOpen) return null;

  const handleAdd = () => {
    const val = parseInt(input) || currentQty;
    const valid = Math.max(1, Math.min(val, maxQty));
    onAdd(valid);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) setInput(val);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '340px',
          width: '90%',
          background: '#ffffff',
          padding: '2rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            fontSize: '1.75rem',
            cursor: 'pointer',
            color: '#181818',
            padding: 0,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', letterSpacing: '0.5px', fontWeight: 400 }}>
          Select Quantity
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => {
              const val = Math.max(1, parseInt(input) - 1);
              setInput(val.toString());
            }}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
              borderRadius: '4px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#181818',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#181818';
              e.currentTarget.style.background = '#f9f9f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            −
          </button>

          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={maxQty}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100px',
              height: '48px',
              textAlign: 'center',
              fontSize: '1.25rem',
              fontWeight: 500,
              border: '2px solid #181818',
              borderRadius: '4px',
              background: '#ffffff',
              color: '#181818',
              fontFamily: 'inherit',
              padding: 0,
            }}
          />

          <button
            onClick={() => {
              const val = Math.min(maxQty, parseInt(input) + 1);
              setInput(val.toString());
            }}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #e0e0e0',
              background: '#ffffff',
              borderRadius: '4px',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#181818',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#181818';
              e.currentTarget.style.background = '#f9f9f9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            +
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: '#f5f5f5',
              color: '#181818',
              border: '1px solid #d0d0d0',
              borderRadius: '4px',
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontSize: '0.95rem',
              letterSpacing: '0.5px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: '#181818',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontSize: '0.95rem',
              letterSpacing: '0.5px',
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
