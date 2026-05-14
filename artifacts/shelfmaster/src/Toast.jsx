import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimesCircle } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

const ICONS = {
  success: <FaCheckCircle />,
  error:   <FaTimesCircle />,
  warning: <FaExclamationTriangle />,
  info:    <FaInfoCircle />,
};
const COLORS = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  error:   { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' },
  warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
};

/**
 * Usage:
 *   const [toast, setToast] = useState({ message: '', type: 'error' });
 *   setToast({ message: 'Something went wrong', type: 'error' });
 *   <Toast {...toast} onClose={() => setToast({ message: '' })} />
 */
export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  const c = COLORS[type] || COLORS.error;

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 99999,
      maxWidth: '380px',
      width: 'calc(100vw - 48px)',
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderLeft: `4px solid ${c.border}`,
      borderRadius: '12px',
      padding: '14px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      animation: 'slideIn 0.25s ease',
    }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '1px' }}>{ICONS[type]}</span>
      <span style={{ flex: 1, fontSize: '0.9rem', color: c.text, fontWeight: '500', lineHeight: '1.5' }}>
        {message}
      </span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: c.text,
          opacity: 0.5,
          fontSize: '1rem',
          padding: '0 2px',
          flexShrink: 0,
        }}
      >{<MdClose style={{verticalAlign:"middle"}} />}</button>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
