import React, { useState, useEffect, useRef } from 'react';
import { localDb } from './localDbClient';
import BookLoader from './BookLoader';
import {
  FaCalendarAlt, FaDollarSign, FaFolder, FaImage, FaLink,
  FaPlus, FaTimes, FaGlobe, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaBook, FaExclamationCircle, FaCheckCircle, FaCog,
} from 'react-icons/fa';

/* ─── Design System ─── */
const PALETTE = {
  ivory:    '#F9F7F2',
  ivoryDk:  '#F1EDE3',
  border:   '#E8E2D7',
  muted:    '#8C8070',
  text:     '#2A2118',
  textSoft: '#6B5F52',
};

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .st-root { font-family: 'DM Sans', sans-serif; }
  .st-root *, .st-root *::before, .st-root *::after { box-sizing: border-box; }

  .st-rise {
    opacity: 0;
    transform: translateY(18px);
    animation: st-rise 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  @keyframes st-rise { to { opacity: 1; transform: translateY(0); } }

  .st-fade { opacity: 0; animation: st-fadein 0.5s ease 0.1s forwards; }
  @keyframes st-fadein { to { opacity: 1; } }

  /* Input */
  .st-input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #E8E2D7;
    border-radius: 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.88rem;
    color: #2A2118;
    background: #fff;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .st-input:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(139,0,0,0.08);
  }
  .st-input::placeholder { color: #8C8070; }

  select.st-input { cursor: pointer; }
  textarea.st-input { resize: vertical; min-height: 110px; }

  /* Toggle button */
  .st-toggle {
    padding: 7px 16px;
    border-radius: 8px;
    border: 1.5px solid #E8E2D7;
    background: #fff;
    color: #6B5F52;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
  }
  .st-toggle.active {
    background: var(--maroon);
    border-color: var(--maroon);
    color: #fff;
    box-shadow: 0 3px 10px rgba(139,0,0,0.18);
  }
  .st-toggle:hover:not(.active) { border-color: var(--maroon); color: var(--maroon); }

  /* Save button */
  .st-save-btn {
    padding: 12px 32px;
    background: var(--maroon);
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.18s ease;
    box-shadow: 0 4px 14px rgba(139,0,0,0.2);
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .st-save-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(139,0,0,0.25); }
  .st-save-btn:active:not(:disabled) { transform: translateY(0); }
  .st-save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Strand pill */
  .st-strand-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #F0F4FF;
    border: 1.5px solid #C7D2FE;
    border-radius: 20px;
    padding: 5px 12px;
    font-size: 0.82rem;
    color: #3730a3;
    font-weight: 600;
    transition: border-color 0.15s;
  }
  .st-strand-pill:hover { border-color: #818cf8; }

  /* Drop zone */
  .st-dropzone {
    border: 2px dashed #E8E2D7;
    border-radius: 12px;
    padding: 28px;
    text-align: center;
    cursor: pointer;
    background: #FAFAF8;
    transition: border-color 0.2s, background 0.2s;
  }
  .st-dropzone:hover {
    border-color: var(--maroon);
    background: #FDF5F5;
  }

  /* Fine builder inputs */
  .st-fine-input {
    width: 90px;
    padding: 9px 10px;
    border: 2px solid #FECACA;
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    color: #DC2626;
    text-align: center;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .st-fine-input:focus { border-color: #F87171; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }

  /* Nav sidebar */
  .st-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    border-radius: 9px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6B5F52;
    transition: all 0.15s ease;
    text-decoration: none;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: 'DM Sans', sans-serif;
  }
  .st-nav-item:hover { background: #F1EDE3; color: #2A2118; }
  .st-nav-item.active { background: #FFF0F0; color: var(--maroon); }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

const cardStyle = {
  background: '#ffffff',
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 16,
  padding: '28px',
  marginBottom: 20,
};

const sectionHeadStyle = {
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: 17,
  fontWeight: 600,
  color: PALETTE.text,
  margin: '0 0 4px',
  letterSpacing: '-0.2px',
};

const DEFAULT_STRANDS = ['STEM', 'HUMSS', 'ABM', 'GAS', 'TVL - Industrial Arts', 'TVL - Home Economics', 'TVL - ICT', 'TVL - Agri-Fishery Arts', 'Sports', 'Arts & Design'];

/* ─── Section label ─── */
function Label({ children }) {
  return (
    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </div>
  );
}

/* ─── Section divider ─── */
function SectionDivider() {
  return <div style={{ height: 1, background: PALETTE.ivoryDk, margin: '22px 0' }} />;
}

export default function Settings() {
  const [strands, setStrands]           = useState(DEFAULT_STRANDS);
  const [newStrand, setNewStrand]       = useState('');
  const [formData, setFormData]         = useState({
    hero_banner_url: '', tagline: '', about_text: '', mission: '', vision: '',
    contact_email: '', contact_phone: '', contact_location: '', footer_text: '',
    borrow_duration_value: 7, borrow_duration_unit: 'days',
    fine_amount: 5, fine_increment_value: 1, fine_increment_type: 'per_day', max_borrow_count: 3,
  });
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [message, setMessage]           = useState({ text: '', type: '' });
  const [heroInputMode, setHeroInputMode] = useState('url');
  const [uploadPreview, setUploadPreview] = useState('');
  const fileRef = useRef(null);

  useEffect(() => { fetchContent(); }, []);

  async function fetchContent() {
    setLoading(true);
    const [{ data: siteData, error: siteError }, { data: policyData }] = await Promise.all([
      localDb.from('site_content').select('*').limit(1).single(),
      localDb.from('fine_policy').select('fine_amount, fine_increment_value, fine_increment_type, borrow_duration_value, borrow_duration_unit, max_borrow_count').eq('id', 1).maybeSingle(),
    ]);
    if (siteData?.strands) { try { setStrands(JSON.parse(siteData.strands)); } catch {} }
    if (siteData) {
      setFormData(prev => ({ ...prev, ...siteData }));
      if (siteData.hero_banner_url?.startsWith('data:')) { setUploadPreview(siteData.hero_banner_url); setHeroInputMode('upload'); }
    } else if (siteError && siteError.code !== 'PGRST116') console.error(siteError);
    if (policyData) {
      setFormData(prev => ({
        ...prev,
        fine_amount: policyData.fine_amount ?? 5,
        fine_increment_value: policyData.fine_increment_value ?? 1,
        fine_increment_type: policyData.fine_increment_type || 'per_day',
        borrow_duration_value: policyData.borrow_duration_value ?? 7,
        borrow_duration_unit: policyData.borrow_duration_unit || 'days',
        max_borrow_count: policyData.max_borrow_count ?? 3,
      }));
    }
    setLoading(false);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    const { borrow_duration_value, borrow_duration_unit, fine_amount, fine_increment_value, fine_increment_type, max_borrow_count, ...siteFields } = formData;
    const sitePayload   = { ...siteFields, strands: JSON.stringify(strands) };
    const policyPayload = { fine_amount, fine_per_day: fine_amount, fine_increment_value, fine_increment_type, borrow_duration_value, borrow_duration_unit, max_borrow_count };
    const sitePromise   = sitePayload.id
      ? localDb.from('site_content').update(sitePayload).eq('id', sitePayload.id)
      : localDb.from('site_content').insert([{ ...sitePayload, id: 1 }]);
    const policyPromise = localDb.from('fine_policy').update(policyPayload).eq('id', 1);
    const [{ error: siteErr }, { error: policyErr }] = await Promise.all([sitePromise, policyPromise]);
    const err = siteErr || policyErr;
    if (err) { setMessage({ text: 'Error saving: ' + err.message, type: 'error' }); }
    else     { setMessage({ text: 'Settings saved successfully!', type: 'success' }); fetchContent(); }
    setSaving(false);
    setTimeout(() => setMessage({ text: '', type: '' }), 3500);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage({ text: 'Please select a valid image file.', type: 'error' }); return; }
    if (file.size > 2 * 1024 * 1024)    { setMessage({ text: 'Image must be under 2 MB.', type: 'error' }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const d = ev.target.result; setUploadPreview(d); setFormData(prev => ({ ...prev, hero_banner_url: d })); };
    reader.readAsDataURL(file);
  };

  const addStrand = () => {
    const v = newStrand.trim();
    if (v && !strands.includes(v)) { setStrands(prev => [...prev, v]); setNewStrand(''); }
  };

  if (loading) return <BookLoader message="Loading settings" />;

  return (
    <div className="st-root" style={{ background: PALETTE.ivory, minHeight: '100vh', padding: '32px 28px 64px' }}>
      <style>{STYLES}</style>

      {/* ── HEADER ── */}
      <header style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
              <FaCog />
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: 'var(--maroon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              Site Settings
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: PALETTE.textSoft, paddingLeft: 52 }}>
            Manage content displayed on the public Home page and library policies.
          </p>
        </div>

        {/* Toast message */}
        {message.text && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem',
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color:      message.type === 'success' ? '#15803d'  : '#b91c1c',
            border:     `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            animation: 'st-fadein 0.2s ease',
          }}>
            {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
            {message.text}
          </div>
        )}
      </header>

      <form onSubmit={handleSave}>

        {/* ══════ HERO SECTION ══════ */}
        <div className="st-rise" style={{ ...cardStyle, animationDelay: '0.05s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF0F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--maroon)', fontSize: 14 }}>
              <FaGlobe />
            </div>
            <div>
              <h2 style={sectionHeadStyle}>Hero Section</h2>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.muted }}>What visitors see first on your public page.</p>
            </div>
          </div>
          <div style={{ height: 1, background: PALETTE.ivoryDk, marginBottom: 22 }} />

          <Label>Main Tagline / Headline</Label>
          <input className="st-input" style={{ marginBottom: 20 }} type="text" name="tagline" value={formData.tagline || ''} onChange={handleChange} placeholder="e.g. Master Every Shelf" />

          <Label>Hero Banner Image</Label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button type="button" className={`st-toggle ${heroInputMode === 'url' ? 'active' : ''}`} onClick={() => setHeroInputMode('url')}>
              <FaLink size={11} /> Use URL
            </button>
            <button type="button" className={`st-toggle ${heroInputMode === 'upload' ? 'active' : ''}`} onClick={() => setHeroInputMode('upload')}>
              <FaFolder size={11} /> Upload Image
            </button>
          </div>

          {heroInputMode === 'url' ? (
            <input className="st-input" type="text" name="hero_banner_url"
              value={formData.hero_banner_url?.startsWith('data:') ? '' : (formData.hero_banner_url || '')}
              onChange={handleChange} placeholder="https://example.com/banner.jpg" />
          ) : (
            <div>
              <div className="st-dropzone" onClick={() => fileRef.current?.click()}>
                {uploadPreview
                  ? <img src={uploadPreview} alt="Preview" style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 10, objectFit: 'cover' }} />
                  : <>
                      <div style={{ fontSize: '2rem', color: PALETTE.muted, marginBottom: 8 }}><FaImage /></div>
                      <p style={{ margin: 0, color: PALETTE.muted, fontSize: '0.88rem' }}>Click to select an image <span style={{ color: PALETTE.border }}>(max 2 MB)</span></p>
                    </>
                }
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
              {uploadPreview && (
                <button type="button"
                  onClick={() => { setUploadPreview(''); setFormData(prev => ({ ...prev, hero_banner_url: '' })); if (fileRef.current) fileRef.current.value = ''; }}
                  style={{ marginTop: 8, background: 'none', border: '1px solid #fca5a5', color: '#ef4444', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                  Remove image
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══════ ABOUT US ══════ */}
        <div className="st-rise" style={{ ...cardStyle, animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', fontSize: 14 }}>
              <FaBook />
            </div>
            <div>
              <h2 style={sectionHeadStyle}>About Us</h2>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.muted }}>Library description, mission, and vision.</p>
            </div>
          </div>
          <div style={{ height: 1, background: PALETTE.ivoryDk, marginBottom: 22 }} />

          <Label>About Us Text</Label>
          <textarea className="st-input" style={{ marginBottom: 20 }} name="about_text" value={formData.about_text || ''} onChange={handleChange} placeholder="Describe the library…" />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <Label>Mission</Label>
              <textarea className="st-input" style={{ minHeight: 90 }} name="mission" value={formData.mission || ''} onChange={handleChange} />
            </div>
            <div>
              <Label>Vision</Label>
              <textarea className="st-input" style={{ minHeight: 90 }} name="vision" value={formData.vision || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* ══════ CONTACT & FOOTER ══════ */}
        <div className="st-rise" style={{ ...cardStyle, animationDelay: '0.15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d', fontSize: 14 }}>
              <FaEnvelope />
            </div>
            <div>
              <h2 style={sectionHeadStyle}>Contact & Footer</h2>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.muted }}>Contact details shown to the public.</p>
            </div>
          </div>
          <div style={{ height: 1, background: PALETTE.ivoryDk, marginBottom: 22 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <Label><FaEnvelope size={10} style={{ marginRight: 5 }} />Contact Email</Label>
              <input className="st-input" type="email" name="contact_email" value={formData.contact_email || ''} onChange={handleChange} placeholder="library@school.edu" />
            </div>
            <div>
              <Label><FaPhone size={10} style={{ marginRight: 5 }} />Phone Number</Label>
              <input className="st-input" type="text" name="contact_phone" value={formData.contact_phone || ''} onChange={handleChange} placeholder="+63 912 345 6789" />
            </div>
          </div>

          <Label><FaMapMarkerAlt size={10} style={{ marginRight: 5 }} />Physical Location</Label>
          <input className="st-input" style={{ marginBottom: 20 }} type="text" name="contact_location" value={formData.contact_location || ''} onChange={handleChange} placeholder="Room 101, Main Building" />

          <Label>Footer Copyright Text</Label>
          <input className="st-input" type="text" name="footer_text" value={formData.footer_text || ''} onChange={handleChange} placeholder="© 2025 School Library. All rights reserved." />
        </div>

        {/* ══════ LIBRARY POLICY & FINES ══════ */}
        <div className="st-rise" style={{ ...cardStyle, animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF8F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontSize: 14 }}>
              <FaDollarSign />
            </div>
            <div>
              <h2 style={sectionHeadStyle}>Library Policy & Fines</h2>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.muted }}>Borrow limits, durations, and overdue charges.</p>
            </div>
          </div>
          <div style={{ height: 1, background: PALETTE.ivoryDk, marginBottom: 22 }} />

          {/* Max borrow count */}
          <div style={{ background: '#F0F4FF', border: '1px solid #C7D2FE', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '1rem' }}>📚</span>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15, color: '#3730a3' }}>Maximum Books Per Borrower</span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: PALETTE.muted }}>
              How many books a student or teacher can have borrowed or pending at once.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <input
                className="st-input"
                style={{ width: 90, textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', marginBottom: 0 }}
                type="number" min="1" max="20" step="1" name="max_borrow_count"
                value={formData.max_borrow_count ?? 3}
                onChange={(e) => setFormData(p => ({ ...p, max_borrow_count: e.target.value === '' ? '' : Number(e.target.value) }))}
              />
              <span style={{ fontSize: '0.85rem', color: PALETTE.textSoft }}>book(s) maximum per borrower</span>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '0.77rem', color: PALETTE.muted }}>
              Currently set to <strong style={{ color: '#3730a3' }}>{formData.max_borrow_count ?? 3}</strong>. Applies to both walk-in and online requests.
            </p>
          </div>

          {/* Borrow duration */}
          <div style={{ background: PALETTE.ivoryDk, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FaCalendarAlt style={{ color: PALETTE.textSoft }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15, color: PALETTE.text }}>Default Borrow Duration</span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: PALETTE.muted }}>
              How long a borrower has before the book is considered overdue.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <Label>Amount</Label>
                <input
                  className="st-input"
                  style={{ width: 110, textAlign: 'center', fontWeight: 700 }}
                  type="number" min="1" step="1" name="borrow_duration_value"
                  value={formData.borrow_duration_value ?? 7}
                  onChange={(e) => setFormData({ ...formData, borrow_duration_value: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="7"
                />
              </div>
              <div style={{ flex: 1, maxWidth: 160 }}>
                <Label>Unit</Label>
                <select className="st-input" name="borrow_duration_unit" value={formData.borrow_duration_unit || 'days'} onChange={handleChange}>
                  <option value="days">Days</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '0.77rem', color: PALETTE.muted }}>
              Example: <strong style={{ color: PALETTE.text }}>7 days</strong> → book is due 7 days after borrowing. Fines start after this period.
            </p>
          </div>

          {/* Overdue fines */}
          <div style={{ background: '#FFF8F8', border: '1px solid #FECACA', borderRadius: 12, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <FaDollarSign style={{ color: '#b91c1c' }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 15, color: '#991b1b' }}>Overdue Fine Policy</span>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: PALETTE.muted }}>
              Set the fine amount and how often it is charged for overdue books.
            </p>

            {/* Visual rule builder */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              background: '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: 10,
              padding: '16px 18px',
            }}>
              <span style={{ fontWeight: 700, color: '#7f1d1d', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>Charge</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: '#991b1b', fontWeight: 700, fontSize: '1rem' }}>₱</span>
                <input
                  className="st-fine-input"
                  type="number" min="0" step="0.01" name="fine_amount"
                  value={formData.fine_amount ?? 5}
                  onChange={(e) => setFormData(p => ({ ...p, fine_amount: e.target.value === '' ? '' : Number(e.target.value) }))}
                  placeholder="5"
                />
              </div>

              <span style={{ fontWeight: 700, color: '#7f1d1d', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>once every</span>

              <input
                className="st-fine-input"
                style={{ width: 72 }}
                type="number" min="1" step="1" name="fine_increment_value"
                value={formData.fine_increment_value ?? 1}
                onChange={(e) => setFormData(p => ({ ...p, fine_increment_value: e.target.value === '' ? '' : Number(e.target.value) }))}
                placeholder="1"
              />

              <select
                name="fine_increment_type"
                value={formData.fine_increment_type || 'per_day'}
                onChange={(e) => setFormData(p => ({ ...p, fine_increment_type: e.target.value }))}
                style={{ padding: '9px 12px', border: '2px solid #FECACA', borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#DC2626', cursor: 'pointer', outline: 'none', background: '#fff' }}
              >
                <option value="per_day">day(s)</option>
                <option value="per_hour">hour(s)</option>
              </select>

              <span style={{ fontWeight: 700, color: '#7f1d1d', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>overdue</span>
            </div>

            {/* Fine preview */}
            <div style={{ marginTop: 12, background: '#fff', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Preview:</span>
              <span style={{ fontSize: '0.82rem', color: PALETTE.textSoft }}>
                A book overdue by <strong style={{ color: PALETTE.text }}>3 {formData.fine_increment_type === 'per_hour' ? 'hours' : 'days'}</strong> incurs a fine of{' '}
                <strong style={{ color: '#DC2626' }}>
                  ₱{(3 * (Number(formData.fine_amount) || 0)).toFixed(2)}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* ══════ STRAND / TRACK MANAGEMENT ══════ */}
        <div className="st-rise" style={{ ...cardStyle, animationDelay: '0.25s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0F4FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3730a3', fontSize: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>S</span>
            </div>
            <div>
              <h2 style={sectionHeadStyle}>Track / Strand Options</h2>
              <p style={{ margin: 0, fontSize: 12, color: PALETTE.muted }}>Strands shown in signup and walk-in borrowing dropdowns.</p>
            </div>
          </div>
          <div style={{ height: 1, background: PALETTE.ivoryDk, marginBottom: 22 }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, minHeight: 40 }}>
            {strands.map((s, i) => (
              <span key={i} className="st-strand-pill">
                {s}
                <button type="button" onClick={() => setStrands(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#818cf8', display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#4f46e5'}
                  onMouseLeave={e => e.currentTarget.style.color = '#818cf8'}
                >
                  <FaTimes size={10} />
                </button>
              </span>
            ))}
            {strands.length === 0 && (
              <span style={{ color: PALETTE.muted, fontSize: '0.85rem', fontStyle: 'italic' }}>No strands added yet.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="st-input"
              style={{ flex: 1 }}
              type="text"
              placeholder="e.g. STEM, HUMSS, TVL - ICT"
              value={newStrand}
              onChange={e => setNewStrand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStrand(); } }}
            />
            <button
              type="button"
              onClick={addStrand}
              style={{ padding: '11px 18px', background: 'var(--maroon)', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,0,0,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <FaPlus size={11} /> Add Strand
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: PALETTE.muted }}>
            Press <kbd style={{ background: PALETTE.ivoryDk, border: `1px solid ${PALETTE.border}`, borderRadius: 4, padding: '1px 5px', fontSize: '0.72rem', fontFamily: 'monospace' }}>Enter</kbd> or click Add. Changes save with the button below.
          </p>
        </div>

        {/* ── SAVE BUTTON ── */}
        <div className="st-rise" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, animationDelay: '0.3s', paddingBottom: 32 }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: PALETTE.muted }}>All sections are saved together.</p>
          <button type="submit" className="st-save-btn" disabled={saving}>
            {saving ? (
              <>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Saving…
              </>
            ) : (
              <><FaCheckCircle size={14} /> Save All Settings</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}