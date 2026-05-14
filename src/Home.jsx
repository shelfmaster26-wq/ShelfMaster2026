import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { localDb } from './localDbClient';
import BookLoader from './BookLoader';
import { localDbAdmin } from './localDbAdmin';
import { useResponsive } from './useResponsive';
import { MdClose } from 'react-icons/md';
import {
  FaBook, FaBookOpen, FaSearch, FaArrowRight, FaCompass,
  FaEnvelope, FaPhone, FaMapMarkerAlt, FaShieldAlt,
  FaBolt, FaChartBar, FaArchive, FaFire,
} from 'react-icons/fa';

/* ─────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  :root {
    --maroon:       #7B1F1F;
    --maroon-deep:  #4a0000;
    --maroon-mid:   #8b0000;
    --cream:        #FDF8F2;
    --cream-dark:   #F2EAE0;
    --yellow:       #D4A843;
    --yellow-soft:  #FBF4E3;
    --green:        #15803d;
    --green-soft:   #EBF5ED;
    --slate:        #64748b;
    --ink:          #0f172a;
    --border:       #e2e8f0;
    --shadow-sm:    0 2px 12px rgba(0,0,0,.06);
    --shadow-md:    0 8px 32px rgba(0,0,0,.10);
    --shadow-lg:    0 20px 60px rgba(0,0,0,.14);
    --ff-display:   'DM Serif Display', Georgia, serif;
    --ff-body:      'DM Sans', system-ui, sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: var(--ff-body); background: var(--cream); color: var(--ink); margin: 0; }
  .home-container { overflow-x: hidden; }

  /* ── Animations ── */
  @keyframes fadeUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes shimmer  { 0%,100% { background-position: 200% center; } }
  @keyframes marquee  { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  @keyframes panelIn  { from { opacity:0; transform:translateY(30px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(21,128,61,.4)} 50%{box-shadow:0 0 0 6px rgba(21,128,61,0)} }
  @keyframes pulse    { 0%,100%{opacity:.5} 50%{opacity:1} }

  .fade-up   { opacity:0; animation: fadeUp .55s ease both; }
  .fade-up-1 { animation-delay: .08s; }
  .fade-up-2 { animation-delay: .18s; }
  .fade-up-3 { animation-delay: .28s; }
  .fade-up-4 { animation-delay: .40s; }

  /* ── Hero ── */
  .hero {
    position: relative;
    background: linear-gradient(145deg, #4a0000 0%, var(--maroon) 45%, #8b0000 100%);
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }
  .hero-wave::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0; right: 0;
    height: 56px;
    background: var(--cream);
    clip-path: ellipse(55% 100% at 50% 100%);
    z-index: 2;
  }
  .hero-orb {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    filter: blur(60px);
  }

  /* ── Editorial Panels ── */
  .ep {
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    box-shadow: 0 12px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.1);
    transition: transform .25s ease, box-shadow .25s ease;
    opacity: 0;
  }
  .ep:hover { transform: translateY(-5px) scale(1.01); box-shadow: 0 24px 56px rgba(0,0,0,.22); }
  .ep:hover .ep-arrow { transform: translateX(5px); }
  .ep-catalog  { background: linear-gradient(145deg, #7f1d1d 0%, #b91c1c 55%, #c2410c 100%); animation: panelIn .5s ease .52s forwards; }
  .ep-loans    { background: linear-gradient(145deg, #064e3b 0%, #065f46 55%, #0f766e 100%); animation: panelIn .5s ease .62s forwards; }
  .ep-trending { background: linear-gradient(145deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%); animation: panelIn .5s ease .72s forwards; }
  .ep-watermark {
    position: absolute; right: -8px; bottom: -14px;
    font-family: var(--ff-display); font-style: italic;
    color: rgba(255,255,255,.08); line-height: 1;
    pointer-events: none; user-select: none; white-space: nowrap;
  }
  .ep-dots { position:absolute; top:14px; right:14px; display:grid; grid-template-columns:repeat(3,6px); gap:4px; opacity:.25; }
  .ep-dots span { width:5px; height:5px; background:white; border-radius:50%; display:block; }
  .ep-line { position:absolute; top:0; left:0; width:100%; height:3px; background:rgba(255,255,255,.25); border-radius:20px 20px 0 0; }
  .ep-icon-wrap {
    background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.2);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: white; flex-shrink: 0;
    backdrop-filter: blur(4px);
  }
  .ep-label { font-size:.62rem; font-weight:700; letter-spacing:1.6px; text-transform:uppercase; color:rgba(255,255,255,.55); margin-bottom:3px; }
  .ep-title { font-family:var(--ff-display); color:white; margin:0 0 6px; line-height:1.2; }
  .ep-sub { color:rgba(255,255,255,.6); font-weight:500; margin:0 0 14px; line-height:1.4; }
  .ep-cta-row { display:flex; align-items:center; gap:6px; font-size:.75rem; font-weight:700; color:rgba(255,255,255,.9); letter-spacing:.3px; }
  .ep-arrow { transition: transform .2s ease; font-size:.65rem; }

  /* ── Marquee ── */
  .marquee-section { overflow:hidden; position:relative; }
  .marquee-section::before,
  .marquee-section::after {
    content:''; position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none;
  }
  .marquee-section::before { left:0; background:linear-gradient(90deg,var(--cream),transparent); }
  .marquee-section::after  { right:0; background:linear-gradient(-90deg,var(--cream),transparent); }
  .marquee-track { display:flex; gap:10px; width:max-content; animation:marquee 28s linear infinite; padding:8px 0; }
  .marquee-track:hover { animation-play-state:paused; }
  .genre-pill {
    display:inline-flex; align-items:center; gap:7px;
    padding:7px 16px; border-radius:50px;
    font-size:.78rem; font-weight:600; white-space:nowrap; cursor:pointer;
    border:1.5px solid transparent;
    transition:transform .18s ease, box-shadow .18s ease; flex-shrink:0;
  }
  .genre-pill:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(0,0,0,.12); }

  /* ── Section ── */
  .section-eyebrow { display:inline-flex; align-items:center; gap:6px; font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--maroon); margin-bottom:6px; }
  .section-title { font-family:var(--ff-display); color:var(--ink); margin:0; line-height:1.2; }

  /* ── Book Cards ── */
  .book-card {
    background:white; border-radius:16px; overflow:hidden;
    box-shadow: var(--shadow-sm); border:1px solid #f1f5f9;
    display:flex; flex-direction:column; cursor:pointer;
    transition: transform .22s ease, box-shadow .22s ease;
    opacity:0;
  }
  .book-card:hover { transform:translateY(-5px); box-shadow:0 16px 40px rgba(0,0,0,.12); }
  .book-cover { position:relative; background:#f8fafc; flex-shrink:0; overflow:hidden; }
  .book-cover img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .4s ease; }
  .book-card:hover .book-cover img { transform:scale(1.05); }
  .avail-badge { position:absolute; bottom:10px; right:10px; font-size:.62rem; font-weight:700; padding:3px 8px; border-radius:20px; color:white; }
  .badge-avail { animation: badgePulse 2.2s ease infinite; }
  .book-body { flex:1; display:flex; flex-direction:column; }
  .book-title {
    font-weight:700; color:var(--ink); line-height:1.35;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin:0 0 4px;
  }
  .book-author { color:#94a3b8; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0; }
  .cat-badge { font-weight:700; text-transform:uppercase; letter-spacing:.05em; align-self:flex-start; }

  /* ── Feature Cards ── */
  .feat-card {
    background:white; border-radius:16px; box-shadow:var(--shadow-sm);
    border:1px solid #f1f5f9;
    transition: transform .2s ease, box-shadow .2s ease;
  }
  .feat-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-md); }

  /* ── Skeleton ── */
  .skeleton {
    border-radius:16px;
    background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
    background-size:200% auto;
    animation: shimmer 1.5s ease-in-out infinite;
  }

  /* ── CTA button ── */
  .hero-cta {
    display:inline-flex; align-items:center; gap:10px;
    background:var(--yellow); color:var(--maroon-deep);
    border:none; border-radius:50px; font-family:var(--ff-body);
    font-weight:700; cursor:pointer;
    box-shadow:0 8px 24px rgba(0,0,0,.25);
    transition:transform .2s ease, box-shadow .2s ease;
  }
  .hero-cta:hover { transform:translateY(-2px); box-shadow:0 14px 32px rgba(0,0,0,.3); }
  .hero-cta:hover .cta-arrow { transform:translateX(4px); }
  .cta-arrow { transition:transform .2s ease; }

  /* ── View All ── */
  .view-all-btn {
    display:inline-flex; align-items:center; gap:8px;
    background:none; border:1.5px solid #e2e8f0; color:#475569;
    padding:9px 18px; border-radius:50px; font-family:var(--ff-body);
    font-weight:600; font-size:.82rem; cursor:pointer; white-space:nowrap;
    transition:border-color .2s, color .2s, background .2s; flex-shrink:0;
  }
  .view-all-btn:hover { border-color:var(--maroon); color:var(--maroon); background:rgba(127,29,29,.04); }
`;

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: FaArchive,  title: 'Centralized Records', desc: 'Every book, every detail — one unified system.' },
  { icon: FaBolt,     title: 'Faster Transactions',  desc: 'Borrow and return with near-instant processing.' },
  { icon: FaChartBar, title: 'Reports & Analytics',  desc: 'Generate detailed, exportable PDF reports.' },
  { icon: FaShieldAlt,title: 'Secure Access',        desc: 'Role-based permissions protect your data.' },
];

const GENRES = [
  { label: '📚 Fiction',         bg:'#fef3c7', color:'#92400e', border:'#fde68a' },
  { label: '🔬 Science',         bg:'#eff6ff', color:'#1e40af', border:'#bfdbfe' },
  { label: '🌍 History',         bg:'#f0fdf4', color:'#14532d', border:'#bbf7d0' },
  { label: '🧮 Mathematics',     bg:'#faf5ff', color:'#581c87', border:'#e9d5ff' },
  { label: '🎨 Arts',            bg:'#fff1f2', color:'#9f1239', border:'#fecdd3' },
  { label: '💡 Philosophy',      bg:'#f0fdfa', color:'#134e4a', border:'#99f6e4' },
  { label: '🏛️ Social Studies',  bg:'#fffbeb', color:'#78350f', border:'#fde68a' },
  { label: '🌐 Technology',      bg:'#f0f9ff', color:'#0c4a6e', border:'#bae6fd' },
  { label: '📖 Literature',      bg:'#fdf4ff', color:'#701a75', border:'#f5d0fe' },
  { label: '🧬 Biology',         bg:'#f0fdf4', color:'#166534', border:'#86efac' },
  { label: '⚗️ Chemistry',       bg:'#fff7ed', color:'#9a3412', border:'#fed7aa' },
  { label: '🌏 Geography',       bg:'#ecfeff', color:'#164e63', border:'#a5f3fc' },
];

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();
  const [content, setContent]           = useState({});
  const [loading, setLoading]           = useState(true);
  const [books, setBooks]               = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [booksLoading, setBooksLoading] = useState(true);
  const catalogRef = useRef(null);

  useEffect(() => {
    async function fetchSiteContent() {
      const { data, error } = await localDb.from('site_content').select('*').limit(1).single();
      if (!error && data) setContent(data);
      setLoading(false);
    }
    fetchSiteContent();
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setBooksLoading(true);
    const { data } = await localDbAdmin
      .from('books')
      .select('id, title, authors, cover_image, quantity, category, subject_class')
      .neq('status', 'archived')
      .order('title', { ascending: true });
    setBooks(data || []);
    setBooksLoading(false);
  }

  const filteredBooks = books.filter(book => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      book.title?.toLowerCase().includes(s) ||
      book.authors?.toLowerCase().includes(s) ||
      (book.category || book.subject_class || '').toLowerCase().includes(s)
    );
  });

  const scrollToCatalog = () =>
    setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  const handleSearch = (e) => { e.preventDefault(); scrollToCatalog(); };

  const bookCols = isMobile
    ? 'repeat(2, 1fr)'
    : isTablet
    ? 'repeat(3, 1fr)'
    : 'repeat(4, 1fr)';

  const heroVpad = isMobile ? '56px 20px 130px' : isTablet ? '64px 32px 140px' : '72px 48px 150px';

  if (loading) return (
    <React.Fragment>
      <style>{STYLES}</style>
      <BookLoader message="Opening the shelves" />
    </React.Fragment>
  );

  return (
    <React.Fragment>
      <style>{STYLES}</style>
      <div className="home-container">

        {/* ══ HERO ══ */}
        <section className="hero hero-wave" style={{ padding: heroVpad }}>
          {/* Background banner overlay */}
          {content.hero_banner_url && (
            <>
              <div style={{ position:'absolute', inset:0, zIndex:0,
                backgroundImage:`url(${content.hero_banner_url})`,
                backgroundSize:'cover', backgroundPosition:'center' }} />
              <div style={{ position:'absolute', inset:0, background:'rgba(74,0,0,.82)', zIndex:1 }} />
            </>
          )}

          {/* Decorative orbs */}
          <div className="hero-orb" style={{ width:320, height:320, background:'rgba(255,200,0,.12)', top:-80, right:-60 }} />
          <div className="hero-orb" style={{ width:260, height:260, background:'rgba(255,255,255,.06)', bottom:-80, left:-40 }} />

          <div style={{ position:'relative', zIndex:3, maxWidth:700, margin:'0 auto', textAlign:'center' }}>
            {/* Eyebrow */}
            <div className="fade-up" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)',
              backdropFilter:'blur(8px)', color:'rgba(255,255,255,.9)',
              fontSize:isMobile?'.72rem':'.78rem', fontWeight:600,
              letterSpacing:'1.4px', textTransform:'uppercase',
              padding:'6px 14px', borderRadius:20, marginBottom:20,
            }}>
              <FaBook style={{ fontSize:'.7rem' }} />
              Baliwasan Senior High School — Stand Alone Library System
            </div>

            {/* Title */}
            <h1 className="fade-up fade-up-1" style={{
              fontFamily:'var(--ff-display)',
              fontSize: isMobile ? '2.2rem' : isTablet ? '3rem' : '3.8rem',
              fontWeight:400, lineHeight:1.1, margin:'0 0 16px', color:'white',
            }}>
              {content.tagline
                ? content.tagline
                : <><em style={{ fontStyle:'italic', color:'var(--yellow)' }}>Master</em> Every Shelf</>
              }
            </h1>

            {/* Sub */}
            <p className="fade-up fade-up-2" style={{
              fontSize: isMobile ? '.9rem' : '1rem', color:'rgba(255,255,255,.72)',
              lineHeight:1.7, margin:'0 0 32px',
            }}>
              A smart, centralized library system built for faster borrowing,
              real-time availability, and effortless management.
            </p>

            {/* CTAs */}
            <div className="fade-up fade-up-3" style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
              <Link to="/login" style={{ textDecoration:'none' }}>
                <button className="hero-cta" style={{ padding: isMobile ? '12px 24px' : '14px 30px', fontSize: isMobile ? '.88rem' : '.95rem' }}>
                  <FaCompass style={{ fontSize:'.85rem' }} />
                  Get Started
                  <FaArrowRight className="cta-arrow" style={{ fontSize:'.8rem' }} />
                </button>
              </Link>
              <button onClick={scrollToCatalog} style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'transparent', color:'white',
                border:'1.5px solid rgba(255,255,255,.3)', borderRadius:50,
                padding: isMobile ? '12px 24px' : '14px 30px',
                fontSize: isMobile ? '.88rem' : '.95rem',
                fontFamily:'var(--ff-body)', fontWeight:600, cursor:'pointer',
                transition:'border-color .2s, background .2s',
              }}>
                <FaSearch style={{ fontSize:'.8rem' }} />
                Browse Collection
              </button>
            </div>

            {/* Stats */}
            {!booksLoading && (
              <div className="fade-up fade-up-4" style={{ display:'flex', gap:32, marginTop:44, justifyContent:'center' }}>
                {[
                  { value: books.length, label: 'Total Books' },
                  { value: books.filter(b => (b.quantity ?? 0) > 0).length, label: 'Available' },
                  { value: [...new Set(books.map(b => b.category || b.subject_class).filter(Boolean))].length, label: 'Categories' },
                ].map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width:1, background:'rgba(255,255,255,.22)', alignSelf:'stretch' }} />}
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--ff-display)', fontSize: isMobile ? '1.6rem' : '2rem', fontWeight:700, color:'white', lineHeight:1 }}>
                        {s.value.toLocaleString()}
                      </div>
                      <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.5)', marginTop:4, fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase' }}>
                        {s.label}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ══ EDITORIAL PANELS ══ */}
        <div style={{
          maxWidth:960, margin: isMobile ? '-60px auto 0' : '-72px auto 0',
          padding: `0 ${isMobile ? '14px' : '24px'}`,
          position:'relative', zIndex:10,
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
          gap: isMobile ? '10px' : '14px',
          opacity:0,
          animation:'fadeUp .6s ease .5s forwards',
        }}>
          {/* Catalog */}
          <div className="ep ep-catalog" style={{ minHeight: isMobile?120:164, padding: isMobile?'18px':'24px 22px 22px' }}
            onClick={() => navigate('/login')}>
            <div className="ep-line" />
            <div className="ep-dots">{[...Array(9)].map((_,i)=><span key={i}/>)}</div>
            <div className="ep-watermark" style={{ fontSize: isMobile?'4.5rem':'5.8rem' }}>Search</div>
            <div style={{ position:'relative', zIndex:2 }}>
              <div className="ep-icon-wrap" style={{ width: isMobile?32:38, height: isMobile?32:38, fontSize: isMobile?'.85rem':'1rem', marginBottom:10 }}><FaCompass /></div>
              <div className="ep-label">Explore</div>
              <h3 className="ep-title" style={{ fontSize: isMobile?'1.1rem':'1.25rem' }}>Book Catalog</h3>
              <p className="ep-sub" style={{ fontSize: isMobile?'.7rem':'.75rem' }}>Search thousands of titles, filter by subject or genre</p>
              <div className="ep-cta-row">Open catalog <FaArrowRight className="ep-arrow" /></div>
            </div>
          </div>

          {/* Sign In */}
          <div className="ep ep-loans" style={{ minHeight: isMobile?120:164, padding: isMobile?'18px':'24px 22px 22px' }}
            onClick={() => navigate('/login')}>
            <div className="ep-line" />
            <div className="ep-dots">{[...Array(9)].map((_,i)=><span key={i}/>)}</div>
            <div className="ep-watermark" style={{ fontSize: isMobile?'4.5rem':'5.8rem' }}>Borrow</div>
            <div style={{ position:'relative', zIndex:2 }}>
              <div className="ep-icon-wrap" style={{ width: isMobile?32:38, height: isMobile?32:38, fontSize: isMobile?'.85rem':'1rem', marginBottom:10 }}><FaBook /></div>
              <div className="ep-label">My Library</div>
              <h3 className="ep-title" style={{ fontSize: isMobile?'1.1rem':'1.25rem' }}>Sign In</h3>
              <p className="ep-sub" style={{ fontSize: isMobile?'.7rem':'.75rem' }}>Access your account to borrow &amp; track your books</p>
              <div className="ep-cta-row">Go to login <FaArrowRight className="ep-arrow" /></div>
            </div>
          </div>

          {/* Collection */}
          <div className="ep ep-trending" style={{ minHeight: isMobile?120:164, padding: isMobile?'18px':'24px 22px 22px' }}
            onClick={scrollToCatalog}>
            <div className="ep-line" />
            <div className="ep-dots">{[...Array(9)].map((_,i)=><span key={i}/>)}</div>
            <div className="ep-watermark" style={{ fontSize: isMobile?'4.5rem':'5.8rem' }}>Browse</div>
            <div style={{ position:'relative', zIndex:2 }}>
              <div className="ep-icon-wrap" style={{ width: isMobile?32:38, height: isMobile?32:38, fontSize: isMobile?'.85rem':'1rem', marginBottom:10 }}><FaFire /></div>
              <div className="ep-label">Collection</div>
              <h3 className="ep-title" style={{ fontSize: isMobile?'1.1rem':'1.25rem' }}>Browse Books</h3>
              <p className="ep-sub" style={{ fontSize: isMobile?'.7rem':'.75rem' }}>Explore our entire physical book collection below</p>
              <div className="ep-cta-row">See collection <FaArrowRight className="ep-arrow" /></div>
            </div>
          </div>
        </div>

        {/* ══ GENRE MARQUEE ══ */}
        <div className="marquee-section" style={{ marginTop:28, marginBottom:0 }}>
          <div className="marquee-track">
            {[...GENRES, ...GENRES].map((g, i) => (
              <div key={i} className="genre-pill"
                style={{ background:g.bg, color:g.color, borderColor:g.border }}
                onClick={() => { setSearchTerm(g.label.replace(/^.+? /,'')); scrollToCatalog(); }}>
                {g.label}
              </div>
            ))}
          </div>
        </div>

        {/* ══ SEARCH ══ */}
        <section style={{ background:'var(--cream)', padding: isMobile ? '32px 16px 20px' : '40px 32px 24px' }}>
          <div style={{ maxWidth:860, margin:'0 auto' }}>
            <p style={{
              textAlign:'center', fontFamily:'var(--ff-display)',
              color:'var(--maroon)', fontSize: isMobile?'.8rem':'.85rem', fontWeight:600,
              letterSpacing:'.12em', textTransform:'uppercase', marginBottom:14,
            }}>
              Search the Collection
            </p>
            <form onSubmit={handleSearch} style={{
              display:'flex', gap: isMobile?8:12, background:'white',
              padding: isMobile?'10px 14px':'12px 18px', borderRadius:50,
              boxShadow:'0 4px 24px rgba(123,31,31,.08)', border:'1.5px solid #f0e9df',
            }}>
              <FaSearch style={{ color:'#94a3b8', alignSelf:'center', flexShrink:0, fontSize: isMobile?'1rem':'1.1rem' }} />
              <input
                type="text"
                placeholder={isMobile ? 'Search books…' : 'Search by title, author, or subject…'}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); scrollToCatalog(); }}
                autoComplete="off"
                style={{
                  flex:1, border:'none', outline:'none',
                  fontSize: isMobile?'.9rem':'1rem', color:'var(--ink)',
                  background:'transparent', fontFamily:'var(--ff-body)',
                }}
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')} aria-label="Clear"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'0 4px', flexShrink:0, alignSelf:'center' }}>
                  <MdClose style={{ verticalAlign:'middle' }} />
                </button>
              )}
              <button type="submit" style={{
                background:'var(--maroon)', color:'white', border:'none',
                padding: isMobile?'8px 16px':'10px 22px', borderRadius:50,
                cursor:'pointer', fontWeight:700, fontSize: isMobile?'.82rem':'.88rem',
                flexShrink:0, fontFamily:'var(--ff-body)', letterSpacing:'.02em',
              }}>
                Search
              </button>
            </form>
          </div>
        </section>

        {/* ══ CATALOG ══ */}
        <section ref={catalogRef} style={{
          padding: isMobile?'28px 16px 48px': isTablet?'36px 28px 56px':'44px 48px 64px',
          maxWidth:1300, margin:'0 auto', width:'100%',
        }}>
          {/* Header row */}
          <div style={{
            display:'flex', alignItems: isMobile?'flex-start':'flex-end',
            justifyContent:'space-between', flexDirection: isMobile?'column':'row',
            gap: isMobile?14:20, marginBottom: isMobile?20:28,
          }}>
            <div>
              <div className="section-eyebrow">
                <FaBookOpen /> {searchTerm ? 'Search Results' : 'Full Collection'}
              </div>
              <h2 className="section-title" style={{ fontSize: isMobile?'1.5rem': isTablet?'1.9rem':'2.2rem' }}>
                {searchTerm ? `Results for "${searchTerm}"` : 'Browse Our Collection'}
              </h2>
              {!booksLoading && (
                <p style={{ color:'var(--slate)', margin:'5px 0 0', fontSize: isMobile?'.8rem':'.88rem' }}>
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'} found
                  {searchTerm && (
                    <React.Fragment>
                      {' — '}
                      <button onClick={() => setSearchTerm('')} style={{
                        background:'none', border:'none', color:'var(--maroon)',
                        cursor:'pointer', fontWeight:700, padding:0,
                        fontFamily:'var(--ff-body)', fontSize:'inherit',
                      }}>Clear</button>
                    </React.Fragment>
                  )}
                </p>
              )}
            </div>
            <button className="view-all-btn" onClick={() => navigate('/login')}>
              Sign In to Borrow <FaArrowRight style={{ fontSize:'.72rem' }} />
            </button>
          </div>

          {/* Grid */}
          {booksLoading ? (
            <div style={{ display:'grid', gridTemplateColumns:bookCols, gap: isMobile?12:20 }}>
              {[...Array(8)].map((_,i) => (
                <div key={i} className="skeleton" style={{ height: isMobile?230:300, animationDelay:`${i*.07}s` }} />
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div style={{
              textAlign:'center', padding: isMobile?'50px 20px':'80px 20px',
              background:'white', borderRadius:16, border:'1.5px dashed #e2e8f0',
            }}>
              <div style={{ fontSize:'2.5rem', marginBottom:14, opacity:.4 }}><FaBookOpen /></div>
              <p style={{ fontFamily:'var(--ff-display)', fontSize: isMobile?'1.2rem':'1.4rem', fontWeight:400, color:'var(--maroon)', margin:'0 0 8px' }}>
                No books matched &ldquo;{searchTerm}&rdquo;
              </p>
              <p style={{ color:'var(--slate)', fontSize: isMobile?'.85rem':'.9rem', margin:'0 0 20px' }}>
                Try a different title, author name, or category.
              </p>
              <button onClick={() => setSearchTerm('')} style={{
                background:'var(--maroon)', color:'white', border:'none',
                padding:'12px 28px', borderRadius:50, cursor:'pointer',
                fontWeight:700, fontSize:'.9rem', fontFamily:'var(--ff-body)',
              }}>
                Show All Books
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:bookCols, gap: isMobile?12:20 }}>
              {filteredBooks.map((book, index) => {
                const isAvailable = (book.quantity ?? 0) > 0;
                const category = book.category || book.subject_class || 'General';
                const delay = `${0.04 + index * 0.045}s`;
                return (
                  <div key={book.id} className="book-card"
                    style={{ animationName:'fadeUp', animationDuration:'.45s', animationTimingFunction:'ease', animationFillMode:'forwards', animationDelay:delay }}
                    onClick={() => navigate('/login')}>

                    {/* Cover */}
                    <div className="book-cover" style={{ height: isMobile?148:192 }}>
                      {book.cover_image ? (
                        <img src={book.cover_image} alt={book.title}
                          onError={e => { e.target.style.display='none'; }} />
                      ) : (
                        <div style={{
                          width:'100%', height:'100%',
                          background:'linear-gradient(145deg,#4a0000,#7f1d1d 50%,#1e3a5f)',
                          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                          padding:14,
                        }}>
                          <FaBook style={{ fontSize: isMobile?'1.8rem':'2.2rem', color:'rgba(255,255,255,.5)', marginBottom:8 }} />
                          <span style={{ fontSize: isMobile?'.6rem':'.64rem', color:'rgba(255,255,255,.8)', textAlign:'center', fontWeight:600, lineHeight:1.35 }}>
                            {book.title}
                          </span>
                        </div>
                      )}
                      <div className={`avail-badge ${isAvailable ? 'badge-avail' : ''}`}
                        style={{ background: isAvailable ? 'var(--green)' : '#dc2626' }}>
                        {isAvailable ? `${book.quantity} left` : 'Out of stock'}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="book-body" style={{ padding: isMobile?'12px 12px 14px':'14px 16px 16px' }}>
                      <span className="cat-badge" style={{
                        fontSize: isMobile?'.57rem':'.62rem',
                        background:'var(--green-soft)', color:'var(--green)',
                        padding:'2px 9px', borderRadius:100, marginBottom:9,
                      }}>
                        {category}
                      </span>
                      <p className="book-title" style={{ fontSize: isMobile?'.8rem':'.9rem' }}>{book.title}</p>
                      <p className="book-author" style={{ fontSize: isMobile?'.7rem':'.76rem', marginBottom:0 }}>
                        {book.authors || 'Unknown Author'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══ FEATURES ══ */}
        <section style={{ background:'var(--cream-dark)', padding: isMobile?'36px 16px':isTablet?'44px 28px':'56px 48px' }}>
          <div style={{ maxWidth:1300, margin:'0 auto' }}>
            <div style={{ textAlign:'center', marginBottom: isMobile?20:36 }}>
              <div className="section-eyebrow" style={{ justifyContent:'center' }}>
                <FaBolt style={{ color:'#f97316' }} /> Why ShelfMaster
              </div>
              <h2 className="section-title" style={{ fontSize: isMobile?'1.5rem':isTablet?'1.9rem':'2.2rem' }}>
                System Features
              </h2>
            </div>

            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile?'1fr':isTablet?'repeat(2,1fr)':'repeat(4,1fr)',
              gap: isMobile?12:16, marginBottom: isMobile?28:44,
            }}>
              {FEATURES.map((f,i) => (
                <div key={i} className="feat-card" style={{
                  padding: isMobile?'20px 16px':'26px 22px',
                  display:'flex', flexDirection: isMobile?'row':'column',
                  alignItems:'flex-start', gap: isMobile?14:0,
                }}>
                  <div style={{
                    width: isMobile?40:48, height: isMobile?40:48, borderRadius:12,
                    background:'var(--yellow-soft)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    marginBottom: isMobile?0:16, flexShrink:0,
                    color:'var(--maroon)', fontSize: isMobile?'1.1rem':'1.3rem',
                  }}>
                    <f.icon />
                  </div>
                  <div>
                    <h3 style={{ margin: isMobile?'0 0 5px':'0 0 8px', fontFamily:'var(--ff-display)', fontSize: isMobile?'.95rem':'1.05rem', color:'var(--maroon)', fontWeight:400 }}>
                      {f.title}
                    </h3>
                    <p style={{ margin:0, fontSize: isMobile?'.8rem':'.88rem', color:'var(--slate)', lineHeight:1.6 }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact bar */}
            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile?'1fr':isTablet?'repeat(2,1fr)':'repeat(3,1fr)',
              gap: isMobile?12:16,
              background:'linear-gradient(145deg,#4a0000 0%,var(--maroon) 55%,#8b0000 100%)',
              borderRadius:20, padding: isMobile?20:28,
            }}>
              {[
                { Icon:FaEnvelope, label:'Email',    value: content.contact_email    || 'ShelfMaster@wmsu.edu.ph' },
                { Icon:FaPhone,    label:'Phone',    value: content.contact_phone    || '0912-345-6789' },
                { Icon:FaMapMarkerAlt, label:'Location', value: content.contact_location || 'Normal Road, Zamboanga City' },
              ].map((c,i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, justifyContent: isMobile?'flex-start':'center' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(255,255,255,.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2, color:'var(--yellow)', fontSize:'.9rem' }}>
                    <c.Icon />
                  </div>
                  <div>
                    <div style={{ fontSize:'.7rem', color:'var(--yellow)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>{c.label}</div>
                    <div style={{ fontSize: isMobile?'.85rem':'.92rem', color:'rgba(255,255,255,.82)', lineHeight:1.5 }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ ABOUT ══ */}
        <section style={{ background:'var(--cream)', padding: isMobile?'36px 16px':isTablet?'52px 28px':'72px 48px' }}>
          <div style={{
            maxWidth:1300, margin:'0 auto',
            display:'grid',
            gridTemplateColumns: isMobile||isTablet?'1fr':'1fr 1fr',
            gap: isMobile?32:60, alignItems:'center',
          }}>
            <div>
              <div className="section-eyebrow"><FaBookOpen /> About Us</div>
              <h2 className="section-title" style={{ fontSize: isMobile?'2rem':isTablet?'2.6rem':'3.2rem', marginBottom:20 }}>
                Who We Are
              </h2>
              <p style={{ lineHeight:1.8, color:'#555', marginBottom:24, fontSize: isMobile?'.9rem':'.98rem' }}>
                {content.about_text || 'ShelfMaster provides smart and reliable library management solutions designed to help schools and institutions organize their collections, maximize efficiency, and serve their patrons better.'}
              </p>

              {(content.mission || content.vision) && (
                <div style={{ display:'grid', gridTemplateColumns: isMobile?'1fr':'repeat(2,1fr)', gap:14, marginBottom:28 }}>
                  {content.mission && (
                    <div style={{ background:'white', padding:'16px 18px', borderRadius:12, borderLeft:'4px solid var(--green)', boxShadow:'var(--shadow-sm)' }}>
                      <strong style={{ color:'var(--maroon)', fontSize:'.85rem', fontFamily:'var(--ff-display)' }}>Mission</strong>
                      <p style={{ fontSize:'.83rem', margin:'6px 0 0', color:'#555', lineHeight:1.6 }}>{content.mission}</p>
                    </div>
                  )}
                  {content.vision && (
                    <div style={{ background:'var(--yellow-soft)', padding:'16px 18px', borderRadius:12, borderLeft:'4px solid var(--yellow)', boxShadow:'var(--shadow-sm)' }}>
                      <strong style={{ color:'var(--maroon)', fontSize:'.85rem', fontFamily:'var(--ff-display)' }}>Vision</strong>
                      <p style={{ fontSize:'.83rem', margin:'6px 0 0', color:'#555', lineHeight:1.6 }}>{content.vision}</p>
                    </div>
                  )}
                </div>
              )}

              <Link to="/login">
                <button className="hero-cta" style={{ padding: isMobile?'12px 26px':'14px 32px', fontSize: isMobile?'.88rem':'.93rem' }}>
                  Explore More <FaArrowRight className="cta-arrow" style={{ fontSize:'.8rem' }} />
                </button>
              </Link>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: isMobile?12:16 }}>
              <div style={{ height: isMobile?130:180, background:'#CFCFCF', borderRadius:16, boxShadow:'var(--shadow-sm)' }} />
              <div style={{ height: isMobile?130:180, background:'#BFBFBF', borderRadius:16, boxShadow:'var(--shadow-sm)' }} />
              <div style={{ height: isMobile?90:130, background:'#D8D8D8', borderRadius:16, boxShadow:'var(--shadow-sm)', gridColumn:'span 2' }} />
            </div>
          </div>
        </section>

        {/* ══ FOOTER ══ */}
        <footer style={{
          background:'linear-gradient(145deg,#4a0000 0%,var(--maroon) 55%,#8b0000 100%)',
          color:'white',
          padding: isMobile?'32px 16px 24px':isTablet?'40px 28px 28px':'52px 48px 36px',
        }}>
          <div style={{
            maxWidth:1300, margin:'0 auto',
            display:'grid',
            gridTemplateColumns: isMobile?'1fr':isTablet?'repeat(2,1fr)':'repeat(4,1fr)',
            gap: isMobile?24:32, marginBottom: isMobile?24:36,
          }}>
            <div>
              <h2 style={{ fontFamily:'var(--ff-display)', margin:'0 0 10px', fontSize: isMobile?'1.1rem':'1.25rem', fontWeight:400 }}>
                ShelfMaster
              </h2>
              <p style={{ fontSize: isMobile?'.8rem':'.85rem', color:'rgba(255,255,255,.5)', lineHeight:1.7, margin:0 }}>
                {content.footer_text || 'A smart library management system for modern institutions.'}
              </p>
            </div>
            <div>
              <h4 style={{ color:'white', fontSize: isMobile?'.82rem':'.88rem', margin:'0 0 12px', letterSpacing:'.08em', textTransform:'uppercase' }}>Contact</h4>
              {[
                { Icon:FaEnvelope, text: content.contact_email || 'ShelfMaster@wmsu.edu.ph' },
                { Icon:FaPhone,    text: content.contact_phone || '0912-345-6789' },
              ].map((item,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <item.Icon style={{ color:'rgba(255,255,255,.4)', fontSize:'.75rem', flexShrink:0 }} />
                  <span style={{ fontSize: isMobile?'.8rem':'.85rem', color:'rgba(255,255,255,.7)' }}>{item.text}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ color:'white', fontSize: isMobile?'.82rem':'.88rem', margin:'0 0 12px', letterSpacing:'.08em', textTransform:'uppercase' }}>Quick Links</h4>
              <Link to="/Signup" style={{ fontSize: isMobile?'.8rem':'.85rem', textDecoration:'none', color:'rgba(255,255,255,.7)', display:'block', marginBottom:8 }}>
                Create Account
              </Link>
              <Link to="/login" style={{ fontSize: isMobile?'.8rem':'.85rem', textDecoration:'none', color:'rgba(255,255,255,.7)', display:'block' }}>
                Sign In
              </Link>
            </div>
            <div>
              <h4 style={{ color:'white', fontSize: isMobile?'.82rem':'.88rem', margin:'0 0 12px', letterSpacing:'.08em', textTransform:'uppercase' }}>Connect</h4>
              <p style={{ fontSize: isMobile?'.8rem':'.85rem', color:'rgba(255,255,255,.4)', margin:0 }}>
                Stay connected through our official channels.
              </p>
            </div>
          </div>

          <div style={{
            borderTop:'1px solid rgba(255,255,255,.1)', paddingTop: isMobile?16:20,
            textAlign:'center', fontSize: isMobile?'.75rem':'.8rem', color:'rgba(255,255,255,.3)',
          }}>
            © 2026 ShelfMaster Library · All rights reserved
          </div>
        </footer>

      </div>
    </React.Fragment>
  );
}