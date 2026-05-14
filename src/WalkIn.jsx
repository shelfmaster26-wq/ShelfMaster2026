import React, { useEffect, useState, useMemo } from 'react';
import { localDbAdmin } from './localDbAdmin';
import { getServerNow } from './serverTime';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import BookLoader from './BookLoader';
import {
  FaBookOpen, FaChalkboardTeacher, FaCheck, FaGraduationCap,
  FaSearch, FaTrash, FaClipboardList, FaInfoCircle,
  FaExclamationCircle, FaCheckCircle, FaSpinner, FaBook,
  FaCalendarAlt, FaUserGraduate, FaIdCard,
} from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

/* ─── Design System ─── */
const PALETTE = {
  ivory:    '#F9F7F2',
  ivoryDk:  '#F1EDE3',
  border:   '#E8E2D7',
  muted:    '#8C8070',
  text:     '#2A2118',
  textSoft: '#6B5F52',
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .wi-root { font-family: 'DM Sans', sans-serif; }
  .wi-root *, .wi-root *::before, .wi-root *::after { box-sizing: border-box; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.8s linear infinite; display: inline-block; }

  @keyframes wi-rise {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wi-rise { animation: wi-rise 0.45s cubic-bezier(0.22,1,0.36,1) both; }
  .wi-rise-1 { animation-delay: 0.05s; }
  .wi-rise-2 { animation-delay: 0.12s; }
  .wi-rise-3 { animation-delay: 0.19s; }

  /* ── Top row ── */
  .wi-top-row {
    display: grid;
    grid-template-columns: 1fr 310px;
    gap: 18px;
    align-items: start;
  }

  /* ── Book grid ── */
  .wi-book-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: 232px;
    gap: 10px;
    max-height: calc(232px * 2 + 10px);
    overflow-y: auto;
    padding: 2px 2px 4px;
    scrollbar-width: thin;
    scrollbar-color: #E8E2D7 transparent;
  }
  .wi-book-grid::-webkit-scrollbar { width: 5px; }
  .wi-book-grid::-webkit-scrollbar-thumb { background: #E8E2D7; border-radius: 99px; }

  /* ── Book card ── */
  .wi-book-card {
    background: white;
    border: 1.5px solid #E8E2D7;
    border-radius: 12px;
    padding: 0;
    text-align: left;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    position: relative;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
  }
  .wi-book-card:not(:disabled):hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.09);
    border-color: #c5bdb0;
  }
  .wi-book-card:disabled { cursor: not-allowed; }

  /* ── Toggle pill ── */
  .wi-toggle {
    position: relative;
    display: flex;
    background: #F1EDE3;
    border-radius: 12px;
    padding: 4px;
    flex-shrink: 0;
  }
  .wi-toggle-pill {
    position: absolute;
    top: 4px; bottom: 4px;
    width: calc(50% - 6px);
    border-radius: 9px;
    transition: left 0.28s cubic-bezier(0.4,0,0.2,1), background 0.28s;
    z-index: 0;
  }
  .wi-toggle-btn {
    position: relative; z-index: 1;
    display: flex; align-items: center; gap: 7px;
    padding: 8px 20px;
    border: none; background: transparent;
    border-radius: 9px; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700; font-size: 0.84rem;
    color: #8C8070;
    transition: color 0.2s;
    white-space: nowrap;
  }
  .wi-toggle-btn.active { color: white; }

  /* ── Input focus ── */
  .wi-input:focus, .wi-select:focus {
    outline: none;
    border-color: var(--maroon) !important;
    box-shadow: 0 0 0 3px rgba(139,0,0,0.09) !important;
    background: #fff !important;
  }

  /* ── Remove btn hover ── */
  .wi-remove-btn:hover { background: #fee2e2 !important; }

  /* ── Borrow row hover ── */
  .wi-borrow-row { transition: background 0.13s ease; }
  .wi-borrow-row:hover { background: #F9F7F2 !important; }

  /* ── Card header divider ── */
  .wi-card-header {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #F1EDE3;
  }

  @media (max-width: 980px) {
    .wi-top-row { grid-template-columns: 1fr; }
    .wi-book-grid { grid-template-columns: repeat(4, 1fr); }
  }
  @media (max-width: 600px) {
    .wi-book-grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 200px; max-height: calc(200px * 2 + 10px); }
    .wi-toggle-btn { padding: 8px 12px; font-size: 0.78rem; }
  }
`;

/* ─── Input restrictions ─── */
const ALPHA_ONLY     = /^[a-zA-ZÀ-ÿñÑ\s\-'.]*$/;
const ALPHANUMERIC   = /^[a-zA-Z0-9\s\-_.]*$/;
const EMAIL_OR_PHONE = /^[a-zA-Z0-9@.\-+_()\s]*$/;
const restrict = (value, pattern) => pattern.test(value) ? value : undefined;
const capFirst = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const DEFAULT_STRANDS = ['STEM','HUMSS','ABM','GAS','TVL - Industrial Arts','TVL - Home Economics','TVL - ICT','TVL - Agri-Fishery Arts','Sports','Arts & Design'];
const GRADE_LEVELS   = ['Grade 11', 'Grade 12'];

const parseCombinedGS = (combined) => {
  if (!combined) return { grade: '', strand: '', section: '' };
  const parts = combined.split(' - ');
  if (parts.length >= 3) return { grade: parts[0].trim(), strand: parts[1].trim(), section: parts.slice(2).join(' - ').trim() };
  if (parts.length === 2) return { grade: parts[0].trim(), strand: '', section: parts[1].trim() };
  return { grade: '', strand: '', section: combined.trim() };
};

const parseName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', middleInitial: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleInitial: '', lastName: '' };
  const miCandidate = parts.length >= 3 ? parts[parts.length - 2] : '';
  const isMI = /^[A-ZÑ]\.?$/.test(miCandidate);
  if (isMI && parts.length >= 3) return { firstName: parts.slice(0, parts.length - 2).join(' '), middleInitial: miCandidate.replace('.', ''), lastName: parts[parts.length - 1] };
  return { firstName: parts.slice(0, parts.length - 1).join(' '), middleInitial: '', lastName: parts[parts.length - 1] };
};

const EMPTY_STUDENT = { firstName: '', lastName: '', middleInitial: '', grade: '', strand: '', section: '', lrn: '', adviser: '', contact: '' };
const EMPTY_TEACHER = { firstName: '', lastName: '', middleInitial: '', employeeId: '', position: '', gradeSection: '', contact: '' };

/* ─── Shared input style ─── */
const inputBase = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 9,
  border: `1.5px solid ${PALETTE.border}`,
  fontSize: '0.87rem',
  boxSizing: 'border-box',
  background: '#FAFAF8',
  color: PALETTE.text,
  fontFamily: "'DM Sans', sans-serif",
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const inputErr = { borderColor: '#fca5a5', background: '#fff5f5' };

const cardBase = {
  background: '#ffffff',
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 16,
};

export default function WalkIn() {
  const [borrowerType, setBorrowerType] = useState('student');
  const [toast, setToast]               = useState({ message: '', type: 'success' });
  const showToast = (msg, type = 'success') => setToast({ message: msg, type });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, danger: false, confirmText: 'Confirm' });
  const openConfirm  = (opts) => setConfirmModal({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmModal(m => ({ ...m, isOpen: false }));

  const [strands, setStrands]             = useState(DEFAULT_STRANDS);
  const [books, setBooks]                 = useState([]);
  const [copyAccessions, setCopyAccessions] = useState([]); // [{ book_id, accession_id }]
  const [loading, setLoading]             = useState(false);
  const [booksLoaded, setBooksLoaded]     = useState(false);
  const [studentForm, setStudentForm]     = useState(EMPTY_STUDENT);
  const [studentLinked, setStudentLinked] = useState(null);
  const [lrnLookupState, setLrnLookupState] = useState('idle');
  const [teacherForm, setTeacherForm]     = useState(EMPTY_TEACHER);
  const [teacherLinked, setTeacherLinked] = useState(null);
  const [empLookupState, setEmpLookupState] = useState('idle');
  const [bookQuery, setBookQuery]         = useState('');
  const [borrowList, setBorrowList]       = useState([]);
  const [submitting, setSubmitting]       = useState(false);
  const [defaultBorrowDays, setDefaultBorrowDays] = useState(7);
  const [maxBorrow, setMaxBorrow]         = useState(3);
  const [studentErrors, setStudentErrors] = useState({});
  const [teacherErrors, setTeacherErrors] = useState({});

  useEffect(() => {
    localDbAdmin.from('fine_policy').select('borrow_duration_value, borrow_duration_unit, max_borrow_count').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (data?.borrow_duration_value) {
          const days = data.borrow_duration_unit === 'hours' ? Math.ceil(data.borrow_duration_value / 24) : data.borrow_duration_value;
          setDefaultBorrowDays(Math.max(1, days));
        }
        if (data?.max_borrow_count) setMaxBorrow(Math.max(1, data.max_borrow_count));
      });
    localDbAdmin.from('site_content').select('strands').limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.strands) { try { const arr = JSON.parse(data.strands); if (Array.isArray(arr) && arr.length) setStrands(arr); } catch {} }
      });
  }, []);

  useEffect(() => {
    if (booksLoaded) return;
    setLoading(true); setBooksLoaded(true);
    localDbAdmin.from('books').select('id, title, authors, barcode, accession_num, quantity, book_type, status, cover_image, category').eq('status', 'active').order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) showToast('Failed to load books: ' + error.message, 'error');
        else setBooks((data || []).filter(b => (b.book_type || '').toLowerCase() !== 'ebook'));
        setLoading(false);
      });
    // Load book_copies accession IDs for search
    localDbAdmin.from('book_copies').select('book_id, accession_id')
      .then(({ data }) => { if (data) setCopyAccessions(data); });
  }, [booksLoaded]);

  const inListCounts = useMemo(() => { const m = new Map(); for (const b of borrowList) m.set(b.id, (m.get(b.id) || 0) + 1); return m; }, [borrowList]);

  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return books;

    // Build a Set of book_ids whose copies have a matching accession_id
    const matchedByAccessionId = new Set(
      copyAccessions
        .filter(c => (c.accession_id || '').toLowerCase().includes(q))
        .map(c => c.book_id)
    );

    return books.filter(b =>
      (b.title || '').toLowerCase().includes(q) ||
      (b.authors || '').toLowerCase().includes(q) ||
      (b.barcode || '').toLowerCase().includes(q) ||
      (b.accession_num || '').toLowerCase().includes(q) ||
      (b.category || '').toLowerCase().includes(q) ||
      matchedByAccessionId.has(b.id)
    );
  }, [books, bookQuery, copyAccessions]);

  const switchType = (type) => { if (type === borrowerType) return; setBorrowerType(type); setStudentErrors({}); setTeacherErrors({}); };
  const resetAll = () => {
    setBorrowList([]); setBookQuery('');
    setStudentForm(EMPTY_STUDENT); setTeacherForm(EMPTY_TEACHER);
    setStudentLinked(null); setTeacherLinked(null);
    setLrnLookupState('idle'); setEmpLookupState('idle');
    setStudentErrors({}); setTeacherErrors({});
  };

  const lookupByLrn = async (lrn) => {
    const clean = lrn.replace(/\D/g, '').slice(0, 12);
    setStudentForm(f => ({ ...f, lrn: clean }));
    if (clean.length < 12) { setStudentLinked(null); setLrnLookupState(clean.length ? 'typing' : 'idle'); return; }
    setLrnLookupState('searching');
    const { data } = await localDbAdmin.from('users').select('id, name, lrn, grade_section, section, adviser, contact_number').eq('lrn', clean).eq('role', 'student').limit(1).maybeSingle();
    if (data) {
      setStudentLinked(data); setLrnLookupState('found');
      const parsed = parseName(data.name); const gs = parseCombinedGS(data.grade_section);
      setStudentForm(f => ({ ...f, lrn: clean, firstName: parsed.firstName || f.firstName, lastName: parsed.lastName || f.lastName, middleInitial: parsed.middleInitial || f.middleInitial, grade: gs.grade || f.grade, strand: gs.strand || f.strand, section: data.section || gs.section || f.section, adviser: data.adviser || f.adviser, contact: data.contact_number || f.contact }));
    } else { setStudentLinked(null); setLrnLookupState('notfound'); }
  };

  const unlinkStudent = () => { setStudentLinked(null); setLrnLookupState('idle'); setStudentForm({ ...EMPTY_STUDENT, lrn: studentForm.lrn }); };

  const lookupByEmployeeId = async (empId) => {
    setTeacherForm(f => ({ ...f, employeeId: empId }));
    if (!empId.trim()) { setTeacherLinked(null); setEmpLookupState('idle'); return; }
    setEmpLookupState('searching');
    const { data: userData } = await localDbAdmin.from('users').select('id, name, student_id, grade_section, position, contact_number').eq('student_id', empId.trim()).eq('role', 'teacher').limit(1).maybeSingle();
    if (userData) {
      setTeacherLinked(userData); setEmpLookupState('found');
      const parsed = parseName(userData.name);
      setTeacherForm(f => ({ ...f, employeeId: empId, firstName: parsed.firstName || f.firstName, lastName: parsed.lastName || f.lastName, middleInitial: parsed.middleInitial || f.middleInitial, position: userData.position || f.position, gradeSection: userData.grade_section || f.gradeSection, contact: userData.contact_number || f.contact }));
      return;
    }
    const { data: txnData } = await localDbAdmin.from('transactions').select('walk_in_name, walk_in_employee_id, walk_in_position, walk_in_grade_section, walk_in_contact').eq('walk_in_employee_id', empId.trim()).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (txnData) {
      setTeacherLinked(txnData); setEmpLookupState('found');
      const parsed = parseName(txnData.walk_in_name);
      setTeacherForm(f => ({ ...f, employeeId: empId, firstName: parsed.firstName || f.firstName, lastName: parsed.lastName || f.lastName, middleInitial: parsed.middleInitial || f.middleInitial, position: txnData.walk_in_position || f.position, gradeSection: txnData.walk_in_grade_section || f.gradeSection, contact: txnData.walk_in_contact || f.contact }));
      return;
    }
    setTeacherLinked(null); setEmpLookupState('notfound');
  };

  const unlinkTeacher = () => { setTeacherLinked(null); setEmpLookupState('idle'); setTeacherForm({ ...EMPTY_TEACHER, employeeId: teacherForm.employeeId }); };

  const addBook = (b) => {
    if (borrowList.length >= maxBorrow) { showToast(`Borrowers are limited to ${maxBorrow} books per transaction.`, 'error'); return; }
    if (b.quantity <= 0)               { showToast(`"${b.title}" has no available copies.`, 'error'); return; }
    if (borrowList.some(sb => sb.id === b.id)) { showToast(`"${b.title}" is already in the list.`, 'error'); return; }
    const uid = `${b.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBorrowList(prev => [...prev, { ...b, uid }]);
  };
  const removeBook = (uid) => setBorrowList(prev => prev.filter(b => b.uid !== uid));

  const validateStudent = () => {
    const e = {};
    if (!studentForm.firstName.trim())             e.firstName = 'First name is required';
    if (!studentForm.lastName.trim())              e.lastName  = 'Last name is required';
    if (!/^\d{12}$/.test(studentForm.lrn.trim())) e.lrn       = 'LRN must be exactly 12 digits';
    if (!studentForm.grade)                        e.grade     = 'Grade level is required';
    if (!studentForm.strand)                       e.strand    = 'Strand is required';
    if (!studentForm.adviser.trim())               e.adviser   = 'Adviser name is required';
    if (!studentForm.contact.trim())               e.contact   = 'Contact number is required';
    else if (!/^\d{11}$/.test(studentForm.contact.trim())) e.contact = 'Contact number must be exactly 11 digits (e.g. 09171234567)';
    setStudentErrors(e); return Object.keys(e).length === 0;
  };

  const validateTeacher = () => {
    const e = {};
    if (!teacherForm.firstName.trim())    e.firstName    = 'First name is required';
    if (!teacherForm.lastName.trim())     e.lastName     = 'Last name is required';
    if (!teacherForm.employeeId.trim())           e.employeeId = 'Employee No. is required';
    else if (!/^\d{7}$/.test(teacherForm.employeeId.trim())) e.employeeId = 'Employee No. must be exactly 7 digits (e.g. 1435418)';
    if (!teacherForm.position.trim())     e.position     = 'Position is required';
    if (!teacherForm.gradeSection.trim()) e.gradeSection = 'Track / Strand is required';
    if (!teacherForm.contact.trim())              e.contact      = 'Contact number is required';
    else if (!/^\d{11}$/.test(teacherForm.contact.trim())) e.contact = 'Contact number must be exactly 11 digits (e.g. 09171234567)';
    setTeacherErrors(e); return Object.keys(e).length === 0;
  };

  const assignAvailableCopy = async (bookId) => {
    const { data, error } = await localDbAdmin.from('book_copies').select('id, accession_id, copy_number').eq('book_id', bookId).eq('status', 'available').order('copy_number', { ascending: true }).limit(1).maybeSingle();
    if (error && error.code !== '42P01') return null;
    return data || null;
  };

  const buildFullName = (f) => `${f.firstName.trim()}${f.middleInitial.trim() ? ' ' + f.middleInitial.trim().toUpperCase() + '.' : ''} ${f.lastName.trim()}`.trim();

  const ensureUserAccount = async (isTchr) => {
    if (!isTchr && studentLinked?.id) return studentLinked.id;
    if (isTchr  && teacherLinked?.id) return teacherLinked.id;
    const uid = `walkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!isTchr) {
      const gradeSection = [studentForm.grade, studentForm.strand].filter(Boolean).join(' - ');
      const { data, error } = await localDbAdmin.from('users').insert([{ id: uid, name: buildFullName(studentForm), lrn: studentForm.lrn.trim(), student_id: studentForm.lrn.trim(), grade_section: gradeSection, section: studentForm.section?.trim() || null, adviser: studentForm.adviser.trim(), contact_number: studentForm.contact.trim(), role: 'student', status: 'active' }]).select('id').single();
      if (error) { console.error(error); return null; }
      setStudentLinked({ id: data.id }); return data.id;
    } else {
      const { data, error } = await localDbAdmin.from('users').insert([{ id: uid, name: buildFullName(teacherForm), student_id: teacherForm.employeeId.trim(), grade_section: teacherForm.gradeSection.trim(), position: teacherForm.position.trim(), contact_number: teacherForm.contact.trim(), role: 'teacher', status: 'active' }]).select('id').single();
      if (error) { console.error(error); return null; }
      setTeacherLinked({ id: data.id }); return data.id;
    }
  };

  const handleSubmit = async () => {
    const isTchr = borrowerType === 'teacher';
    const valid  = isTchr ? validateTeacher() : validateStudent();
    if (!valid) { showToast('Please fix the highlighted fields.', 'error'); return; }
    if (borrowList.length === 0) { showToast('Please add at least one book.', 'error'); return; }
    setSubmitting(true);
    try {
      const serverNow  = await getServerNow();
      const borrowDate = serverNow.toISOString();
      const dueDate    = new Date(serverNow.getTime() + defaultBorrowDays * 86400000).toISOString();
      let success = 0; const failures = [];
      const resolvedUserId = await ensureUserAccount(isTchr);
      for (const book of borrowList) {
        try {
          const { data: freshBook, error: bErr } = await localDbAdmin.from('books').select('quantity').eq('id', book.id).single();
          if (bErr) throw bErr;
          if ((freshBook?.quantity || 0) <= 0) { failures.push(`${book.title} — no copies left`); continue; }
          const copy = await assignAvailableCopy(book.id);
          const payload = { user_id: resolvedUserId, book_id: book.id, status: 'borrowed', borrow_date: borrowDate, due_date: dueDate, copy_id: copy?.id || null };
          if (isTchr) { payload.walk_in_name = buildFullName(teacherForm); payload.walk_in_employee_id = teacherForm.employeeId.trim(); payload.walk_in_position = teacherForm.position.trim(); payload.walk_in_grade_section = teacherForm.gradeSection.trim(); payload.walk_in_contact = teacherForm.contact.trim(); }
          else        { payload.walk_in_name = buildFullName(studentForm); payload.walk_in_grade_section = [studentForm.grade, studentForm.strand].filter(Boolean).join(' - '); payload.walk_in_lrn = studentForm.lrn.trim(); payload.walk_in_teacher = studentForm.adviser.trim(); payload.walk_in_contact = studentForm.contact.trim(); }
          const { error: txnErr } = await localDbAdmin.from('transactions').insert([payload]).select().single();
          if (txnErr) throw txnErr;
          if (copy) await localDbAdmin.from('book_copies').update({ status: 'borrowed' }).eq('id', copy.id);
          await localDbAdmin.from('books').update({ quantity: (freshBook.quantity || 0) - 1 }).eq('id', book.id);
          success++;
        } catch (err) { console.error(err); failures.push(`${book.title} — ${err.message}`); }
      }
      const name = isTchr ? `${teacherForm.firstName.trim()} ${teacherForm.lastName.trim()}` : `${studentForm.firstName.trim()} ${studentForm.lastName.trim()}`;
      if (success > 0) {
        showToast(`${success} book${success > 1 ? 's' : ''} issued to ${name}.` + (failures.length ? ` ${failures.length} failed.` : ''), failures.length ? 'warning' : 'success');
        if (failures.length === 0) resetAll();
      } else { showToast('Walk-in failed: ' + failures.join('; '), 'error'); }
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const isTeacher    = borrowerType === 'teacher';
  const accentColor  = isTeacher ? 'var(--maroon)' : 'var(--green, #166534)';
  const accentHex    = isTeacher ? '#7f1d1d' : '#166534';
  const setSF = (key, val) => { setStudentForm(f => ({ ...f, [key]: val })); setStudentErrors(e => ({ ...e, [key]: '' })); };
  const setTF = (key, val) => { setTeacherForm(f => ({ ...f, [key]: val })); setTeacherErrors(e => ({ ...e, [key]: '' })); };
  const dueDateLabel = new Date(Date.now() + defaultBorrowDays * 86400000).toLocaleDateString('en-PH', { dateStyle: 'medium' });

  return (
    <div className="wi-root" style={{ background: PALETTE.ivory, minHeight: '100vh', padding: '32px 28px 56px' }}>
      <style>{CSS}</style>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} danger={confirmModal.danger} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />

      {/* ── HEADER ── */}
      <header style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
              <FaBookOpen />
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: 'var(--maroon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              Walk-in Borrowing
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: PALETTE.textSoft, paddingLeft: 52 }}>
            Issue books in person — fill borrower info, pick books, then submit.
          </p>
        </div>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700,
            background: isTeacher ? '#FFF0F0' : '#F0FDF4',
            color: isTeacher ? 'var(--maroon)' : '#166534',
            border: `1px solid ${isTeacher ? '#fecaca' : '#bbf7d0'}`,
          }}>
            {isTeacher ? <FaChalkboardTeacher /> : <FaGraduationCap />}
            {isTeacher ? 'Teacher / Staff' : 'Student'}
          </div>
          {borrowList.length > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700, background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
              <FaClipboardList /> {borrowList.length}/{maxBorrow} books
            </div>
          )}
        </div>
      </header>

      {/* ══ ROW 1: Pick Books + Borrow List ══ */}
      <div className="wi-top-row wi-rise wi-rise-1">

        {/* ─ Pick Books card ─ */}
        <div style={{ ...cardBase, padding: '22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="wi-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StepBadge n="1" color="#f59e0b" />
              <FaSearch style={{ color: '#f59e0b', fontSize: '0.9rem' }} />
              <h3 style={cardTitle}>Pick Books</h3>
            </div>
            <span style={{ fontSize: '0.77rem', color: PALETTE.muted, fontWeight: 600, background: PALETTE.ivoryDk, padding: '3px 10px', borderRadius: 20 }}>
              {filteredBooks.length} available
            </span>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <FaSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: PALETTE.muted, fontSize: '0.8rem', pointerEvents: 'none' }} />
            <input
              className="wi-input"
              style={{ ...inputBase, paddingLeft: 36, paddingRight: bookQuery ? 36 : 13 }}
              placeholder="Search title, author, barcode, accession ID, category…"
              value={bookQuery}
              onChange={e => setBookQuery(e.target.value)}
            />
            {bookQuery && (
              <button onClick={() => setBookQuery('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.muted, fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                <MdClose />
              </button>
            )}
          </div>

          {loading ? (
            <BookLoader inline message="Loading books" />
          ) : (
            <div className="wi-book-grid">
              {filteredBooks.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: PALETTE.muted, textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: PALETTE.ivoryDk, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <FaSearch style={{ fontSize: '1.3rem', color: PALETTE.border }} />
                  </div>
                  <span style={{ fontWeight: 600, color: PALETTE.textSoft }}>No books found</span>
                  <span style={{ fontSize: '0.78rem', marginTop: 3 }}>Try a different search term</span>
                </div>
              ) : filteredBooks.map(b => {
                const inCart    = inListCounts.get(b.id) || 0;
                const remaining = Math.max(0, b.quantity - inCart);
                const disabled  = remaining <= 0 || borrowList.length >= maxBorrow;
                return (
                  <button key={b.id} onClick={() => addBook(b)} disabled={disabled}
                    className="wi-book-card"
                    style={{
                      opacity: disabled ? 0.45 : 1,
                      borderColor: inCart > 0 ? '#16a34a' : PALETTE.border,
                      boxShadow: inCart > 0 ? '0 0 0 2px #d1fae5' : 'none',
                    }}
                  >
                    {inCart > 0 && (
                      <div style={{ position: 'absolute', top: 6, right: 6, background: '#16a34a', color: 'white', borderRadius: 999, minWidth: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, zIndex: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>{inCart}</div>
                    )}
                    <div style={{ width: '100%', height: 148, position: 'relative', background: PALETTE.ivoryDk, borderRadius: '10px 10px 0 0', overflow: 'hidden', flexShrink: 0 }}>
                      {b.cover_image
                        ? <img src={b.cover_image} alt={b.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                        : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaBook style={{ color: PALETTE.border, fontSize: '1.6rem' }} /></div>}
                      {inCart > 0 && <div style={{ position: 'absolute', inset: 0, background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: '1.4rem' }}><FaCheck /></div>}
                    </div>
                    <div style={{ padding: '7px 8px 9px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: '0.73rem', fontWeight: 700, color: PALETTE.text, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{b.title}</div>
                      <div style={{ fontSize: '0.62rem', color: PALETTE.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.authors || '—'}</div>
                      <div>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: remaining > 0 ? '#059669' : '#dc2626', background: remaining > 0 ? '#d1fae5' : '#fee2e2', padding: '1px 6px', borderRadius: 999 }}>
                          {remaining > 0 ? `${remaining} avail.` : 'Out'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─ Borrow List card ─ */}
        <div style={{ ...cardBase, padding: '22px', display: 'flex', flexDirection: 'column' }}>
          <div className="wi-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StepBadge n="2" color="#6366f1" />
              <FaClipboardList style={{ color: '#6366f1', fontSize: '0.9rem' }} />
              <h3 style={cardTitle}>Borrow List</h3>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: borrowList.length >= maxBorrow ? '#fef2f2' : PALETTE.ivoryDk,
              border: `1.5px solid ${borrowList.length >= maxBorrow ? '#fecaca' : PALETTE.border}`,
              borderRadius: 999, padding: '3px 10px',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: borrowList.length >= maxBorrow ? '#dc2626' : PALETTE.textSoft }}>{borrowList.length}/{maxBorrow}</span>
              <span style={{ fontSize: '0.7rem', color: PALETTE.muted }}>books</span>
            </div>
          </div>

          {/* Due date banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 9, padding: '8px 12px', marginBottom: 10, fontSize: '0.77rem', color: '#3730a3', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
            <FaCalendarAlt style={{ flexShrink: 0, color: '#6366f1' }} />
            <span>Due: <strong>{dueDateLabel}</strong> <span style={{ color: '#94a3b8' }}>({defaultBorrowDays}d policy)</span></span>
          </div>

          {borrowList.length >= maxBorrow && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 9, padding: '8px 12px', marginBottom: 10, fontSize: '0.77rem', color: '#be123c', fontWeight: 600 }}>
              <FaExclamationCircle style={{ flexShrink: 0 }} /> Max {maxBorrow} books reached.
            </div>
          )}

          {borrowList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px', color: PALETTE.muted, textAlign: 'center', flex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: PALETTE.ivoryDk, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <FaBookOpen style={{ fontSize: '1.3rem', color: PALETTE.border }} />
              </div>
              <span style={{ fontWeight: 600, color: PALETTE.textSoft }}>No books yet</span>
              <span style={{ fontSize: '0.78rem', marginTop: 3 }}>Search and click a book to add it</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {borrowList.map(b => (
                <div key={b.uid} className="wi-borrow-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FAFAF8', border: `1px solid ${PALETTE.border}`, borderRadius: 10 }}>
                  <div style={{ width: 40, height: 55, flexShrink: 0, borderRadius: 6, overflow: 'hidden' }}>
                    {b.cover_image
                      ? <img src={b.cover_image} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: PALETTE.ivoryDk }}><FaBook style={{ color: PALETTE.border, fontSize: '1rem' }} /></div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: PALETTE.text, fontSize: '0.83rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: '0.71rem', color: PALETTE.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.authors || '—'}</div>
                  </div>
                  <button
                    className="wi-remove-btn"
                    onClick={() => openConfirm({ title: 'Remove Book', message: `Remove "${b.title}" from the borrow list?`, confirmText: 'Remove', danger: false, onConfirm: () => { closeConfirm(); removeBook(b.uid); } })}
                    style={{ background: 'transparent', border: `1px solid ${PALETTE.border}`, borderRadius: 7, cursor: 'pointer', color: '#ef4444', padding: '5px 7px', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'background 0.13s' }}
                    title="Remove"
                  >
                    <FaTrash style={{ fontSize: '0.72rem' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {borrowList.length > 0 && (
              <button
                onClick={() => openConfirm({ title: 'Clear All', message: 'Remove all books from the list?', confirmText: 'Clear All', danger: true, onConfirm: () => { closeConfirm(); resetAll(); } })}
                style={{ padding: '10px 14px', border: `1.5px solid ${PALETTE.border}`, borderRadius: 10, background: 'white', color: PALETTE.textSoft, fontWeight: 600, fontSize: '0.83rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => openConfirm({ title: 'Issue Books', message: `Issue ${borrowList.length} book${borrowList.length !== 1 ? 's' : ''} to this borrower?`, confirmText: 'Issue', danger: false, onConfirm: () => { closeConfirm(); handleSubmit(); } })}
              disabled={submitting || borrowList.length === 0}
              style={{
                flex: 1, padding: 11, border: 'none', borderRadius: 10,
                background: (submitting || borrowList.length === 0) ? PALETTE.muted : accentHex,
                color: 'white', fontWeight: 700, fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: (submitting || borrowList.length === 0) ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.15s, transform 0.15s',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: borrowList.length > 0 && !submitting ? `0 4px 14px ${accentHex}44` : 'none',
              }}
            >
              {submitting
                ? <><FaSpinner className="spin" /> Issuing…</>
                : <><FaCheck /> Issue {borrowList.length > 0 ? borrowList.length : ''} Book{borrowList.length !== 1 ? 's' : ''}</>}
            </button>
          </div>
        </div>
      </div>

      {/* ══ ROW 2: Borrower Information ══ */}
      <div className="wi-rise wi-rise-2" style={{ ...cardBase, marginTop: 18, overflow: 'hidden' }}>
        {/* Header with toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '18px 22px', borderBottom: `1px solid ${PALETTE.ivoryDk}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <StepBadge n="3" color={accentHex} />
            <span style={{ color: accentHex, fontSize: '0.9rem' }}>
              {isTeacher ? <FaChalkboardTeacher /> : <FaGraduationCap />}
            </span>
            <h3 style={cardTitle}>Borrower Information</h3>
            <span style={{ fontSize: '0.77rem', color: PALETTE.muted, fontWeight: 500 }}>
              {isTeacher ? '— Teacher / Staff' : '— Student'}
            </span>
          </div>

          {/* Toggle */}
          <div className="wi-toggle">
            <div className="wi-toggle-pill" style={{ left: isTeacher ? 'calc(50% + 2px)' : '4px', background: accentHex }} />
            <button className={`wi-toggle-btn${!isTeacher ? ' active' : ''}`} onClick={() => switchType('student')}>
              <FaGraduationCap /> Student
            </button>
            <button className={`wi-toggle-btn${isTeacher ? ' active' : ''}`} onClick={() => switchType('teacher')}>
              <FaChalkboardTeacher /> Teacher
            </button>
          </div>
        </div>

        {/* Slide container */}
        <div style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', width: '200%', transition: 'transform 0.30s cubic-bezier(0.4,0,0.2,1)', transform: isTeacher ? 'translateX(-50%)' : 'translateX(0%)' }}>

            {/* ─ Student Form ─ */}
            <div style={{ width: '50%', minWidth: '50%', padding: '22px' }}>
              <div style={formGrid}>

                {/* LRN full width */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <WiLabel label="LRN" required hint="12 digits · auto-fills from account" icon={<FaIdCard />} />
                  <div style={{ position: 'relative' }}>
                    <input
                      className="wi-input"
                      style={{ ...inputBase, fontFamily: 'monospace', letterSpacing: '0.08em', ...(studentErrors.lrn ? inputErr : {}) }}
                      value={studentForm.lrn} inputMode="numeric" maxLength={12}
                      onChange={e => lookupByLrn(e.target.value)} placeholder="123456789012"
                    />
                    <LookupBadge state={lrnLookupState} />
                  </div>
                  {studentErrors.lrn && <WiFieldError msg={studentErrors.lrn} />}
                  <LookupBanner state={lrnLookupState} linked={studentLinked} name={studentLinked?.name} sub={studentLinked?.grade_section} onUnlink={unlinkStudent} notFoundMsg="No account found — fill in fields manually." />
                </div>

                <div>
                  <WiLabel label="First Name" required />
                  <input className="wi-input" style={{ ...inputBase, ...(studentErrors.firstName ? inputErr : {}) }} value={studentForm.firstName} maxLength={50} placeholder="Juan"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setSF('firstName', capFirst(v)); }} />
                  {studentErrors.firstName && <WiFieldError msg={studentErrors.firstName} />}
                </div>

                <div>
                  <WiLabel label="Last Name" required />
                  <input className="wi-input" style={{ ...inputBase, ...(studentErrors.lastName ? inputErr : {}) }} value={studentForm.lastName} maxLength={50} placeholder="Dela Cruz"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setSF('lastName', capFirst(v)); }} />
                  {studentErrors.lastName && <WiFieldError msg={studentErrors.lastName} />}
                </div>

                <div style={{ maxWidth: 110 }}>
                  <WiLabel label="M.I." hint="Optional" />
                  <input className="wi-input" style={inputBase} value={studentForm.middleInitial} maxLength={1} placeholder="S"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setSF('middleInitial', v.toUpperCase()); }} />
                </div>

                <div>
                  <WiLabel label="Grade Level" required />
                  <select className="wi-select" style={{ ...inputBase, cursor: 'pointer', ...(studentErrors.grade ? inputErr : {}) }} value={studentForm.grade} onChange={e => setSF('grade', e.target.value)}>
                    <option value="">Select Grade</option>
                    {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  {studentErrors.grade && <WiFieldError msg={studentErrors.grade} />}
                </div>

                <div>
                  <WiLabel label="Strand / Track" required />
                  <select className="wi-select" style={{ ...inputBase, cursor: 'pointer', ...(studentErrors.strand ? inputErr : {}) }} value={studentForm.strand} onChange={e => setSF('strand', e.target.value)}>
                    <option value="">Select Strand</option>
                    {strands.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {studentErrors.strand && <WiFieldError msg={studentErrors.strand} />}
                </div>

                <div>
                  <WiLabel label="Section" hint="Optional" />
                  <input className="wi-input" style={inputBase} value={studentForm.section || ''} maxLength={40} placeholder="e.g. Sampaguita"
                    onChange={e => { const v = restrict(e.target.value, ALPHANUMERIC); if (v !== undefined) setSF('section', v); }} />
                </div>

                <div>
                  <WiLabel label="Adviser" required />
                  <input className="wi-input" style={{ ...inputBase, ...(studentErrors.adviser ? inputErr : {}) }} value={studentForm.adviser} maxLength={80} placeholder="Ms. Reyes"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setSF('adviser', v); }} />
                  {studentErrors.adviser && <WiFieldError msg={studentErrors.adviser} />}
                </div>

                <div>
                  <WiLabel label="Contact Number" required />
                  <input className="wi-input" style={{ ...inputBase, ...(studentErrors.contact ? inputErr : {}) }} value={studentForm.contact} maxLength={11} placeholder="09171234567" inputMode="numeric"
                    onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setSF('contact', v); }} />
                  {studentErrors.contact && <WiFieldError msg={studentErrors.contact} />}
                </div>

              </div>
            </div>

            {/* ─ Teacher Form ─ */}
            <div style={{ width: '50%', minWidth: '50%', padding: '22px' }}>
              <div style={formGrid}>

                <div style={{ gridColumn: '1 / -1' }}>
                  <WiLabel label="Employee No." required hint="Auto-fills from registered account or past records" icon={<FaIdCard />} />
                  <div style={{ position: 'relative' }}>
                    <input
                      className="wi-input"
                      style={{ ...inputBase, ...(teacherErrors.employeeId ? inputErr : {}) }}
                      value={teacherForm.employeeId} maxLength={7} placeholder="e.g. 1435418" inputMode="numeric"
                      onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 7); lookupByEmployeeId(v); }}
                    />
                    <LookupBadge state={empLookupState} />
                  </div>
                  {teacherErrors.employeeId && <WiFieldError msg={teacherErrors.employeeId} />}
                  <LookupBanner state={empLookupState} linked={teacherLinked} name={teacherLinked?.name || teacherLinked?.walk_in_name} sub={teacherLinked?.position || teacherLinked?.walk_in_position} onUnlink={unlinkTeacher} notFoundMsg="No record found — fill in fields manually." />
                </div>

                <div>
                  <WiLabel label="First Name" required />
                  <input className="wi-input" style={{ ...inputBase, ...(teacherErrors.firstName ? inputErr : {}) }} value={teacherForm.firstName} maxLength={50} placeholder="Maria"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setTF('firstName', capFirst(v)); }} />
                  {teacherErrors.firstName && <WiFieldError msg={teacherErrors.firstName} />}
                </div>

                <div>
                  <WiLabel label="Last Name" required />
                  <input className="wi-input" style={{ ...inputBase, ...(teacherErrors.lastName ? inputErr : {}) }} value={teacherForm.lastName} maxLength={50} placeholder="Reyes"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setTF('lastName', capFirst(v)); }} />
                  {teacherErrors.lastName && <WiFieldError msg={teacherErrors.lastName} />}
                </div>

                <div style={{ maxWidth: 110 }}>
                  <WiLabel label="M.I." hint="Optional" />
                  <input className="wi-input" style={inputBase} value={teacherForm.middleInitial} maxLength={1} placeholder="A"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setTF('middleInitial', v.toUpperCase()); }} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <WiLabel label="Position / Designation" required />
                  <input className="wi-input" style={{ ...inputBase, ...(teacherErrors.position ? inputErr : {}) }} value={teacherForm.position} maxLength={80} placeholder="Teacher I, Master Teacher II…"
                    onChange={e => { const v = restrict(e.target.value, ALPHA_ONLY); if (v !== undefined) setTF('position', v); }} />
                  {teacherErrors.position && <WiFieldError msg={teacherErrors.position} />}
                </div>

                <div>
                  <WiLabel label="Track / Strand" required />
                  <select className="wi-select" style={{ ...inputBase, cursor: 'pointer', ...(teacherErrors.gradeSection ? inputErr : {}) }} value={teacherForm.gradeSection} onChange={e => setTF('gradeSection', e.target.value)}>
                    <option value="">Select Strand</option>
                    {strands.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {teacherErrors.gradeSection && <WiFieldError msg={teacherErrors.gradeSection} />}
                </div>

                <div>
                  <WiLabel label="Contact Number" required />
                  <input className="wi-input" style={{ ...inputBase, ...(teacherErrors.contact ? inputErr : {}) }} value={teacherForm.contact} maxLength={11} placeholder="09171234567" inputMode="numeric"
                    onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setTF('contact', v); }} />
                  {teacherErrors.contact && <WiFieldError msg={teacherErrors.contact} />}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── Sub-components ──────────── */

