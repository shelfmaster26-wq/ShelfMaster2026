import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { localDb } from './localDbClient';
import myLogo from './assets/logo.png';
import { useResponsive } from './useResponsive';

const NAV_LINKS = [
  { to: '/student/dashboard', label: 'Home' },
  { to: '/student/catalog',   label: 'Catalog' },
  { to: '/student/ebooks',    label: 'eBooks' },
  { to: '/student/books',     label: 'My Books' },
  { to: '/student/profile',   label: 'Profile' },
];

// Export so pages can offset their content by the exact navbar height
export const NAV_HEIGHT    = 62;  // desktop
export const NAV_HEIGHT_MB = 58;  // mobile

export default function StudentNavbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { isMobile } = useResponsive();

  const [userName,       setUserName]       = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    async function fetchUserName(userId) {
      if (!userId) { setUserName(''); return; }
      const { data } = await localDb.from('users').select('name').eq('auth_id', userId).single();
      setUserName(data?.name || '');
    }
    localDb.auth.getUser().then(({ data: { user } }) => fetchUserName(user?.id));
    const { data: { subscription } } = localDb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUserName('');
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout    = async () => { await localDb.auth.signOut(); navigate('/'); };
  const closeMobileMenu = () => setMobileMenuOpen(false);
  const navH = isMobile ? NAV_HEIGHT_MB : NAV_HEIGHT;

  return (
    <>
      <style>{`
        .sn-link:hover  { color: var(--maroon) !important; background: var(--maroon-tint) !important; }
        .sn-logout:hover { background: var(--maroon) !important; color: white !important; }

        /* Mobile drawer slide-down */
        @keyframes drawerOpen {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sn-mobile-menu { animation: drawerOpen .2s ease forwards; }
      `}</style>

      {/*
        Spacer div so page content is never hidden under the fixed bar.
        Each page doesn't need to add its own padding-top.
      */}
      <div style={{ height: navH }} aria-hidden="true" />

      {/* ── Fixed Navbar ── */}
      <nav style={{
        position:  'fixed',
        top:        0,
        left:       0,
        right:      0,
        zIndex:     1000,
        height:     navH,
        display:   'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding:    isMobile ? '0 16px' : '0 36px',
        background: 'rgba(255,255,255,0.97)',
        backdropFilter:       'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        // Deepen shadow as user scrolls
        boxShadow: scrolled
          ? '0 4px 24px rgba(90,21,21,0.10), 0 1px 0 rgba(0,0,0,0.06)'
          : '0 1px 0 var(--border)',
        transition: 'box-shadow .25s ease',
      }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <img src={myLogo} alt="ShelfMaster Logo"
            style={{ width:36, height:36, objectFit:'contain', borderRadius:8 }} />
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize:   isMobile ? '1.1rem' : '1.15rem',
            fontWeight: 700,
            color:      'var(--maroon)',
            letterSpacing: '-.02em',
          }}>
            ShelfMaster
          </span>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            {NAV_LINKS.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to} className="sn-link" style={{
                  textDecoration: 'none',
                  color:      isActive ? 'var(--maroon)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize:   '.9rem',
                  padding:    '7px 14px',
                  borderRadius: 8,
                  transition: 'all .2s',
                  background: isActive ? 'var(--maroon-tint)' : 'transparent',
                  letterSpacing: '.01em',
                  position: 'relative',
                }}>
                  {link.label}
                  {/* Active underline pip */}
                  {isActive && (
                    <span style={{
                      position: 'absolute', bottom: 2, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 18, height: 2.5,
                      background: 'var(--maroon)',
                      borderRadius: 99,
                    }} />
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Desktop user + logout */}
        {!isMobile && (
          <div style={{
            display:'flex', alignItems:'center', gap:14,
            paddingLeft:18, borderLeft:'1px solid var(--border)',
          }}>
            {userName && (
              <span style={{ color:'var(--maroon)', fontWeight:600, fontSize:'.88rem', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {userName}
              </span>
            )}
            <button onClick={handleLogout} className="sn-logout" style={{
              padding:'7px 16px', borderRadius:8,
              border:'1.5px solid var(--maroon)',
              background:'transparent', color:'var(--maroon)',
              fontWeight:600, cursor:'pointer', fontSize:'.85rem',
              transition:'all .2s',
            }}>
              Logout
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
            style={{
              background:'none', border:'none', cursor:'pointer',
              display:'flex', flexDirection:'column',
              padding:'8px 4px', gap:5,
            }}
          >
            {/* Animated bars */}
            <span style={{
              display:'block', height:2, borderRadius:2,
              background:'var(--maroon)', transition:'all .25s ease',
              width: 22,
              transform: mobileMenuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
            }} />
            <span style={{
              display:'block', height:2, borderRadius:2,
              background:'var(--maroon)', transition:'all .25s ease',
              width: mobileMenuOpen ? 0 : 16,
              opacity: mobileMenuOpen ? 0 : 1,
            }} />
            <span style={{
              display:'block', height:2, borderRadius:2,
              background:'var(--maroon)', transition:'all .25s ease',
              width: 22,
              transform: mobileMenuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
            }} />
          </button>
        )}
      </nav>

      {/* ── Mobile slide-down menu (also fixed, sits below navbar) ── */}
      {isMobile && mobileMenuOpen && (
        <div className="sn-mobile-menu" style={{
          position:  'fixed',
          top:        navH,
          left:       0,
          right:      0,
          zIndex:     999,
          background: 'white',
          borderBottom: '1px solid var(--border)',
          padding:   '10px 16px 16px',
          display:   'flex',
          flexDirection: 'column',
          gap: 4,
          boxShadow: '0 8px 24px rgba(90,21,21,0.10)',
        }}>
          {NAV_LINKS.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to} onClick={closeMobileMenu} style={{
                textDecoration: 'none',
                color:      isActive ? 'var(--maroon)' : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize:   '.95rem',
                padding:    '11px 14px',
                borderRadius: 8,
                background: isActive ? 'var(--maroon-tint)' : 'transparent',
                display:   'block',
              }}>
                {link.label}
              </Link>
            );
          })}

          {/* User + logout */}
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:6,
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            {userName && (
              <span style={{ color:'var(--maroon)', fontWeight:600, fontSize:'.88rem',
                maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {userName}
              </span>
            )}
            <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="sn-logout" style={{
              padding:'7px 16px', borderRadius:8,
              border:'1.5px solid var(--maroon)',
              background:'transparent', color:'var(--maroon)',
              fontWeight:600, cursor:'pointer', fontSize:'.85rem',
              transition:'all .2s', marginLeft:'auto',
            }}>
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );
}