import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { localDb } from './localDbClient';
import myLogo from './assets/logo.png';
import Toast from './Toast';
import { useResponsive } from './useResponsive';
import { FaCheck, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Login() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [email,             setEmail]             = useState('');
  const [password,          setPassword]          = useState('');
  const [loading,           setLoading]           = useState(false);
  const [toast,             setToast]             = useState({ message: '', type: 'error' });
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending,         setResending]         = useState(false);
  const [showPassword,      setShowPassword]      = useState(false);

  const showToast  = (msg, type = 'error') => setToast({ message: msg, type });
  const closeToast = () => setToast({ message: '' });
  const compact    = isMobile || isTablet;

  const handleBack = (e) => {
    e.preventDefault();
    navigate('/');
  };

  const handleResend = async () => {
    if (!email) { showToast('Enter your email above first.', 'warning'); return; }
    setResending(true);
    const result = await localDb.auth.resendVerification(email);
    setResending(false);
    if (result?.error) {
      showToast(result.error.message || 'Could not resend email.', 'error');
    } else if (result?.alreadyVerified) {
      showToast('That email is already verified — try signing in.', 'success');
      setNeedsVerification(false);
    } else {
      showToast('Verification email sent — check your inbox.', 'success');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);

    const { data: authData, error: authError } =
      await localDb.auth.signInWithPassword({ email, password });

    if (authError) {
      const msg = authError.message;
      if (msg.toLowerCase().includes('verify') || msg.toLowerCase().includes('verification')) {
        setNeedsVerification(true);
        showToast(msg, 'warning');
      } else if (msg.includes('Invalid login credentials')) {
        showToast('Incorrect email or password. Please try again.', 'error');
      } else {
        showToast(msg, 'error');
      }
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await localDb
      .from('users').select('role').eq('auth_id', authData.user.id).single();

    if (userError || !userData) {
      showToast('Account found but no role assigned. Contact your administrator.', 'warning');
      setLoading(false);
      return;
    }

    if      (userData.role === 'librarian')                              navigate('/librarian/dashboard');
    else if (userData.role === 'student' || userData.role === 'teacher') navigate('/student/dashboard');
    else showToast(`Unrecognized role "${userData.role}". Contact your administrator.`, 'warning');

    setLoading(false);
  };

  return (
    <div className="lg-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .lg-root {
          display: flex;
          min-height: 100vh;
          background: var(--cream, #f8f5f0);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ══ Left panel (desktop) ══════════════════════════════════════════ */
        .lg-left {
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
        .lg-left::before {
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
        .lg-logo {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 48px; position: relative;
        }
        .lg-logo img   { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; }
        .lg-logo span  { font-size: 1.4rem; font-weight: 800; color: white; letter-spacing: -.02em; }
        .lg-left h1 {
          font-size: 2.4rem; font-weight: 800; color: white; line-height: 1.1;
          letter-spacing: -.03em; margin: 0 0 16px; position: relative;
        }
        .lg-left p {
          color: rgba(255,255,255,.72); font-size: .95rem; line-height: 1.7;
          margin: 0 0 40px; position: relative;
        }
        .lg-features { display: flex; flex-direction: column; gap: 14px; position: relative; }
        .lg-feature  { display: flex; align-items: center; gap: 12px; color: rgba(255,255,255,.82); font-size: .9rem; }
        .lg-check    {
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2);
          display: flex; align-items: center; justify-content: center;
          color: #f6c343; font-size: .7rem; flex-shrink: 0;
        }

        /* ══ Right panel ═══════════════════════════════════════════════════ */
        .lg-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-y: auto;
          padding: 48px 24px 60px;
        }

        /* Mobile banner — mirrors Signup's exactly */
        .lg-mobile-banner {
          width: 100%;
          background: linear-gradient(155deg, #5a1515 0%, #7B1F1F 60%);
          padding: 40px 24px 36px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .lg-mobile-banner::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,.08), transparent 60%);
          pointer-events: none;
        }
        .lg-mobile-banner img { width: 52px; height: 52px; border-radius: 12px; margin-bottom: 14px; }
        .lg-mobile-banner h1  { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; letter-spacing: -.02em; }
        .lg-mobile-banner p   { font-size: .88rem; color: rgba(255,255,255,.75); margin: 0; }

        /* ══ Card ═══════════════════════════════════════════════════════════ */
        .lg-card {
          width: 100%;
          max-width: 460px;
          background: white;
          border-radius: 22px;
          padding: 36px 32px;
          box-shadow: 0 8px 48px rgba(90,21,21,.09), 0 2px 8px rgba(0,0,0,0.04);
        }
        @media (max-width: 600px) {
          .lg-card {
            border-radius: 18px;
            padding: 24px 18px;
            box-shadow: 0 4px 24px rgba(90,21,21,.08);
          }
        }

        .lg-back {
          display: inline-block; color: var(--maroon);
          text-decoration: none; font-size: .8rem; font-weight: 600;
          margin-bottom: 22px; opacity: .65;
          transition: opacity .15s;
        }
        .lg-back:hover { opacity: 1; }

        .lg-card-title {
          font-size: 1.55rem; font-weight: 800; color: #0f172a;
          letter-spacing: -.02em; margin: 0 0 4px; text-align: center;
        }
        .lg-card-sub {
          font-size: .85rem; color: #64748b; margin: 0 0 28px; text-align: center;
        }

        /* ══ Fields ═════════════════════════════════════════════════════════ */
        .lg-field   { display: flex; flex-direction: column; gap: 6px; }
        .lg-label   { font-size: .8rem; font-weight: 600; color: #475569; }
        .lg-input-wrap { position: relative; }
        .lg-input-ico  {
          position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; display: flex; align-items: center;
        }
        .lg-input {
          width: 100%; padding: 12px 14px 12px 40px;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: .92rem; background: #f8fafc; color: #1e293b;
          outline: none; transition: border-color .2s, background .2s, box-shadow .2s;
          font-family: inherit;
        }
        .lg-input:focus {
          border-color: #7B1F1F;
          background: white;
          box-shadow: 0 0 0 3px rgba(123,31,31,.1);
        }
        .lg-input::placeholder { color: #c0c9d4; }

        /* ══ Submit button ══════════════════════════════════════════════════ */
        .lg-submit {
          width: 100%; padding: 13px; border-radius: 11px; border: none;
          background: #7B1F1F; color: white;
          font-weight: 700; font-size: .95rem; cursor: pointer;
          transition: opacity .2s, transform .15s; font-family: inherit;
          box-shadow: 0 3px 12px rgba(123,31,31,.32);
          letter-spacing: .015em;
        }
        .lg-submit:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .lg-submit:disabled { opacity: .65; cursor: not-allowed; }

        /* ══ Divider ════════════════════════════════════════════════════════ */
        .lg-divider {
          display: flex; align-items: center; gap: 12px;
          color: #cbd5e1; font-size: .75rem; font-weight: 600;
          letter-spacing: .06em; text-transform: uppercase;
          margin: 4px 0;
        }
        .lg-divider::before, .lg-divider::after {
          content: ''; flex: 1; height: 1px; background: #e2e8f0;
        }

        /* ══ Forgot password ════════════════════════════════════════════════ */
        .lg-forgot {
          text-align: right; margin-top: -2px;
        }
        .lg-forgot a {
          color: #7B1F1F; font-size: .8rem; font-weight: 600;
          text-decoration: none; opacity: .75; transition: opacity .15s;
        }
        .lg-forgot a:hover { opacity: 1; }

        /* ══ Verification banner ════════════════════════════════════════════ */
        .lg-verify-banner {
          padding: 16px;
          background: #fffbeb;
          border: 1.5px solid #fcd34d;
          border-radius: 12px;
        }
        .lg-verify-banner p { margin: 0 0 10px; color: #92400e; font-size: .85rem; font-weight: 500; }
        .lg-resend {
          background: #7B1F1F; color: white; border: none;
          padding: 9px 18px; border-radius: 8px;
          font-weight: 700; font-size: .82rem; cursor: pointer;
          font-family: inherit; transition: opacity .15s;
        }
        .lg-resend:hover:not(:disabled) { opacity: .85; }
        .lg-resend:disabled { opacity: .6; cursor: not-allowed; }

        /* ══ Switch ═════════════════════════════════════════════════════════ */
        .lg-switch {
          text-align: center; font-size: .85rem; color: #64748b; margin-top: 20px;
        }
        .lg-switch a { color: #7B1F1F; font-weight: 700; text-decoration: none; }
        .lg-switch a:hover { text-decoration: underline; }

        /* ══ Responsive layout ══════════════════════════════════════════════ */
        @media (max-width: 860px) {
          .lg-left  { display: none; }
          .lg-right { padding: 0 0 48px; }
        }
        @media (min-width: 861px) {
          .lg-mobile-banner { display: none; }
          .lg-right { padding: 48px 32px 60px; justify-content: center; }
        }
      `}</style>

      <Toast {...toast} onClose={closeToast} />

      {/* ── Left panel (desktop only) ── */}
      <aside className="lg-left">
        <div className="lg-logo">
          <img src={myLogo} alt="Logo" />
          <span>ShelfMaster</span>
        </div>
        <h1>Welcome<br />back.</h1>
        <p>Sign in to access your library account — browse titles, track your loans, and stay on top of due dates.</p>
        <div className="lg-features">
          {[
            'Access thousands of titles',
            'Real-time availability checks',
            'Track your borrowing history',
          ].map((f, i) => (
            <div className="lg-feature" key={i}>
              <div className="lg-check"><FaCheck /></div>
              {f}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="lg-right">

        {/* Mobile banner */}
        <div className="lg-mobile-banner">
          <img src={myLogo} alt="Logo" />
          <h1>ShelfMaster</h1>
          <p>Welcome back — sign in to continue</p>
        </div>

        <div className="lg-card" style={{ marginTop: compact ? 24 : 0 }}>
          <a href="#" className="lg-back" onClick={handleBack}>← Back</a>

          <div className="lg-card-title">Sign in</div>
          <div className="lg-card-sub">Enter your credentials to access your account.</div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Email */}
            <div className="lg-field">
              <label className="lg-label">Email Address</label>
              <div className="lg-input-wrap">
                <span className="lg-input-ico"><FaEnvelope size={14} /></span>
                <input
                  className="lg-input"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lg-field">
              <label className="lg-label">Password</label>
              <div className="lg-input-wrap">
                <span className="lg-input-ico"><FaLock size={14} /></span>
                <input
                  className="lg-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0,
                  }}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="lg-forgot">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            {/* Submit */}
            <button className="lg-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>

          </form>

          {/* Verification banner */}
          {needsVerification && (
            <div className="lg-verify-banner" style={{ marginTop: 16 }}>
              <p>Didn't receive a confirmation email?</p>
              <button className="lg-resend" type="button" onClick={handleResend} disabled={resending}>
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            </div>
          )}

          {/* Switch to signup */}
          <div className="lg-divider" style={{ marginTop: 22 }}>or</div>
          <div className="lg-switch">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </main>
    </div>
  );
}