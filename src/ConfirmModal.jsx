import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape' && onCancel) onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!mounted || !isOpen) return null;

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') onConfirm();
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') onCancel();
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
      }}
      onClick={handleCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '28px',
          width: '90%',
          maxWidth: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        }}
      >
        <h3 style={{
          margin: '0 0 10px',
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#1e293b',
        }}>
          {title}
        </h3>

        {message && (
          <p style={{
            margin: '0 0 22px',
            fontSize: '0.9rem',
            color: '#64748b',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
          }}>
            {message}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 18px',
              background: '#f1f5f9',
              color: '#475569',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 20px',
              background: '#7c1c2e',
              border: danger ? '2px solid #facc15' : '2px solid transparent',
              color: '#ffffff',
              borderRadius: '7px',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
