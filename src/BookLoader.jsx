import React from 'react';

const STYLES = `
@keyframes bl-dots {
  0%,20%  { opacity:0; }
  50%     { opacity:1; }
  80%,100%{ opacity:0; }
}
.bl-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(253,248,242,0.92);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.bl-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 0;
  width: 100%;
}
.bl-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bl-label {
  font-family: var(--ff-display, 'Cormorant Garamond', Georgia, serif);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--maroon, #7B1F1F);
  letter-spacing: 0.05em;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}
.bl-dot {
  display: inline-block;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--maroon, #7B1F1F);
  margin-bottom: 2px;
  animation: bl-dots 1.6s ease-in-out infinite;
}
.bl-dot:nth-child(2) { animation-delay: 0.2s; }
.bl-dot:nth-child(3) { animation-delay: 0.4s; }
`;

function SpinnerRing({ color = '#7B1F1F' }) {
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0 }}
      viewBox="0 0 80 80"
      width="80"
      height="80"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="4" strokeOpacity="0.15" />
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 40 40"
          to="360 40 40"
          dur="1.6s"
          repeatCount="indefinite"
        />
        <circle
          cx="40" cy="40" r="36"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="163 63"
        />
      </g>
    </svg>
  );
}

function BookStackSVG({ color = '#7B1F1F' }) {
  return (
    <svg
      style={{ position: 'relative', zIndex: 1, display: 'block' }}
      viewBox="0 0 88 72"
      width="42"
      height="34"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="8"  y="52" width="72" height="13" rx="2" fill="#3D0F0F" opacity="0.75" />
      <rect x="8"  y="52" width="8"  height="13" rx="2" fill="#2A0A0A" opacity="0.75" />
      <rect x="8"  y="64" width="72" height="1.5" rx="1" fill="#2A0A0A" opacity="0.18" />
      <rect x="12" y="37" width="66" height="13" rx="2" fill={color} />
      <rect x="12" y="37" width="8"  height="13" rx="2" fill="#5a1515" />
      <rect x="70" y="38" width="8"  height="11" rx="1" fill="#c97a7a" opacity="0.5" />
      <rect x="12" y="49" width="66" height="1.5" rx="1" fill="#2A0A0A" opacity="0.18" />
      <rect x="18" y="22" width="58" height="13" rx="2" fill="#B54040" />
      <rect x="18" y="22" width="8"  height="13" rx="2" fill={color} />
      <rect x="68" y="23" width="8"  height="11" rx="1" fill="#e8b0b0" opacity="0.5" />
      <rect x="18" y="34" width="58" height="1.5" rx="1" fill="#2A0A0A" opacity="0.18" />
    </svg>
  );
}

export default function BookLoader({ message = 'Loading', inline = false }) {
  return (
    <>
      <style>{STYLES}</style>
      <div
        className={inline ? 'bl-inline' : 'bl-overlay'}
        role="status"
        aria-label={message}
      >
        <div className="bl-ring-wrap">
          <SpinnerRing />
          <BookStackSVG />
        </div>
        <div className="bl-label">
          {message}
          <span className="bl-dot" />
          <span className="bl-dot" />
          <span className="bl-dot" />
        </div>
      </div>
    </>
  );
}