const cardTitle = {
  margin: 0,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontSize: '1rem',
  fontWeight: 600,
  color: PALETTE.text,
  letterSpacing: '-0.1px',
};

const formGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 14,
};

function StepBadge({ n, color }) {
  return (
    <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
      {n}
    </div>
  );
}

function WiLabel({ label, required, hint, icon }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', fontWeight: 700, color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5, fontFamily: "'DM Sans', sans-serif" }}>
      {icon && <span style={{ fontSize: '0.7rem' }}>{icon}</span>}
      {label}
      {required && <span style={{ color: '#ef4444', fontWeight: 800 }}>*</span>}
      {hint && <span style={{ fontWeight: 400, color: PALETTE.border, marginLeft: 2, fontSize: '0.67rem', textTransform: 'none', letterSpacing: 0 }}>({hint})</span>}
    </label>
  );
}

function WiFieldError({ msg }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.7rem', color: '#ef4444', fontFamily: "'DM Sans', sans-serif" }}>
      <FaExclamationCircle style={{ fontSize: '0.65rem', flexShrink: 0 }} /> {msg}
    </div>
  );
}

function LookupBadge({ state }) {
  const map = {
    searching: { label: 'Searching…', color: '#6366f1' },
    found:     { label: 'Found ✓',    color: '#059669' },
    notfound:  { label: 'Not found',  color: PALETTE.muted },
    typing:    { label: 'Keep typing…', color: '#f59e0b' },
  };
  const info = map[state];
  if (!info) return null;
  return (
    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.64rem', fontWeight: 700, color: info.color, pointerEvents: 'none', whiteSpace: 'nowrap', background: 'white', paddingLeft: 4, fontFamily: "'DM Sans', sans-serif" }}>
      {info.label}
    </span>
  );
}

function LookupBanner({ state, linked, name, sub, onUnlink, notFoundMsg }) {
  if (state === 'found' && linked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '9px 13px', marginTop: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FaCheckCircle style={{ color: '#16a34a', fontSize: '0.85rem' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontFamily: "'DM Sans', sans-serif" }}>
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          {sub && <div style={{ fontSize: '0.71rem', color: '#4ade80', marginTop: 1 }}>{sub}</div>}
        </div>
        <button onClick={onUnlink} style={{ background: 'white', border: '1px solid #d1fae5', borderRadius: 7, cursor: 'pointer', color: PALETTE.textSoft, fontSize: '0.71rem', fontWeight: 600, padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
          <MdClose style={{ fontSize: '0.8rem' }} /> Clear
        </button>
      </div>
    );
  }
  if (state === 'notfound') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.72rem', color: PALETTE.muted, background: PALETTE.ivoryDk, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: '7px 10px', fontFamily: "'DM Sans', sans-serif" }}>
        <FaInfoCircle style={{ flexShrink: 0 }} /> {notFoundMsg}
      </div>
    );
  }
  return null;
}