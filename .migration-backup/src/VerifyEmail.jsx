import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { localDb } from './localDbClient';
import myLogo from './assets/logo.png';
import { FaCheck, FaExclamationTriangle, FaEnvelope } from 'react-icons/fa';

export default function VerifyEmail() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const [status,  setStatus]  = useState('pending'); // 'pending' | 'ok' | 'error'
  const [message, setMessage] = useState('Confirming your email…');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Please use the link from your email.');
      return;
    }

    let cancelled = false;
    (async () => {
      const result = await localDb.auth.verifyEmail(token);
      if (cancelled) return;

      if (result?.error) {
        setStatus('error');
        setMessage(result.error.message || 'Could not verify your email.');
      } else if (result?.alreadyVerified) {
        setStatus('ok');
        setMessage('Your email was already confirmed. You can sign in now.');
      } else {
        setStatus('ok');
        setMessage('Your email has been confirmed successfully!');
      }
    })();
    return () => { cancelled = true; };
  }, [params]);

  // Countdown redirect on success
  useEffect(() => {
    if (status !== 'ok') return;
    if (countdown <= 0) { navigate('/login'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, navigate]);

  const cfg = {
    pending: {
      icon:       <SpinnerIcon />,
      iconBg:     'rgba(123,31,31,0.08)',
      iconColor:  '#7B1F1F',
      title:      'Verifying your email',
      accentColor:'#7B1F1F',
    },
    ok: {
      icon:       <FaCheck />,
      iconBg:     'rgba(34,197,94,0.12)',
      iconColor:  '#16a34a',
      title:      'Email confirmed!',
      accentColor:'#16a34a',
    },
    error: {
      icon:       <FaExclamationTriangle />,
      iconBg:     'rgba(220,38,38,0.10)',
      iconColor:  '#dc2626',
      title:      'Verification failed',
      accentColor:'#dc2626',
    },
  }[status];

  return (
    <div className="ve-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .ve-root {
          display: flex;
          min-height: 100vh;
          background: var(--cream, #f8f5f0);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Left panel ── */
        .ve-left {
          width: 420px;
          flex-shrink: 0;
          background: linear-gradient(155deg, #5a1515 0%, #7B1F1F 50%, #8b2020 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 48px;
          overflow: hidden;
        }
        .ve-left::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 15% 85%, rgba(255,255,255,.07) 0%, transparent 50%),
            radial-gradient(circle at 85% 15%, rgba(255,255,255,.05) 0%, transparent 45%),
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: auto, auto, 36px 36px, 36px 36px;
          pointer-events: none;
        }
        .ve-logo {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 48px; position: relative;
        }
        .ve-logo img  { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; }
        .ve-logo span { font-size: 1.4rem; font-weight: 800; color: white; letter-spacing: -.02em; }
        .ve-left h1 {
          font-size: 2.4rem; font-weight: 800; color: white; line-height: 1.1;
          letter-spacing: -.03em; margin: 0 0 16px; position: relative;
        }
        .ve-left p {
          color: rgba(255,255,255,.72); font-size: .95rem; line-height: 1.7;
          margin: 0 0 40px; position: relative;
        }
        .ve-steps { display: flex; flex-direction: column; gap: 0; position: relative; }
        .ve-step  { display: flex; gap: 16px; padding-bottom: 28px; position: relative; }
        .ve-step:last-child { padding-bottom: 0; }
        .ve-step-line {
          position: absolute; left: 15px; top: 32px;
          width: 2px; height: calc(100% - 32px);
          background: rgba(255,255,255,.15);
        }
        .ve-step:last-child .ve-step-line { display: none; }
        .ve-step-dot {
          width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: .75rem; font-weight: 800; position: relative; z-index: 1;
        }
        .ve-step-dot.done   { background: rgba(255,255,255,.2); border: 1.5px solid rgba(255,255,255,.35); color: #f6c343; }
        .ve-step-dot.active { background: rgba(255,255,255,.15); border: 1.5px solid rgba(255,255,255,.5); color: white; }
        .ve-step-dot.idle   { background: rgba(255,255,255,.07); border: 1.5px solid rgba(255,255,255,.15); color: rgba(255,255,255,.4); }
        .ve-step-body { padding-top: 4px; }
        .ve-step-body strong { display: block; font-size: .88rem; font-weight: 700; color: white; margin-bottom: 2px; }
        .ve-step-body span   { font-size: .78rem; color: rgba(255,255,255,.55); }

        /* ── Right panel ── */
        .ve-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          padding: 48px 24px;
        }

        /* Mobile banner */
        .ve-mobile-banner {
          width: 100%;
          background: linear-gradient(155deg, #5a1515 0%, #7B1F1F 60%);
          padding: 40px 24px 36px;
          text-align: center; color: white;
          position: relative; overflow: hidden;
        }
        .ve-mobile-banner::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,.08), transparent 60%);
          pointer-events: none;
        }
        .ve-mobile-banner img { width: 52px; height: 52px; border-radius: 12px; margin-bottom: 14px; }
        .ve-mobile-banner h1  { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; letter-spacing: -.02em; }
        .ve-mobile-banner p   { font-size: .88rem; color: rgba(255,255,255,.75); margin: 0; }

        /* ── Card ── */
        .ve-card {
          width: 100%;
          max-width: 460px;
          background: white;
          border-radius: 22px;
          padding: 44px 36px;
          box-shadow: 0 8px 48px rgba(90,21,21,.09), 0 2px 8px rgba(0,0,0,0.04);
          text-align: center;
        }
        @media (max-width: 600px) {
          .ve-card { border-radius: 18px; padding: 28px 20px; margin-top: 24px; }
        }

        /* ── Status icon ── */
        .ve-icon-wrap {
          width: 72px; height: 72px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem;
          margin: 0 auto 24px;
          transition: background .4s;
        }

        /* ── Spinner ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .ve-spinner {
          width: 28px; height: 28px;
          border: 3px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        /* ── Progress ring (countdown) ── */
        .ve-ring-wrap { position: relative; width: 72px; height: 72px; margin: 24px auto 0; }
        .ve-ring-svg  { transform: rotate(-90deg); }
        .ve-ring-bg   { fill: none; stroke: #e2e8f0; stroke-width: 4; }
        .ve-ring-fill {
          fill: none; stroke: #16a34a; stroke-width: 4;
          stroke-linecap: round;
          stroke-dasharray: 188.5;
          transition: stroke-dashoffset 1s linear;
        }
        .ve-ring-num {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; font-weight: 800; color: #16a34a;
        }

        /* ── Title ── */
        .ve-title {
          font-size: 1.45rem; font-weight: 800;
          letter-spacing: -.02em; margin: 0 0 10px;
          transition: color .4s;
        }
        .ve-msg {
          font-size: .9rem; color: #64748b; line-height: 1.65;
          margin: 0 0 30px; max-width: 320px; margin-left: auto; margin-right: auto;
        }

        /* ── Pill tag ── */
        .ve-pill {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: .75rem; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; padding: 5px 14px; border-radius: 20px;
          margin-bottom: 28px;
        }
        .ve-pill-dot { width: 6px; height: 6px; border-radius: 50%; }

        /* ── CTA button ── */
        .ve-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #7B1F1F; color: white;
          padding: 13px 28px; border-radius: 11px;
          font-weight: 700; font-size: .92rem;
          text-decoration: none; font-family: inherit;
          box-shadow: 0 3px 12px rgba(123,31,31,.28);
          transition: opacity .2s, transform .15s;
          letter-spacing: .015em;
        }
        .ve-btn:hover { opacity: .88; transform: translateY(-1px); }
        .ve-btn.green {
          background: #16a34a;
          box-shadow: 0 3px 12px rgba(22,163,74,.28);
        }

        /* ── Hint ── */
        .ve-hint { font-size: .8rem; color: #94a3b8; margin-top: 18px; }
        .ve-hint a { color: #7B1F1F; font-weight: 600; text-decoration: none; }
        .ve-hint a:hover { text-decoration: underline; }

        /* ── Entrance animation ── */
        @keyframes cardUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ve-card { animation: cardUp .45s cubic-bezier(.22,1,.36,1) both; }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .ve-left  { display: none; }
          .ve-right { padding: 0 16px 48px; justify-content: flex-start; }
        }
        @media (min-width: 861px) {
          .ve-mobile-banner { display: none; }
        }
      `}</style>

      {/* ── Left panel ── */}
      <aside className="ve-left">
        <div className="ve-logo">
          <img src={myLogo} alt="Logo" />
          <span>ShelfMaster</span>
        </div>
        <h1>Almost<br />there.</h1>
        <p>One last step — confirm your email to unlock full access to your library account.</p>

        {/* Step trail */}
        <div className="ve-steps">
          {[
            { label: 'Create account',    sub: 'Email & password set up',    state: 'done'   },
            { label: 'Personal details',  sub: 'Name & ID recorded',         state: 'done'   },
            { label: 'Verify email',      sub: 'Confirm your inbox',         state: 'active' },
            { label: 'Access granted',    sub: 'Ready to explore',           state: 'idle'   },
          ].map((s, i) => (
            <div className="ve-step" key={i}>
              <div className={`ve-step-dot ${s.state}`}>
                {s.state === 'done'
                  ? <FaCheck style={{ fontSize: '.65rem' }} />
                  : s.state === 'active'
                  ? <FaEnvelope style={{ fontSize: '.7rem' }} />
                  : i + 1}
              </div>
              <div className="ve-step-line" />
              <div className="ve-step-body">
                <strong>{s.label}</strong>
                <span>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="ve-right">

        {/* Mobile banner */}
        <div className="ve-mobile-banner">
          <img src={myLogo} alt="Logo" />
          <h1>ShelfMaster</h1>
          <p>Email verification</p>
        </div>

        <div className="ve-card">

          {/* Status icon */}
          <div className="ve-icon-wrap" style={{ background: cfg.iconBg, color: cfg.iconColor }}>
            {cfg.icon}
          </div>

          {/* Status pill */}
          <div className="ve-pill" style={{ background: cfg.iconBg, color: cfg.iconColor }}>
            <span className="ve-pill-dot" style={{ background: cfg.iconColor }} />
            {status === 'pending' ? 'Processing' : status === 'ok' ? 'Verified' : 'Error'}
          </div>

          {/* Title & message */}
          <div className="ve-title" style={{ color: cfg.accentColor }}>{cfg.title}</div>
          <div className="ve-msg">{message}</div>

          {/* Countdown ring on success */}
          {status === 'ok' && (
            <div className="ve-ring-wrap" style={{ marginBottom: 24 }}>
              <svg className="ve-ring-svg" width="72" height="72" viewBox="0 0 72 72">
                <circle className="ve-ring-bg" cx="36" cy="36" r="30" />
                <circle
                  className="ve-ring-fill"
                  cx="36" cy="36" r="30"
                  style={{ strokeDashoffset: 188.5 * (countdown / 3) }}
                />
              </svg>
              <div className="ve-ring-num">{countdown}</div>
            </div>
          )}

          {/* CTA */}
          {status !== 'pending' && (
            <Link to="/login" className={`ve-btn ${status === 'ok' ? 'green' : ''}`}>
              {status === 'ok' ? <FaCheck style={{ fontSize: '.8rem' }} /> : null}
              {status === 'ok' ? 'Go to Sign In' : 'Back to Sign In'}
            </Link>
          )}

          {/* Hint */}
          <div className="ve-hint">
            {status === 'error'
              ? <>Need a new link? <Link to="/signup">Sign up again</Link> or <Link to="/login">try signing in</Link>.</>
              : <>Wrong account? <Link to="/signup">Create a new one</Link>.</>}
          </div>

        </div>
      </main>
    </div>
  );
}

function SpinnerIcon() {
  return <div className="ve-spinner" />;
}