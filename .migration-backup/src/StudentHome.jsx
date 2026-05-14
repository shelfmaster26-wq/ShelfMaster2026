import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentNavbar from './StudentNavbar';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import { useResponsive } from './useResponsive';
import { FaBook, FaBookOpen, FaCheckCircle, FaFire, FaClock, FaArrowRight, FaSearch, FaCompass, FaLayerGroup } from 'react-icons/fa';

export default function StudentHome() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({ loans: 0, pending: 0 });
  const [popularBooks, setPopularBooks] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await localDb.auth.getUser();
      if (!user) return;
      const [nameRes] = await Promise.all([
        localDb.from('users').select('id, name').eq('auth_id', user.id).single(),
      ]);
      if (nameRes.data?.name) setUserName(nameRes.data.name);
      const usersId = nameRes.data?.id;
      if (!usersId) return;
      const [loansRes, pendingRes] = await Promise.all([
        localDb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', usersId).eq('status', 'borrowed'),
        localDb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', usersId).eq('status', 'pending'),
      ]);
      setStats({ loans: loansRes.count ?? 0, pending: pendingRes.count ?? 0 });
    }
    loadData();
    fetchPopularBooks();
  }, []);

  async function fetchPopularBooks() {
    setPopularLoading(true);
    const { data: txns } = await localDbAdmin
      .from('transactions').select('book_id').in('status', ['borrowed', 'returned']);
    if (!txns || txns.length === 0) {
      const { data: recent } = await localDbAdmin
        .from('books')
        .select('id, title, authors, cover_image, quantity, category, subject_class, book_type')
        .neq('status', 'archived').neq('book_type', 'eBook')
        .order('created_at', { ascending: false }).limit(8);
      setPopularBooks((recent || []).map(b => ({ ...b, borrow_count: 0 })));
      setPopularLoading(false);
      return;
    }
    const countMap = {};
    for (const { book_id } of txns) {
      if (book_id) countMap[book_id] = (countMap[book_id] || 0) + 1;
    }
    const topIds = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
    const { data: books } = await localDbAdmin
      .from('books')
      .select('id, title, authors, cover_image, quantity, category, subject_class, book_type')
      .in('id', topIds).neq('status', 'archived').neq('book_type', 'eBook');
    const sorted = topIds.map(id => {
      const book = (books || []).find(b => b.id === id);
      return book ? { ...book, borrow_count: countMap[id] } : null;
    }).filter(Boolean);
    setPopularBooks(sorted);
    setPopularLoading(false);
  }

  const handleBorrow = (book) => {
    navigate(`/student/catalog?search=${encodeURIComponent(book.title)}`);
  };

  const firstName = userName ? userName.split(',')[1]?.trim().split(' ')[0] || userName.split(' ')[0] : '';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: "'DM Sans', sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* ── Animations ── */
        @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer  { 0%,100% { opacity:.5; } 50% { opacity:1; } }
        @keyframes marquee  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes panelIn  { from { opacity:0; transform: translateY(30px) scale(.97); } to { opacity:1; transform: translateY(0) scale(1); } }

        /* ── Hero ── */
        .hero {
          position: relative;
          background: linear-gradient(145deg, #4a0000 0%, var(--maroon) 45%, #8b0000 100%);
          overflow: hidden;
          padding: ${isMobile ? '56px 20px 130px' : isTablet ? '64px 32px 140px' : '72px 40px 150px'};
          text-align: center;
        }
        .hero::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .hero-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          backdrop-filter: blur(8px);
          color: rgba(255,255,255,0.9);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 20px;
          margin-bottom: 20px;
          opacity: 0;
          animation: fadeUp .5s ease .1s forwards;
        }
        .hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: ${isMobile ? '2rem' : isTablet ? '2.6rem' : '3.2rem'};
          color: white;
          margin: 0 0 14px;
          line-height: 1.15;
          opacity: 0;
          animation: fadeUp .55s ease .2s forwards;
        }
        .hero-title em { font-style: italic; color: var(--yellow); }
        .hero-sub {
          color: rgba(255,255,255,0.72);
          font-size: ${isMobile ? '0.9rem' : '1rem'};
          font-weight: 400;
          margin: 0 0 32px;
          opacity: 0;
          animation: fadeUp .55s ease .3s forwards;
        }
        .hero-cta {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--yellow);
          color: var(--maroon);
          border: none;
          padding: ${isMobile ? '12px 24px' : '14px 30px'};
          border-radius: 50px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: ${isMobile ? '0.88rem' : '0.95rem'};
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          transition: transform .2s ease, box-shadow .2s ease;
          opacity: 0;
          animation: fadeUp .55s ease .4s forwards;
        }
        .hero-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,0,0,0.3); }
        .hero-cta:hover svg { transform: translateX(4px); }
        .hero-cta svg { transition: transform .2s ease; }

        /* ══════════════════════════════════════
           EDITORIAL PANELS  (replaces stat cards)
        ══════════════════════════════════════ */
        .editorial-strip {
          max-width: 960px;
          margin: -72px auto 0;
          padding: 0 ${isMobile ? '14px' : '24px'};
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: ${isMobile ? '1fr' : 'repeat(3,1fr)'};
          gap: ${isMobile ? '10px' : '14px'};
          opacity: 0;
          animation: fadeUp .6s ease .5s forwards;
        }

        .ep {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          min-height: ${isMobile ? '120px' : '164px'};
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: ${isMobile ? '18px 18px 18px' : '24px 22px 22px'};
          box-shadow: 0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
          transition: transform .25s ease, box-shadow .25s ease;
          opacity: 0;
        }
        .ep:hover {
          transform: translateY(-5px) scale(1.01);
          box-shadow: 0 24px 56px rgba(0,0,0,0.22);
        }
        .ep:hover .ep-arrow { transform: translateX(5px); }

        /* Panel-specific gradients */
        .ep-catalog {
          background: linear-gradient(145deg, #7f1d1d 0%, #b91c1c 55%, #c2410c 100%);
          animation: panelIn .5s ease .52s forwards;
        }
        .ep-loans {
          background: linear-gradient(145deg, #064e3b 0%, #065f46 55%, #0f766e 100%);
          animation: panelIn .5s ease .62s forwards;
        }
        .ep-trending {
          background: linear-gradient(145deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%);
          animation: panelIn .5s ease .72s forwards;
        }

        /* Giant decorative watermark text behind the content */
        .ep-watermark {
          position: absolute;
          right: -8px;
          bottom: -14px;
          font-family: 'DM Serif Display', serif;
          font-size: ${isMobile ? '4.5rem' : '5.8rem'};
          font-style: italic;
          color: rgba(255,255,255,0.08);
          line-height: 1;
          pointer-events: none;
          user-select: none;
          white-space: nowrap;
        }

        /* Decorative dot cluster */
        .ep-dots {
          position: absolute;
          top: 14px;
          right: 14px;
          display: grid;
          grid-template-columns: repeat(3,6px);
          gap: 4px;
          opacity: 0.25;
        }
        .ep-dots span {
          width: 5px; height: 5px;
          background: white;
          border-radius: 50%;
          display: block;
        }

        /* Diagonal accent line */
        .ep-line {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 3px;
          background: rgba(255,255,255,0.25);
          border-radius: 20px 20px 0 0;
        }

        .ep-icon-wrap {
          width: ${isMobile ? '32px' : '38px'};
          height: ${isMobile ? '32px' : '38px'};
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: ${isMobile ? '0.85rem' : '1rem'};
          color: white;
          margin-bottom: 10px;
          backdrop-filter: blur(4px);
          flex-shrink: 0;
        }
        .ep-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
          margin-bottom: 3px;
        }
        .ep-title {
          font-family: 'DM Serif Display', serif;
          font-size: ${isMobile ? '1.1rem' : '1.25rem'};
          color: white;
          margin: 0 0 6px;
          line-height: 1.2;
        }
        .ep-sub {
          font-size: ${isMobile ? '0.7rem' : '0.75rem'};
          color: rgba(255,255,255,0.6);
          font-weight: 500;
          margin: 0 0 14px;
          line-height: 1.4;
        }
        .ep-cta-row {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.3px;
        }
        .ep-arrow {
          transition: transform .2s ease;
          font-size: 0.65rem;
        }

        /* ── Genre Marquee ── */
        .marquee-section {
          margin: 28px 0 0;
          overflow: hidden;
          position: relative;
        }
        .marquee-section::before,
        .marquee-section::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 60px;
          z-index: 2;
          pointer-events: none;
        }
        .marquee-section::before { left: 0; background: linear-gradient(90deg, var(--cream), transparent); }
        .marquee-section::after  { right:0; background: linear-gradient(-90deg, var(--cream), transparent); }

        .marquee-track {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: marquee 28s linear infinite;
          padding: 8px 0;
        }
        .marquee-track:hover { animation-play-state: paused; }

        .genre-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 16px;
          border-radius: 50px;
          font-size: 0.78rem;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          border: 1.5px solid transparent;
          transition: transform .18s ease, box-shadow .18s ease;
          flex-shrink: 0;
        }
        .genre-pill:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
        }

        /* ── Section ── */
        .section-wrap {
          max-width: 1200px;
          margin: 0 auto;
          padding: ${isMobile ? '48px 16px 48px' : isTablet ? '56px 24px 56px' : '64px 32px 64px'};
        }
        .section-head {
          display: flex;
          align-items: ${isMobile ? 'flex-start' : 'flex-end'};
          justify-content: space-between;
          margin-bottom: 28px;
          flex-direction: ${isMobile ? 'column' : 'row'};
          gap: 14px;
        }
        .section-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--maroon);
          margin-bottom: 6px;
        }
        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: ${isMobile ? '1.5rem' : isTablet ? '1.75rem' : '2rem'};
          color: #0f172a;
          margin: 0;
          line-height: 1.2;
        }
        .section-sub {
          color: #64748b;
          font-size: 0.88rem;
          margin: 4px 0 0;
          font-weight: 400;
        }
        .view-all-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: none;
          border: 1.5px solid #e2e8f0;
          color: #475569;
          padding: 9px 18px;
          border-radius: 50px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color .2s, color .2s, background .2s;
          flex-shrink: 0;
        }
        .view-all-btn:hover {
          border-color: var(--maroon);
          color: var(--maroon);
          background: rgba(127,29,29,0.04);
        }
        .view-all-btn:hover svg { transform: translateX(3px); }
        .view-all-btn svg { transition: transform .2s ease; }

        /* ── Book grid ── */
        .books-grid {
          display: grid;
          grid-template-columns: ${isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(4,1fr)'};
          gap: ${isMobile ? '12px' : '20px'};
        }

        /* ── Book card ── */
        .book-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          transition: transform .22s ease, box-shadow .22s ease;
          opacity: 0;
        }
        .book-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.12);
        }
        .book-cover {
          position: relative;
          height: ${isMobile ? '140px' : '185px'};
          background: #f8fafc;
          flex-shrink: 0;
          overflow: hidden;
        }
        .book-cover img { width:100%; height:100%; object-fit:cover; display:block; transition: transform .4s ease; }
        .book-card:hover .book-cover img { transform: scale(1.05); }
        .rank-badge {
          position: absolute; top: 10px; left: 10px; z-index: 2;
          font-size: 0.65rem; font-weight: 800;
          padding: 3px 9px; border-radius: 20px;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          letter-spacing: 0.3px;
        }
        .avail-badge {
          position: absolute; bottom: 10px; right: 10px;
          font-size: 0.62rem; font-weight: 700;
          padding: 3px 8px; border-radius: 20px;
          color: white;
        }
        .book-body {
          padding: ${isMobile ? '12px 12px 14px' : '14px 16px 16px'};
          flex: 1; display: flex; flex-direction: column;
        }
        .book-title {
          font-weight: 700;
          font-size: ${isMobile ? '0.78rem' : '0.88rem'};
          color: #0f172a;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 0 0 4px;
        }
        .book-author {
          font-size: ${isMobile ? '0.68rem' : '0.74rem'};
          color: #94a3b8;
          margin: 0 0 12px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-weight: 500;
        }
        .borrow-count {
          font-size: 0.68rem;
          color: #cbd5e1;
          font-weight: 500;
          display: flex; align-items: center; gap: 4px;
          margin-bottom: 10px;
        }
        .borrow-btn {
          width: 100%;
          padding: ${isMobile ? '7px 0' : '8px 0'};
          border: none; border-radius: 9px;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: ${isMobile ? '0.72rem' : '0.78rem'};
          cursor: pointer;
          transition: opacity .15s, transform .15s;
          margin-top: auto;
          display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .borrow-btn:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
        .borrow-btn:disabled { cursor: not-allowed; }

        /* ── Skeleton ── */
        .skeleton {
          border-radius: 16px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% auto;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        /* ── Empty ── */
        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 64px 24px;
          background: white;
          border-radius: 16px;
          color: #94a3b8;
          border: 1.5px dashed #e2e8f0;
        }
        .empty-state-icon { font-size: 2.5rem; margin-bottom: 14px; opacity: .4; }
      `}</style>

      <StudentNavbar />

      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-orb" style={{ width:320, height:320, background:'rgba(255,200,0,0.12)', top:-80, right:-60 }} />
        <div className="hero-orb" style={{ width:260, height:260, background:'rgba(255,255,255,0.06)', bottom:-80, left:-40 }} />

        <div style={{ position:'relative', zIndex:2, maxWidth:640, margin:'0 auto' }}>
          <div className="hero-eyebrow">
            <FaBook style={{ fontSize:'0.7rem' }} /> Baliwasan Senior High School - Stand Alone Libray System
          </div>
          <h1 className="hero-title">
            {firstName ? <>Welcome back, <em>{firstName}</em>.</> : <>Your library, <em>always open.</em></>}
          </h1>
          <p className="hero-sub">Discover thousands of books. Borrow, explore, and learn — all in one place.</p>
          <button className="hero-cta" onClick={() => navigate('/student/catalog')}>
            <FaSearch style={{ fontSize:'0.85rem' }} />
            Browse the Catalog
            <FaArrowRight style={{ fontSize:'0.8rem' }} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          EDITORIAL PANELS — replaces stat cards
      ══════════════════════════════════════ */}
      <div className="editorial-strip">

        {/* Panel 1 — Catalog */}
        <div className="ep ep-catalog" onClick={() => navigate('/student/catalog')}>
          <div className="ep-line" />
          <div className="ep-dots">
            {[...Array(9)].map((_, i) => <span key={i} />)}
          </div>
          <div className="ep-watermark">Search</div>

          <div style={{ position:'relative', zIndex:2 }}>
            <div className="ep-icon-wrap"><FaCompass /></div>
            <div className="ep-label">Explore</div>
            <h3 className="ep-title">Book Catalog</h3>
            <p className="ep-sub">Search thousands of titles, filter by subject or genre</p>
            <div className="ep-cta-row">
              Open catalog <FaArrowRight className="ep-arrow" />
            </div>
          </div>
        </div>

        {/* Panel 2 — My Loans */}
        <div className="ep ep-loans" onClick={() => navigate('/student/books')}>
          <div className="ep-line" />
          <div className="ep-dots">
            {[...Array(9)].map((_, i) => <span key={i} />)}
          </div>
          <div className="ep-watermark">Loans</div>

          <div style={{ position:'relative', zIndex:2 }}>
            <div className="ep-icon-wrap"><FaBook /></div>
            <div className="ep-label">My Library</div>
            <h3 className="ep-title">My Books</h3>
            <p className="ep-sub">
              {stats.loans} active loan{stats.loans !== 1 ? 's' : ''} · {stats.pending} pending
            </p>
            <div className="ep-cta-row">
              View history <FaArrowRight className="ep-arrow" />
            </div>
          </div>
        </div>

        {/* Panel 3 — Trending */}
        <div className="ep ep-trending" onClick={() => {
          document.querySelector('.section-wrap')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <div className="ep-line" />
          <div className="ep-dots">
            {[...Array(9)].map((_, i) => <span key={i} />)}
          </div>
          <div className="ep-watermark">Hot</div>

          <div style={{ position:'relative', zIndex:2 }}>
            <div className="ep-icon-wrap"><FaFire /></div>
            <div className="ep-label">This Week</div>
            <h3 className="ep-title">Trending Now</h3>
            <p className="ep-sub">Most borrowed titles by students this week</p>
            <div className="ep-cta-row">
              See what's hot <FaArrowRight className="ep-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Genre Marquee ── */}
      <div className="marquee-section" style={{ marginTop: 28 }}>
        <div className="marquee-track">
          {[
            { label: '📚 Fiction',        bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
            { label: '🔬 Science',        bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
            { label: '🌍 History',        bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0' },
            { label: '🧮 Mathematics',    bg: '#faf5ff', color: '#581c87', border: '#e9d5ff' },
            { label: '🎨 Arts',           bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
            { label: '💡 Philosophy',     bg: '#f0fdfa', color: '#134e4a', border: '#99f6e4' },
            { label: '🏛️ Social Studies', bg: '#fffbeb', color: '#78350f', border: '#fde68a' },
            { label: '🌐 Technology',     bg: '#f0f9ff', color: '#0c4a6e', border: '#bae6fd' },
            { label: '📖 Literature',     bg: '#fdf4ff', color: '#701a75', border: '#f5d0fe' },
            { label: '🧬 Biology',        bg: '#f0fdf4', color: '#166534', border: '#86efac' },
            { label: '⚗️ Chemistry',      bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
            { label: '🌏 Geography',      bg: '#ecfeff', color: '#164e63', border: '#a5f3fc' },
          ].concat([
            // duplicate for seamless loop
            { label: '📚 Fiction',        bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
            { label: '🔬 Science',        bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
            { label: '🌍 History',        bg: '#f0fdf4', color: '#14532d', border: '#bbf7d0' },
            { label: '🧮 Mathematics',    bg: '#faf5ff', color: '#581c87', border: '#e9d5ff' },
            { label: '🎨 Arts',           bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
            { label: '💡 Philosophy',     bg: '#f0fdfa', color: '#134e4a', border: '#99f6e4' },
            { label: '🏛️ Social Studies', bg: '#fffbeb', color: '#78350f', border: '#fde68a' },
            { label: '🌐 Technology',     bg: '#f0f9ff', color: '#0c4a6e', border: '#bae6fd' },
            { label: '📖 Literature',     bg: '#fdf4ff', color: '#701a75', border: '#f5d0fe' },
            { label: '🧬 Biology',        bg: '#f0fdf4', color: '#166534', border: '#86efac' },
            { label: '⚗️ Chemistry',      bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
            { label: '🌏 Geography',      bg: '#ecfeff', color: '#164e63', border: '#a5f3fc' },
          ]).map((g, i) => (
            <div
              key={i}
              className="genre-pill"
              style={{ background: g.bg, color: g.color, borderColor: g.border }}
              onClick={() => navigate(`/student/catalog?search=${encodeURIComponent(g.label.replace(/^.+? /, ''))}`)}
            >
              {g.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Popular Books ── */}
      <div className="section-wrap">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">
              <FaFire style={{ color:'#f97316' }} /> Trending this week
            </div>
            <h2 className="section-title">Most Popular Books</h2>
            <p className="section-sub">Top titles borrowed by students</p>
          </div>
          <button className="view-all-btn" onClick={() => navigate('/student/catalog')}>
            View All <FaArrowRight style={{ fontSize:'0.72rem' }} />
          </button>
        </div>

        {popularLoading ? (
          <div className="books-grid">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: isMobile ? 220 : 280, animationDelay: `${i * 0.07}s` }} />
            ))}
          </div>
        ) : popularBooks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><FaBook /></div>
            <p style={{ margin:'0 0 6px', fontWeight:600, color:'#64748b', fontSize:'1rem' }}>No borrowing history yet</p>
            <p style={{ margin:0, fontSize:'0.85rem' }}>Be the first to request a book!</p>
          </div>
        ) : (
          <div className="books-grid">
            {popularBooks.map((book, index) => {
              const isAvailable = (book.quantity ?? 0) > 0;
              const rankColor = index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#cbd5e1';
              const delay = `${0.06 + index * 0.055}s`;
              return (
                <div key={book.id} className="book-card"
                  style={{ animationName:'fadeUp', animationDuration:'.45s', animationTimingFunction:'ease', animationFillMode:'forwards', animationDelay: delay }}
                  onClick={() => handleBorrow(book)}>

                  <div className="book-cover">
                    <div className="rank-badge" style={{ background: rankColor }}>#{index + 1}</div>
                    {book.cover_image ? (
                      <>
                        <img src={book.cover_image} alt={book.title}
                          onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        <div style={{
                          width:'100%', height:'100%', display:'none',
                          background:'linear-gradient(145deg,#4a0000,#7f1d1d 50%,#1e3a5f)',
                          flexDirection:'column', alignItems:'center', justifyContent:'center',
                          padding:16, boxSizing:'border-box',
                        }}>
                          <FaBook style={{ fontSize:'2rem', color:'rgba(255,255,255,0.5)', marginBottom:8 }} />
                          <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.8)', textAlign:'center', fontWeight:600, lineHeight:1.3 }}>{book.title}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{
                        width:'100%', height:'100%',
                        background:'linear-gradient(145deg,#4a0000,#7f1d1d 50%,#1e3a5f)',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        padding:16, boxSizing:'border-box',
                      }}>
                        <FaBook style={{ fontSize:'2rem', color:'rgba(255,255,255,0.5)', marginBottom:8 }} />
                        <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.8)', textAlign:'center', fontWeight:600, lineHeight:1.3 }}>{book.title}</span>
                      </div>
                    )}
                    <div className="avail-badge" style={{ background: isAvailable ? '#15803d' : '#dc2626' }}>
                      {isAvailable ? 'Available' : 'Out'}
                    </div>
                  </div>

                  <div className="book-body">
                    <p className="book-title">{book.title}</p>
                    <p className="book-author">{book.authors || 'Unknown Author'}</p>
                    {!isMobile && (
                      <div className="borrow-count">
                        <FaBookOpen /> {book.borrow_count} {book.borrow_count === 1 ? 'borrow' : 'borrows'}
                      </div>
                    )}
                    <button className="borrow-btn"
                      onClick={e => { e.stopPropagation(); handleBorrow(book); }}
                      disabled={!isAvailable}
                      style={{
                        background: isAvailable ? 'var(--maroon)' : '#f1f5f9',
                        color: isAvailable ? 'white' : '#94a3b8',
                      }}>
                      {isAvailable ? <>Borrow <FaArrowRight style={{ fontSize:'0.65rem' }} /></> : 'Unavailable'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}