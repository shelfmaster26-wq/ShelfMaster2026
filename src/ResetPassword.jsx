import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import myLogo from './assets/logo.png';
import Toast from './Toast';
import { useResponsive } from './useResponsive';
import { getBaseURL } from './connectionManager';
import { FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function ResetPassword() {
  const [token,    setToken]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [toast, setToast]       = useState({ message: '', type: 'error' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const { isMobile }            = useResponsive();
  const navigate                = useNavigate();

  const showToast  = (message, type = 'error') => setToast({ message, type });
  const closeToast = () => setToast({ message: '' });

  useEffect(() => {
    // Supabase delivers the recovery token in the URL hash after the user clicks
    // the password-reset email link: /reset-password#access_token=...&type=recovery
    const hash   = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const type   = params.get('type');
    const access = params.get('access_token');
    if (type === 'recovery' && access) {
      setToken(access);
    } else {
      showToast('Invalid reset link. Please request a new one.', 'error');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) { showToast('Invalid reset link. Please request a new one.', 'error'); return; }
    if (password.length < 8) { showToast('Password must be at least 8 characters.', 'warning'); return; }
    if (password !== confirm) { showToast('Passwords do not match.', 'warning'); return; }

    setLoading(true);
    try {
      const base = getBaseURL() || '';
      const res  = await fetch(`${base}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not reset password.');
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      showToast(err.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrapperStyle(isMobile)}>
      <style>{STYLES}</style>
      <Toast {...toast} onClose={closeToast} />

      {!isMobile && (
        <div style={leftPanelStyle}>
          <div style={patternOverlay} />
          <div style={leftContentStyle}>
            <img src={myLogo} alt="Logo" style={{ width: 64, marginBottom: 28, borderRadius: 16 }} />
            <h1 style={leftHeadingStyle}>ShelfMaster</h1>
            <p style={leftSubStyle}>Choose a strong password you haven't used before.</p>
          </div>
        </div>
      )}

      <div style={rightPanelStyle(isMobile)}>
        {isMobile && (
          <div style={mobileHeaderStyle}>
            <img src={myLogo} alt="Logo" style={{ width: 52, marginBottom: 14, borderRadius: 12 }} />
            <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: '2rem', fontWeight: 700, margin: 0 }}>ShelfMaster</h1>
          </div>
        )}

        <div style={formCardStyle(isMobile)}>
          {!isMobile && <img src={myLogo} alt="Logo" style={{ width: 56, display: 'block', margin: '0 auto 22px', borderRadius: 12 }} />}

          <h2 style={formTitleStyle(isMobile)}>Reset Password</h2>

          {done ? (
            <div style={successBoxStyle}>
              <div style={{ fontSize: '2.4rem', marginBottom: 12 }}></div>
              <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#1e4d2b', fontSize: '1rem' }}>Password updated!</p>
              <p style={{ margin: 0, color: '#3a6b45', fontSize: '.88rem', lineHeight: 1.6 }}>
                Your password has been changed successfully. Redirecting you to sign in…
              </p>
              <Link to="/login" style={{ display: 'block', marginTop: 20, color: 'var(--maroon)', fontWeight: 700, textDecoration: 'none', fontSize: '.9rem' }}>
                Sign In now →
              </Link>
            </div>
          ) : (
            <>
              <p style={formSubStyle(isMobile)}>Enter your new password below.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 6 }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="sm-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={eyeBtnStyle}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                    </button>
                  </div>
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat your new password"
                      style={{ ...inputStyle, paddingRight: 40 }}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                      className="sm-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(p => !p)}
                      style={eyeBtnStyle}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading || !token} style={submitStyle}>
                  {loading ? 'Updating…' : 'Set New Password'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 18, fontSize: '.87rem', color: 'var(--text-muted)' }}>
                <Link to="/forgot-password" style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}>
                  Request a new reset link
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const STYLES = `
  .sm-input:focus {
    border-color: var(--maroon) !important;
    background: white !important;
    box-shadow: 0 0 0 3px rgba(123,31,31,.08) !important;
    outline: none;
  }
`;

const wrapperStyle = (isMobile) => ({
  display: 'flex', flexDirection: isMobile ? 'column' : 'row',
  height: '100vh', width: '100vw', overflow: 'hidden',
});
const leftPanelStyle = {
  flex: 1.2, background: 'linear-gradient(145deg, #7B1F1F 0%, #5A1515 100%)',
  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
};
const patternOverlay = {
  position: 'absolute', inset: 0,
  backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,.06) 0%, transparent 55%),
                    radial-gradient(circle at 80% 20%, rgba(255,255,255,.04) 0%, transparent 50%)`,
  zIndex: 0,
};
const leftContentStyle = { position: 'relative', zIndex: 1, padding: '60px', width: '100%' };
const leftHeadingStyle = {
  fontFamily: 'var(--ff-display)', color: 'white',
  fontSize: '3.2rem', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-.02em', lineHeight: 1.1,
};
const leftSubStyle = { color: 'rgba(255,255,255,.75)', fontSize: '1.05rem', lineHeight: 1.7, margin: 0, maxWidth: 340 };
const mobileHeaderStyle = {
  background: 'linear-gradient(145deg, #7B1F1F 0%, #5A1515 100%)',
  padding: '44px 24px 36px', textAlign: 'center', color: 'white',
};
const rightPanelStyle = (isMobile) => ({
  flex: 1, background: 'var(--cream)', display: 'flex', flexDirection: 'column',
  justifyContent: isMobile ? 'flex-start' : 'center',
  alignItems: isMobile ? 'stretch' : 'center', overflowY: 'auto',
});
const formCardStyle = (isMobile) => ({
  width: '100%', maxWidth: isMobile ? '100%' : 420,
  padding: isMobile ? '32px 22px' : '36px 32px',
  background: isMobile ? 'transparent' : 'white',
  borderRadius: isMobile ? 0 : 20,
  boxShadow: isMobile ? 'none' : '0 8px 40px rgba(90,21,21,.1)',
});
const formTitleStyle = (isMobile) => ({
  fontFamily: 'var(--ff-display)', textAlign: 'center', color: 'var(--maroon)',
  margin: '0 0 6px', fontSize: isMobile ? '1.5rem' : '1.75rem', fontWeight: 700, letterSpacing: '-.01em',
});
const formSubStyle = (isMobile) => ({
  textAlign: 'center', color: 'var(--text-muted)', margin: '0 0 26px', fontSize: isMobile ? '.84rem' : '.9rem',
});
const fieldGroup = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelStyle  = { fontSize: '.82rem', fontWeight: 600, color: 'var(--text-muted)' };
const inputStyle  = {
  padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '.97rem',
  background: 'var(--cream)', outline: 'none', transition: 'border-color .2s, background .2s, box-shadow .2s',
  color: 'var(--text-main)', width: '100%',
};
const submitStyle = {
  background: 'var(--maroon)', color: 'white', padding: '14px', borderRadius: 10,
  border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 6,
  transition: 'background .2s, transform .15s', letterSpacing: '.02em',
};
const successBoxStyle = {
  marginTop: 12, padding: '24px 20px', background: '#f0fdf4',
  border: '1.5px solid #86efac', borderRadius: 14, textAlign: 'center',
};
const eyeBtnStyle = {
  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0,
};
