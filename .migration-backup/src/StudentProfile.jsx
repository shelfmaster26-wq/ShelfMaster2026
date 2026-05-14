import React, { useState, useEffect } from 'react';
import StudentNavbar from './StudentNavbar';
import { localDb } from './localDbClient';
import Toast from './Toast';
import { FaBan, FaBriefcase, FaCheckCircle, FaEdit, FaGraduationCap, FaIdCard, FaPhone, FaSchool, FaUser, FaBook, FaClock } from 'react-icons/fa';
import BookLoader from './BookLoader';
import { MdClose } from 'react-icons/md';

const LRN_PATTERN = /^\d{12}$/;
const GRADE_OPTIONS = ['Grade 11', 'Grade 12'];
const LETTERS_ONLY = /^[A-Za-zÀ-ÿ\s'-]+$/;

function parseGradeSection(combined) {
  if (!combined) return { grade: '', section: '' };
  const sep = ' - ';
  const idx = combined.indexOf(sep);
  if (idx === -1) {
    const m = combined.match(/^(Grade\s+\d+)\s*(.*)?$/i);
    if (m) return { grade: m[1].trim(), section: m[2]?.trim() || '' };
    return { grade: '', section: combined.trim() };
  }
  return { grade: combined.slice(0, idx).trim(), section: combined.slice(idx + sep.length).trim() };
}

function parseName(fullName) {
  if (!fullName) return { lastName: '', firstName: '', middleInitial: '' };
  const commaIdx = fullName.indexOf(',');
  if (commaIdx !== -1) {
    const last = fullName.slice(0, commaIdx).trim();
    const rest = fullName.slice(commaIdx + 1).trim();
    const parts = rest.split(' ');
    const mi = parts.length > 1 ? parts[parts.length - 1].replace('.', '') : '';
    const first = parts.slice(0, mi ? parts.length - 1 : parts.length).join(' ');
    return { lastName: last, firstName: first, middleInitial: mi };
  }
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return { lastName: parts[0], firstName: '', middleInitial: '' };
  if (parts.length === 2) return { lastName: parts[1], firstName: parts[0], middleInitial: '' };
  return { lastName: parts[parts.length - 1], firstName: parts[0], middleInitial: parts[1]?.[0] || '' };
}

function composeName(lastName, firstName, middleInitial) {
  const mi = middleInitial.trim().replace('.', '');
  if (!firstName && !mi) return lastName;
  if (!mi) return `${lastName}, ${firstName}`;
  return `${lastName}, ${firstName} ${mi.toUpperCase()}.`;
}

// ─── Profile Completion ────────────────────────────────────────────────────
function getCompletion(userData, isTeacher) {
  if (!userData) return 0;
  if (isTeacher) {
    const fields = [userData.name, userData.student_id, userData.course_year, userData.grade_section, userData.lrn];
    return Math.round((fields.filter(f => f && f.trim() !== '').length / fields.length) * 100);
  }
  const gs = userData.grade_section || userData.course_year || '';
  const { grade, section } = parseGradeSection(gs);
  const fields = [userData.name, userData.lrn || userData.student_id, grade, section];
  return Math.round((fields.filter(f => f && f.trim() !== '').length / fields.length) * 100);
}

// ─── Summary Stat Card Component ──────────────────────────────────────────
function SummaryCard({ icon, label, value, accent, sub }) {
  return (
    <div className="summary-card">
      <div className="summary-icon" style={{ background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div className="summary-text">
        <span className="summary-label">{label}</span>
        <span className="summary-value">{value}</span>
        {sub && <span className="summary-sub">{sub}</span>}
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const [userData, setUserData]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({ lastName: '', firstName: '', middleInitial: '', lrn: '', grade: '', section: '' });
  const [teacherForm, setTeacherForm] = useState({ lastName: '', firstName: '', middleInitial: '', employeeId: '', position: '', gradeSection: '', contact: '' });

  const [loanStats, setLoanStats] = useState({ active: 0, pending: 0, loading: true });

  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [toast, setToast]     = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => { fetchUserProfile(); }, []);

  async function fetchLoanStats() {
    try {
      const { data: { user } } = await localDb.auth.getUser();
      if (!user) return;

      const { data: userRow } = await localDb
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (!userRow?.id) {
        setLoanStats({ active: 0, pending: 0, loading: false });
        return;
      }

      const ACTIVE_STATUSES = ['active', 'borrowed', 'approved', 'issued', 'loaned', 'checked_out'];

      const [{ data: activeData }, { data: pendingData }] = await Promise.all([
        localDb.from('transactions').select('id').eq('user_id', userRow.id).in('status', ACTIVE_STATUSES),
        localDb.from('transactions').select('id').eq('user_id', userRow.id).eq('status', 'pending'),
      ]);

      setLoanStats({
        active:  activeData?.length  ?? 0,
        pending: pendingData?.length ?? 0,
        loading: false,
      });
    } catch {
      setLoanStats({ active: 0, pending: 0, loading: false });
    }
  }

  async function fetchUserProfile() {
    setLoading(true);
    const { data: { user } } = await localDb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data, error } = await localDb.from('users')
      .select('name, student_id, lrn, grade_section, course_year, position, contact_number, role, status, adviser')
      .eq('auth_id', user.id).maybeSingle();
    if (error) console.error('Profile fetch error:', error);
    if (data) setUserData({ ...data, email: user.email });
    else setUserData({ name: user.email?.split('@')[0] || 'User', email: user.email, lrn: '', grade_section: '', role: 'student', status: 'active' });
    setLoading(false);
    fetchLoanStats(); // load loan counts in parallel after profile resolves
  }

  const isTeacher = userData?.role === 'teacher';

  function openEditModal() {
    setSaveMsg('');
    if (isTeacher) {
      const { lastName, firstName, middleInitial } = parseName(userData?.name || '');
      setTeacherForm({
        lastName, firstName, middleInitial,
        employeeId:   userData?.student_id    || '',
        position:     userData?.position      || userData?.course_year || '',
        gradeSection: userData?.grade_section || '',
        contact:      userData?.contact_number || userData?.lrn || '',
      });
    } else {
      const gs = userData?.grade_section || userData?.course_year || '';
      const { grade, section } = parseGradeSection(gs);
      const { lastName, firstName, middleInitial } = parseName(userData?.name || '');
      setForm({ lastName, firstName, middleInitial, lrn: userData?.lrn || userData?.student_id || '', grade, section });
    }
    setShowModal(true);
  }

  const sanitize = (str) => str.replace(/<[^>]*>/g, '').trim();

  async function handleSaveStudent(e) {
    e.preventDefault();
    setSaving(true); setSaveMsg('');
    const { data: { user } } = await localDb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const last    = sanitize(form.lastName);
    const first   = sanitize(form.firstName);
    const mi      = sanitize(form.middleInitial).replace('.', '').toUpperCase();
    const lrn     = sanitize(form.lrn);
    const grade   = sanitize(form.grade);
    const section = sanitize(form.section);

    if (!last  || last.length  < 2) { setSaveMsg('Last name must be at least 2 characters.');  setSaving(false); return; }
    if (last.length  > 50)          { setSaveMsg('Last name must not exceed 50 characters.');  setSaving(false); return; }
    if (!LETTERS_ONLY.test(last))   { setSaveMsg('Last name must contain letters only.');      setSaving(false); return; }
    if (!first || first.length < 2) { setSaveMsg('First name must be at least 2 characters.'); setSaving(false); return; }
    if (first.length > 50)          { setSaveMsg('First name must not exceed 50 characters.'); setSaving(false); return; }
    if (!LETTERS_ONLY.test(first))  { setSaveMsg('First name must contain letters only.');     setSaving(false); return; }
    if (mi && mi.length > 2)        { setSaveMsg('Middle initial must be 1–2 letters only.');  setSaving(false); return; }
    if (mi && !LETTERS_ONLY.test(mi)) { setSaveMsg('Middle initial must be a letter.');        setSaving(false); return; }
    if (!lrn)                        { setSaveMsg('LRN is required.');                         setSaving(false); return; }
    if (!LRN_PATTERN.test(lrn))      { setSaveMsg('LRN must be exactly 12 digits.');           setSaving(false); return; }
    if (!grade)                      { setSaveMsg('Please select a grade level.');              setSaving(false); return; }
    if (!section || section.length < 2) { setSaveMsg('Section must be at least 2 characters.'); setSaving(false); return; }
    if (section.length > 50)         { setSaveMsg('Section must not exceed 50 characters.');   setSaving(false); return; }

    const fullName = composeName(last, first, mi);
    const combined = `${grade} - ${section}`;

    const { data: saved, error } = await localDb.from('users')
      .update({ name: fullName, lrn, student_id: lrn, grade_section: combined, course_year: combined })
      .eq('auth_id', user.id).select('name, lrn, grade_section').maybeSingle();

    if (error)   setSaveMsg('Error: ' + error.message);
    else if (!saved) setSaveMsg('Save failed: the database did not accept the change. Ask your admin to enable UPDATE access.');
    else {
      setUserData(prev => ({ ...prev, name: fullName, lrn, student_id: lrn, grade_section: combined, course_year: combined }));
      setSaveMsg('success');
      setTimeout(() => { setShowModal(false); setSaveMsg(''); }, 1000);
    }
    setSaving(false);
  }

  async function handleSaveTeacher(e) {
    e.preventDefault();
    setSaving(true); setSaveMsg('');
    const { data: { user } } = await localDb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const last    = sanitize(teacherForm.lastName);
    const first   = sanitize(teacherForm.firstName);
    const mi      = sanitize(teacherForm.middleInitial).replace('.', '').toUpperCase();
    const empId   = sanitize(teacherForm.employeeId);
    const pos     = sanitize(teacherForm.position);
    const gs      = sanitize(teacherForm.gradeSection);
    const contact = sanitize(teacherForm.contact);

    if (!last  || last.length  < 2) { setSaveMsg('Last name must be at least 2 characters.');  setSaving(false); return; }
    if (last.length  > 50)          { setSaveMsg('Last name must not exceed 50 characters.');  setSaving(false); return; }
    if (!LETTERS_ONLY.test(last))   { setSaveMsg('Last name must contain letters only.');      setSaving(false); return; }
    if (!first || first.length < 2) { setSaveMsg('First name must be at least 2 characters.'); setSaving(false); return; }
    if (first.length > 50)          { setSaveMsg('First name must not exceed 50 characters.'); setSaving(false); return; }
    if (!LETTERS_ONLY.test(first))  { setSaveMsg('First name must contain letters only.');     setSaving(false); return; }
    if (mi && mi.length > 2)        { setSaveMsg('Middle initial must be 1–2 letters only.');  setSaving(false); return; }
    if (!empId)                          { setSaveMsg('Employee ID is required.');                                         setSaving(false); return; }
    if (!/^\d{7}$/.test(empId))          { setSaveMsg('Employee ID must be exactly 7 digits (e.g. 1435418).');              setSaving(false); return; }
    if (!pos || pos.length < 3)     { setSaveMsg('Position must be at least 3 characters.');   setSaving(false); return; }
    if (pos.length > 80)            { setSaveMsg('Position must not exceed 80 characters.');   setSaving(false); return; }
    if (!gs || gs.length < 2)       { setSaveMsg('Track / Strand is required.');               setSaving(false); return; }
    if (gs.length > 50)             { setSaveMsg('Track / Strand must not exceed 50 characters.'); setSaving(false); return; }
    if (!contact)                        { setSaveMsg('Contact number is required.');                                           setSaving(false); return; }
    if (!/^\d{11}$/.test(contact))       { setSaveMsg('Contact number must be exactly 11 digits (e.g. 09171234567).');           setSaving(false); return; }

    const fullName = composeName(last, first, mi);

    const { data: saved, error } = await localDb.from('users')
      .update({ name: fullName, student_id: empId, position: pos, course_year: pos, grade_section: gs, contact_number: contact })
      .eq('auth_id', user.id).select('name, student_id, course_year, grade_section, lrn').maybeSingle();

    if (error)   setSaveMsg('Error: ' + error.message);
    else if (!saved) setSaveMsg('Save failed: ask your admin to enable UPDATE access on the users table.');
    else {
      setUserData(prev => ({ ...prev, name: fullName, student_id: empId, position: pos, course_year: pos, grade_section: gs, contact_number: contact }));
      setSaveMsg('success');
      setTimeout(() => { setShowModal(false); setSaveMsg(''); }, 1000);
    }
    setSaving(false);
  }

  if (loading) {
    return <BookLoader message="Loading profile" />;
  }

  const displayName  = userData?.name || 'User';
  const initials     = displayName.split(' ').map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
  const isActive     = (userData?.status || 'active') === 'active';
  const completion   = getCompletion(userData, isTeacher);

  // ── Derive stat card data from available userData ──────────────────────
  const gs = userData?.grade_section || userData?.course_year || '';
  const { grade, section } = parseGradeSection(gs);

  // ── Row 1: stat cards (always 3) ──────────────────────────────────────
  const topCards = [
    {
      icon: <FaBook />,
      label: 'Active Loans',
      value: loanStats.loading ? '…' : String(loanStats.active),
      accent: '#15803d',
      gradient: 'linear-gradient(135deg,#15803d,#16a34a)',
      sub: 'books borrowed',
      isStat: true,
    },
    {
      icon: <FaClock />,
      label: 'Pending Requests',
      value: loanStats.loading ? '…' : String(loanStats.pending),
      accent: '#b45309',
      gradient: 'linear-gradient(135deg,#b45309,#d97706)',
      sub: 'awaiting approval',
      isStat: true,
    },
    {
      icon: <FaCheckCircle />,
      label: 'Account Status',
      value: isActive ? 'Active' : 'Inactive',
      accent: isActive ? '#15803d' : '#dc2626',
      gradient: isActive
        ? 'linear-gradient(135deg,#15803d,#16a34a)'
        : 'linear-gradient(135deg,#b91c1c,#dc2626)',
      isStatus: true,
    },
  ];

  // ── Row 2: profile info cards ──────────────────────────────────────────
  const infoCards = isTeacher
    ? [
        {
          icon: <FaIdCard />,
          label: 'Employee ID',
          value: userData?.student_id || '—',
          accent: '#7c1d1d',
          gradient: 'linear-gradient(135deg,#7c1d1d,#b91c1c)',
        },
        {
          icon: <FaBriefcase />,
          label: 'Position',
          value: userData?.position || userData?.course_year || '—',
          accent: '#6d28d9',
          gradient: 'linear-gradient(135deg,#6d28d9,#7c3aed)',
        },
      ]
    : [
        {
          icon: <FaIdCard />,
          label: 'LRN',
          value: userData?.lrn || userData?.student_id || '—',
          accent: '#7c1d1d',
          gradient: 'linear-gradient(135deg,#7c1d1d,#b91c1c)',
        },
        {
          icon: <FaGraduationCap />,
          label: 'Grade & Section',
          value: grade && section ? `${grade} · ${section}` : grade || section || '—',
          accent: '#0369a1',
          gradient: 'linear-gradient(135deg,#0369a1,#0284c7)',
        },
      ];

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <style>{`
        /* ── Layout ── */
        .profile-wrap { max-width: 900px; margin: 0 auto; padding: 40px 24px; }

        /* ── Top card ── */
        .profile-top { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.07); margin-bottom: 24px; }
        .profile-banner { height: 120px; background: linear-gradient(135deg, var(--maroon) 0%, #b91c1c 100%); }
        .avatar-row { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 32px; margin-top: -50px; margin-bottom: 16px; }
        .avatar-circle { width: 96px; height: 96px; border-radius: 50%; background: var(--maroon); color: white; font-size: 2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 4px 16px rgba(0,0,0,0.18); flex-shrink: 0; }
        .profile-info { padding: 0 32px 28px; }

        /* ── Summary strip ── */
        @keyframes cardRise {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        /* ── Two-row card section ── */
        .stats-section { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }

        /* Row 1 — 3 stat cards */
        .top-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        /* Row 2 — 2 info cards */
        .info-strip {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        /* ── Base card shell ── */
        .sc {
          position: relative;
          background: white;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
          border: 1px solid rgba(0,0,0,0.055);
          display: flex;
          flex-direction: column;
          padding: 20px 18px 18px;
          gap: 0;
          opacity: 0;
          animation: cardRise 0.42s cubic-bezier(0.22,1,0.36,1) forwards;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
        }
        .sc:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06);
        }
        /* staggered delays — top strip */
        .top-strip  .sc:nth-child(1) { animation-delay: 0.04s; }
        .top-strip  .sc:nth-child(2) { animation-delay: 0.10s; }
        .top-strip  .sc:nth-child(3) { animation-delay: 0.16s; }
        /* staggered delays — info strip */
        .info-strip .sc:nth-child(1) { animation-delay: 0.22s; }
        .info-strip .sc:nth-child(2) { animation-delay: 0.28s; }

        /* coloured top accent bar */
        .sc-bar {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          border-radius: 18px 18px 0 0;
        }

        /* soft colour wash behind icon */
        .sc-wash {
          position: absolute;
          top: -18px; right: -18px;
          width: 90px; height: 90px;
          border-radius: 50%;
          opacity: 0.08;
          pointer-events: none;
        }

        /* icon badge */
        .sc-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          margin-bottom: 14px;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }

        /* label */
        .sc-label {
          font-size: 0.67rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #94a3b8;
          margin-bottom: 5px;
          position: relative; z-index: 1;
        }

        /* main value */
        .sc-value {
          font-size: 1.05rem;
          font-weight: 800;
          color: #1e293b;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          position: relative; z-index: 1;
        }
        /* numeric-stat cards get a bigger, bolder number */
        .sc.sc-stat .sc-value {
          font-size: 2rem;
          letter-spacing: -0.03em;
        }

        /* sub-text */
        .sc-sub {
          font-size: 0.7rem;
          color: #94a3b8;
          margin-top: 4px;
          position: relative; z-index: 1;
        }

        /* status pill */
        .sc-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 20px;
          margin-top: 2px;
          width: fit-content;
          position: relative; z-index: 1;
        }
        .sc-pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.75); }
        }

        /* progress bar */
        .sc-prog-track {
          width: 100%;
          height: 5px;
          background: #e2e8f0;
          border-radius: 99px;
          margin-top: 10px;
          overflow: hidden;
          position: relative; z-index: 1;
        }
        .sc-prog-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
        }
        .sc-prog-label {
          font-size: 0.67rem;
          color: #94a3b8;
          margin-top: 5px;
          position: relative; z-index: 1;
        }

        /* shimmer loading state */
        .sc-loading .sc-value {
          background: linear-gradient(90deg, #e2e8f0 25%, #f8fafc 50%, #e2e8f0 75%);
          background-size: 200% auto;
          animation: shimmer 1.4s linear infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Row 2 info cards — clean, understated ── */
        .ic {
          position: relative;
          background: white;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          border: 1px solid #e8edf2;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 22px;
          opacity: 0;
          animation: cardRise 0.42s cubic-bezier(0.22,1,0.36,1) forwards;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ic:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
        }
        .info-strip .ic:nth-child(1) { animation-delay: 0.22s; }
        .info-strip .ic:nth-child(2) { animation-delay: 0.28s; }

        .ic-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          color: #64748b;
          flex-shrink: 0;
        }
        .ic-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .ic-label {
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #94a3b8;
        }
        .ic-value {
          font-size: 0.98rem;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .info-card { background: white; border-radius: 14px; padding: 22px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; }
        .edit-modal { background: white; border-radius: 18px; padding: 32px; width: 100%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; overflow-x: hidden; box-sizing: border-box; word-break: break-word; overflow-wrap: anywhere; }
        .name-row  { display: grid; grid-template-columns: 1fr 1fr 80px; gap: 12px; }
        .grade-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .top-strip  { grid-template-columns: 1fr 1fr; }
          .top-strip  .sc:last-child { grid-column: 1 / -1; }
          .info-strip { grid-template-columns: 1fr; }
          .sc { padding: 16px 14px 14px; }
          .sc.sc-stat .sc-value { font-size: 1.7rem; }
          .ic { padding: 16px 18px; }
        }
        @media (max-width: 600px) {
          .profile-wrap  { padding: 20px 14px; }
          .avatar-row    { padding: 0 16px; margin-top: -40px; }
          .avatar-circle { width: 72px; height: 72px; font-size: 1.5rem; border-width: 3px; }
          .modal-overlay { align-items: flex-end; padding: 0; }
          .edit-modal    { border-radius: 20px 20px 0 0; max-height: 88vh; max-width: 100%; }
          .profile-info  { padding: 0 16px 20px; }
          .profile-info h2 { font-size: 1.25rem !important; }
          .info-grid     { grid-template-columns: 1fr 1fr; gap: 12px; }
          .info-card     { padding: 16px; }
          .edit-modal    { padding: 20px 16px; border-radius: 14px; }
          .name-row  { grid-template-columns: 1fr 1fr; }
          .name-row .mi-field { grid-column: 1 / -1; }
          .grade-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 400px) {
          .info-grid { grid-template-columns: 1fr; }
          .name-row  { grid-template-columns: 1fr; }
          .name-row .mi-field { grid-column: unset; }
        }
      `}</style>

      <Toast {...toast} onClose={() => setToast({ message: '' })} />
      <StudentNavbar />

      <div className="profile-wrap">
        {/* ── Top Card ── */}
        <div className="profile-top">
          <div className="profile-banner" />
          <div className="avatar-row">
            <div className="avatar-circle">{initials}</div>
            <button
              onClick={openEditModal}
              style={{ background: 'var(--maroon)', color: 'white', border: 'none', padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}
            >
              <FaEdit style={{ fontSize: '0.85rem' }} /> Edit Profile
            </button>
          </div>
          <div className="profile-info">
            <h2 style={{ margin: '0 0 4px', fontSize: '1.6rem', color: '#1e293b' }}>{displayName}</h2>
            <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '0.9rem' }}>{userData?.email || '—'}</p>
            <span style={{ display: 'inline-block', background: '#F5FAE8', color: 'var(--green)', fontSize: '0.72rem', fontWeight: 700, padding: '4px 14px', borderRadius: 20, letterSpacing: '0.6px' }}>
              {(userData?.role || 'student').toUpperCase()}
            </span>
          </div>
        </div>

        {/* ── Stat Cards: Row 1 (loans + status) & Row 2 (profile info) ── */}
        <div className="stats-section">

          {/* Row 1 — Active Loans · Pending · Account Status */}
          <div className="top-strip">
            {topCards.map((card, i) => {
              const isStat   = card.isStat;
              const isStatus = card.isStatus;
              return (
                <div key={i} className={`sc${isStat ? ' sc-stat' : ''}${loanStats.loading && isStat ? ' sc-loading' : ''}`}>
                  <div className="sc-bar" style={{ background: card.gradient || card.accent }} />
                  <div className="sc-wash" style={{ background: card.accent }} />
                  <div className="sc-icon" style={{ background: card.accent + '15', color: card.accent }}>{card.icon}</div>
                  <div className="sc-label">{card.label}</div>
                  {isStatus ? (
                    <div className="sc-pill" style={{ background: card.accent + '15', color: card.accent }}>
                      <span className="sc-pill-dot" style={{ background: card.accent }} />
                      {card.value}
                    </div>
                  ) : (
                    <div className="sc-value" style={{ color: card.accent }}>{card.value}</div>
                  )}
                  {isStatus ? (
                    <>
                      <div className="sc-prog-track" style={{ marginTop: 12 }}>
                        <div className="sc-prog-fill" style={{ width: `${completion}%`, background: card.gradient || card.accent }} />
                      </div>
                      <div className="sc-prog-label">{completion}% profile complete</div>
                    </>
                  ) : card.sub ? (
                    <div className="sc-sub">{card.sub}</div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Row 2 — LRN & Grade / Employee ID & Position */}
          <div className="info-strip">
            {infoCards.map((card, i) => (
              <div key={i} className="ic">
                <div className="ic-icon">{card.icon}</div>
                <div className="ic-body">
                  <div className="ic-label">{card.label}</div>
                  <div className="ic-value">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ── Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <div>
                <h3 style={{ margin: '0 0 2px', color: 'var(--maroon)', fontSize: '1.12rem', fontWeight: 800 }}>Edit Profile</h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Update your personal information</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8', padding: '4px 6px' }}>
                <MdClose />
              </button>
            </div>

            {isTeacher ? (
              <form onSubmit={handleSaveTeacher} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <div className="name-row">
                    <Field label="Last Name"  placeholder="Dela Cruz" value={teacherForm.lastName}
                      onChange={v => setTeacherForm(p => ({ ...p, lastName: v }))} maxLength={50} required />
                    <Field label="First Name" placeholder="Juan"      value={teacherForm.firstName}
                      onChange={v => setTeacherForm(p => ({ ...p, firstName: v }))} maxLength={50} required />
                    <div className="mi-field">
                      <Field label="M.I." placeholder="A" value={teacherForm.middleInitial}
                        onChange={v => setTeacherForm(p => ({ ...p, middleInitial: v.replace(/[^A-Za-z]/g, '').slice(0, 2) }))} maxLength={2} />
                    </div>
                  </div>
                </div>
                <Field label="Employee ID" placeholder="e.g. 1435418" value={teacherForm.employeeId}
                  onChange={v => setTeacherForm(p => ({ ...p, employeeId: v.replace(/\D/g, '').slice(0, 7) }))} maxLength={7} required inputMode="numeric" />
                <div className="grade-row">
                  <Field label="Position / Designation" placeholder="e.g. Teacher I" value={teacherForm.position}
                    onChange={v => setTeacherForm(p => ({ ...p, position: v }))} maxLength={80} required />
                  <Field label="Track / Strand" placeholder="e.g. STEM or Grade 9" value={teacherForm.gradeSection}
                    onChange={v => setTeacherForm(p => ({ ...p, gradeSection: v }))} maxLength={50} required />
                </div>
                <Field label="Contact Number" placeholder="e.g. 09171234567" value={teacherForm.contact}
                  onChange={v => setTeacherForm(p => ({ ...p, contact: v.replace(/\D/g, '').slice(0, 11) }))} maxLength={11} inputMode="numeric" required />
                <SaveFooter saveMsg={saveMsg} saving={saving} onCancel={() => setShowModal(false)} />
              </form>
            ) : (
              <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <FieldLabel>Full Name</FieldLabel>
                  <div className="name-row">
                    <Field label="Last Name"  placeholder="Dela Cruz" value={form.lastName}
                      onChange={v => setForm(p => ({ ...p, lastName: v }))} maxLength={50} required />
                    <Field label="First Name" placeholder="Juan"      value={form.firstName}
                      onChange={v => setForm(p => ({ ...p, firstName: v }))} maxLength={50} required />
                    <div className="mi-field">
                      <Field label="M.I." placeholder="A" value={form.middleInitial}
                        onChange={v => setForm(p => ({ ...p, middleInitial: v.replace(/[^A-Za-z]/g, '').slice(0, 2) }))} maxLength={2} />
                    </div>
                  </div>
                  <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                    Preview: <strong style={{ color: '#475569' }}>{composeName(form.lastName, form.firstName, form.middleInitial) || '—'}</strong>
                  </p>
                </div>

                <Field label="LRN (12 digits)" placeholder="123456789012" value={form.lrn}
                  onChange={v => setForm(p => ({ ...p, lrn: v.replace(/\D/g, '').slice(0, 12) }))}
                  inputMode="numeric" maxLength={12} required />

                <div className="grade-row">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={labelStyle}>Grade Level <span style={{ color: '#ef4444' }}>*</span></label>
                    <select value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} required style={selectFieldStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--maroon)'} onBlur={e => e.target.style.borderColor = '#e2e8f0'}>
                      <option value="">Select Grade</option>
                      {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <Field label="Section / Strand" placeholder="e.g. STEM or Rizal" value={form.section}
                    onChange={v => setForm(p => ({ ...p, section: v }))} maxLength={50} required />
                </div>

                <SaveFooter saveMsg={saveMsg} saving={saving} onCancel={() => setShowModal(false)} />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function FieldLabel({ children }) {
  return <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', marginBottom: 8 }}>{children}</div>;
}

function Field({ label, placeholder, value, onChange, required, inputMode, maxLength, minLength }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={labelStyle}>{label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}</label>
      <input
        type="text" placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        required={required} inputMode={inputMode} maxLength={maxLength} minLength={minLength}
        style={fieldInputStyle}
        onFocus={e => (e.target.style.borderColor = 'var(--maroon)')}
        onBlur={e  => (e.target.style.borderColor = '#e2e8f0')}
      />
    </div>
  );
}

function SaveFooter({ saveMsg, saving, onCancel }) {
  return (
    <>
      {saveMsg && saveMsg !== 'success' && (
        <p style={{ margin: 0, fontSize: '0.84rem', color: '#ef4444', textAlign: 'center', background: '#fee2e2', padding: '8px 12px', borderRadius: 8 }}>{saveMsg}</p>
      )}
      {saveMsg === 'success' && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--green)', textAlign: 'center', fontWeight: 600 }}>
          <FaCheckCircle style={{ verticalAlign: 'middle' }} /> Saved successfully!
        </p>
      )}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        <button type="button" onClick={onCancel} style={{ flex: 1, padding: 11, borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
        <button type="submit" disabled={saving} style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: 'var(--maroon)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="info-card">
      <div style={{ fontSize: '1.5rem', marginBottom: 8, color: 'var(--maroon)' }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

const labelStyle = { fontSize: '0.8rem', fontWeight: 700, color: '#475569' };
const fieldInputStyle = { padding: '10px 13px', borderRadius: 9, border: '1.5px solid #e2e8f0', fontSize: '0.93rem', background: 'var(--cream)', outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' };
const selectFieldStyle = { ...fieldInputStyle, cursor: 'pointer', appearance: 'none' };