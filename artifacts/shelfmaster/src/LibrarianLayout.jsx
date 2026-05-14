import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { localDb } from './localDbClient';

import { MdClose, MdMenu } from 'react-icons/md';

const SIDEBAR_WIDTH = '240px';

const NAV_ITEMS = [
  { to: '/librarian/dashboard', label: 'Dashboard' },
  { to: '/librarian/inventory', label: 'Inventory' },
  { to: '/librarian/users', label: 'User Management' },
  { to: '/librarian/requests', label: 'Pending Requests', hasBadge: true },
  { to: '/librarian/walkin', label: 'Walk-in Borrowing' },
  { to: '/librarian/returns', label: 'Process Returns' },
  { to: '/librarian/history', label: 'Borrowing History' },
  { to: '/librarian/settings', label: 'Settings' },
];

export default function LibrarianLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prevCountRef = useRef(0);
  const notifPermission = useRef(Notification.permission);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    async function verifyLibrarian() {
      const { data: { user } } = await localDb.auth.getUser();
      if (!user) { navigate('/login', { replace: true }); return; }
      const { data } = await localDb.from('users').select('role').eq('auth_id', user.id).maybeSingle();
      if (!data || data.role !== 'librarian') { navigate('/login', { replace: true }); return; }
      setAuthChecked(true);
    }
    verifyLibrarian();
  }, [navigate]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => { notifPermission.current = p; });
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
    const channel = localDb.channel('pending-requests-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchPendingCount())
      .subscribe();
    return () => localDb.removeChannel(channel);
  }, []);

  async function fetchPendingCount() {
    const { count, error } = await localDb.from('transactions')
      .select('id', { count: 'exact', head: true }).eq('status', 'pending');
    if (!error) {
      const newCount = count || 0;
      if (newCount > prevCountRef.current) fireNotification(newCount - prevCountRef.current);
      prevCountRef.current = newCount;
      setPendingCount(newCount);
    }
  }

  function fireNotification(added) {
    if (notifPermission.current !== 'granted') return;
    new Notification('ShelfMaster — New Borrow Request', {
      body: `${added} new borrow request${added > 1 ? 's' : ''} waiting for your approval.`,
      icon: '/logo.png', badge: '/logo.png',
    });
  }

  const handleLogout = async () => { await localDb.auth.signOut(); navigate('/'); };
  const isOnRequestsPage = location.pathname === '/librarian/requests';

  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cream)' }}>
        <p style={{ color: 'var(--text-faint)', fontFamily: 'var(--ff-display)', fontSize: '1.1rem' }}>Verifying session…</p>
      </div>
    );
  }

  return (
    <div className={`admin-layout${sidebarOpen ? ' sidebar-open' : ''}`}>
      <style>{SIDEBAR_STYLES}</style>

      {/* Hamburger — mobile only */}
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setSidebarOpen(o => !o)}
      >
        {sidebarOpen ? <MdClose /> : <MdMenu />}
      </button>

      {/* Dim overlay behind open drawer on mobile */}
      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      {/* ── SIDEBAR (fixed) ── */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/shelfmaster_logo.png" alt="ShelfMaster" />
          <h2 style={{ margin: 0, fontSize: '1.9rem', fontFamily: 'var(--ff-display)', fontWeight: 700, color: 'white' }}>
            ShelfMaster
          </h2>
          <span style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Librarian Portal
          </span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.to;
            const showBadge = item.hasBadge && pendingCount > 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="sidebar-link"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: isActive ? 'rgba(255,255,255,.15)' : undefined,
                  color: isActive ? 'white' : undefined,
                  borderLeft: isActive ? '3px solid var(--yellow)' : '3px solid transparent',
                }}
              >
                <span>{item.label}</span>
                {showBadge && (
                  <span style={{
                    background: isOnRequestsPage ? 'rgba(255,255,255,.25)' : '#ef4444',
                    color: 'white', fontSize: '.68rem', fontWeight: 800,
                    borderRadius: 999, minWidth: 20, height: 20,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 6px', lineHeight: 1,
                    animation: isOnRequestsPage ? 'none' : 'badgePulse 1.5s infinite',
                  }}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </aside>

      {/* ── MAIN — offset by sidebar width ── */}
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

const SIDEBAR_STYLES = `
  @keyframes badgePulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.18); }
  }

  /* Layout shell */
  .admin-layout {
    display: flex;
    min-height: 100vh;
  }

  /* ── KEY FIX: fixed sidebar ── */
  .sidebar {
    position: fixed;       /* stays put while page content scrolls */
    top: 0;
    left: 0;
    width: ${SIDEBAR_WIDTH};
    height: 100vh;         /* always full viewport height */
    overflow-y: auto;      /* sidebar itself scrolls if nav overflows */
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    z-index: 200;
    transition: transform 220ms cubic-bezier(.4,0,.2,1);
  }

  /* ── KEY FIX: push content right so it isn't hidden under sidebar ── */
  .admin-content {
    margin-left: ${SIDEBAR_WIDTH};
    flex: 1;
    min-height: 100vh;
  }

  /* Hamburger — hidden on desktop */
  .sidebar-toggle {
    display: none;
    position: fixed;
    top: 14px;
    left: 14px;
    z-index: 300;
  }

  /* Overlay — hidden on desktop */
  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.45);
    z-index: 190;
    opacity: 0;
    transition: opacity 220ms;
  }

  /* ── Mobile: drawer behaviour ── */
  @media (max-width: 768px) {
    .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Hide off-screen by default */
    .sidebar {
      transform: translateX(-100%);
    }

    /* Slide in when open */
    .sidebar-open .sidebar {
      transform: translateX(0);
    }

    .sidebar-overlay {
      display: block;
      pointer-events: none;
    }
    .sidebar-open .sidebar-overlay {
      opacity: 1;
      pointer-events: auto;
    }

    /* Full-width content on mobile, with space for hamburger */
    .admin-content {
      margin-left: 0;
      padding-top: 56px;
    }
  }
`;