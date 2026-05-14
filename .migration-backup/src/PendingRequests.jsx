import React, { useEffect, useState } from 'react';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import BookLoader from './BookLoader';
import { getServerNow } from './serverTime';
import { getBaseURL } from './connectionManager';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import {
  FaBell, FaBook, FaCheck, FaCheckCircle, FaClock,
  FaExclamationTriangle, FaGift, FaInbox,
} from 'react-icons/fa';

/* ─────────────────────────────────────────
   GLOBAL STYLES  (mirrors Inventory.jsx)
───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .pr-root { font-family: 'DM Sans', sans-serif; }
  .pr-root *, .pr-root *::before, .pr-root *::after { box-sizing: border-box; }

  /* Tab pills — identical to inv-tab */
  .pr-tab {
    padding: 9px 22px;
    border: 1.5px solid transparent;
    border-radius: 30px;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.12s ease;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
  }
  .pr-tab:active { transform: scale(0.97); }

  /* Table rows */
  .pr-tr { transition: background 0.12s ease; }
  .pr-tr:hover { background: #FAF7F2 !important; }
  .pr-tr.overdue-row:hover { background: #FFF0F0 !important; }

  /* Action buttons — mirrors inv-action-btn */
  .pr-action-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 7px;
    font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    border: 1.5px solid transparent;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .pr-action-btn:hover  { transform: translateY(-1px); }
  .pr-action-btn:active { transform: scale(0.97); }

  /* Approve — green primary */
  .pr-btn-approve {
    background: var(--green); color: white; border-color: var(--green);
  }
  .pr-btn-approve:hover { opacity: 0.88; box-shadow: 0 4px 14px rgba(125,179,86,0.35); }
  .pr-btn-approve:disabled {
    background: #9CA3AF; border-color: #9CA3AF; cursor: not-allowed;
    box-shadow: none; transform: none; opacity: 1;
  }

  /* Decline — ghost red */
  .pr-btn-ghost-decline {
    background: #FFF1F1; color: #B91C1C; border-color: #FECACA;
  }
  .pr-btn-ghost-decline:hover { background: #FFE2E2; border-color: #FCA5A5; }

  /* Return — ghost green */
  .pr-btn-ghost-return {
    background: #EDFAF4; color: #137A4E; border-color: #A8EDD1;
  }
  .pr-btn-ghost-return:hover { background: #D8F5E9; border-color: #72D4AE; }

  /* Return + fine — red solid */
  .pr-btn-return-fine {
    background: #E11D48; color: white; border-color: #E11D48;
  }
  .pr-btn-return-fine:hover { opacity: 0.88; box-shadow: 0 4px 14px rgba(225,29,72,0.3); }

  @media (max-width: 768px) {
    .pr-table-wrap { overflow-x: auto; }
    .pr-tabs { flex-wrap: wrap; gap: 8px !important; }
  }

  /* ── Table data cells wrap text vertically, not horizontally ── */
  td { overflow-wrap: break-word; word-break: break-word; }

  /* ══════════════════════════════════════
     MOBILE CARD LAYOUT (PendingRequests)
  ══════════════════════════════════════ */
  .pr-mobile-cards { display: none; }

  @media (max-width: 640px) {
    .pr-table-wrap { display: none !important; }
    .pr-mobile-cards { display: block; }
  }

  .pr-record-card {
    background: #fff;
    border: 1px solid #E8E2D7;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 10px;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .pr-record-card.overdue-card { border-left: 3px solid #E11D48; }

  .pr-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 8px;
    min-width: 0;
  }

  .pr-card-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: #2A2118;
    line-height: 1.35;
    flex: 1;
    min-width: 0;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .pr-card-field-label {
    font-size: 0.63rem;
    font-weight: 700;
    color: #8C8070;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .pr-card-field-value {
    font-size: 0.82rem;
    color: #2A2118;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .pr-card-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .pr-card-footer {
    border-top: 1px solid #F1EDE3;
    margin-top: 10px;
    padding-top: 9px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

/* ─────────────────────────────────────────
   DESIGN TOKENS  (same as Inventory.jsx)
───────────────────────────────────────── */
const C = {
  ivory:    '#F9F7F2',
  ivoryDk:  '#F1EDE3',
  border:   '#E8E2D7',
  muted:    '#8C8070',
  text:     '#2A2118',
  textSoft: '#6B5F52',
};

const ACTIVE_STATUSES = ['borrowed', 'approved', 'issued', 'active', 'loaned', 'checked_out'];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
async function notifyUser({ user_id, type, title, body }) {
  if (!user_id) return;
  try {
    const base    = getBaseURL();
    const session = JSON.parse(window.sessionStorage.getItem('shelfmaster-session') || 'null');
    await fetch((base || '').replace(/\/$/, '') + '/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ user_id, type, title, body }),
    });
  } catch (err) {
    console.warn('[notify] failed:', err.message);
  }
}

/* ═══════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
export default function PendingRequests() {
  const [activeTab, setActiveTab]     = useState('pending');
  const [requests, setRequests]       = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '',
    onConfirm: () => {}, danger: false, confirmText: 'Confirm',
  });
  const openConfirm  = (opts) => setConfirmModal({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmModal(m => ({ ...m, isOpen: false }));

  const [finePolicy, setFinePolicy] = useState({
    fine_amount: 5, fine_increment_value: 1, fine_increment_type: 'per_day',
  });
  const [borrowPolicy, setBorrowPolicy] = useState({
    borrow_duration_value: 7, borrow_duration_unit: 'days',
  });

  /* ── Data fetching ── */
  async function fetchPolicies() {
    const { data } = await localDbAdmin
      .from('site_content')
      .select('fine_per_day, fine_amount, fine_increment_value, fine_increment_type, borrow_duration_value, borrow_duration_unit')
      .limit(1).maybeSingle();
    if (data) {
      const amount = data.fine_amount ?? data.fine_per_day ?? 5;
      setFinePolicy({
        fine_amount: amount,
        fine_increment_value: Math.max(1, Number(data.fine_increment_value ?? 1)),
        fine_increment_type: data.fine_increment_type || 'per_day',
      });
      setBorrowPolicy({
        borrow_duration_value: data.borrow_duration_value ?? 7,
        borrow_duration_unit:  data.borrow_duration_unit  || 'days',
      });
    }
  }

  useEffect(() => {
    try {
      localStorage.removeItem('sm_approve_status');
      localStorage.removeItem('sm_decline_status');
    } catch {}
    fetchAll();
    const onVisible = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function fetchAll() {
    setLoading(true);
    await Promise.all([fetchPendingRequests(), fetchActiveLoans(), fetchPolicies()]);
    setLoading(false);
  }

  async function fetchPendingRequests() {
    const { data, error } = await localDbAdmin
      .from('transactions')
      .select(`id, created_at, status, user_id, book_id, due_date,
        users (name, student_id, lrn, grade_section, role),
        books (title, barcode, quantity)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) { console.error(error); showToast('Failed to load pending requests.', 'error'); }
    else setRequests(data || []);
  }

  async function fetchActiveLoans() {
    let { data, error } = await localDbAdmin
      .from('transactions')
      .select(`id, status, borrow_date, due_date, user_id, book_id,
        walk_in_name, walk_in_lrn, walk_in_grade_section, walk_in_contact, walk_in_employee_id, walk_in_position,
        users (name, student_id, lrn, grade_section, role),
        books (title, accession_num),
        book_copies (accession_id, copy_number)`)
      .in('status', ACTIVE_STATUSES)
      .order('borrow_date', { ascending: true });

    if (error && (error.code === '42P01' || error.code === 'PGRST200' || error.message?.includes('book_copies'))) {
      ({ data, error } = await localDbAdmin
        .from('transactions')
        .select(`id, status, borrow_date, due_date, user_id, book_id,
          walk_in_name, walk_in_lrn, walk_in_grade_section, walk_in_contact, walk_in_employee_id, walk_in_position,
          users (name, student_id, lrn, grade_section, role), books (title, accession_num)`)
        .in('status', ACTIVE_STATUSES)
        .order('borrow_date', { ascending: true }));
    }
    if (error) console.error(error);
    else setActiveLoans(data || []);
  }

  /* ── Patron helpers ── */
  const getLoanPatronName    = (l) => l.users?.name        || l.walk_in_name          || '—';
  const getLoanPatronId      = (l) => l.users?.lrn         || l.users?.student_id     || l.walk_in_lrn || l.walk_in_employee_id || null;
  const getLoanPatronSection = (l) => l.users?.grade_section || l.walk_in_grade_section || null;
  const getLoanPatronContact = (l) => l.walk_in_contact    || null;
  const isLoanWalkIn         = (l) => !l.users?.name && !!l.walk_in_name;

  /* ── Copy assignment ── */
  const assignAvailableCopy = async (bookId) => {
    const { data: copy, error } = await localDbAdmin
      .from('book_copies').select('id, accession_id, copy_number')
      .eq('book_id', bookId).eq('status', 'available')
      .order('copy_number', { ascending: true }).limit(1).maybeSingle();
    if (error) { if (error.code === '42P01') return null; throw new Error('Failed to find available copy: ' + error.message); }
    return copy || null;
  };

  /* ── Approve / Decline ── */
  const handleAction = async (req, isApprove) => {
    try {
      const { id: transactionId, book_id: bookId, books, user_id: userId } = req;
      const currentStock = books?.quantity ?? 0;
      const bookTitle    = books?.title || 'your book';

      if (isApprove) {
        if (currentStock <= 0) { showToast('No copies available to lend.', 'error'); return; }
        const defaultDurationMs = borrowPolicy.borrow_duration_unit === 'hours'
          ? borrowPolicy.borrow_duration_value * 3600000
          : borrowPolicy.borrow_duration_value * 86400000;
        const serverNow = await getServerNow();
        const dueDate = req.due_date
          ? new Date(req.due_date).toISOString()
          : new Date(serverNow.getTime() + defaultDurationMs).toISOString();
        const copy = await assignAvailableCopy(bookId);
        if (copy) {
          const { error: copyErr } = await localDbAdmin.from('book_copies').update({ status: 'borrowed' }).eq('id', copy.id);
          if (copyErr) throw copyErr;
        }
        const { error: txErr } = await localDbAdmin.from('transactions').update({
          status: 'borrowed', borrow_date: serverNow.toISOString(), due_date: dueDate,
          ...(copy ? { copy_id: copy.id } : {}),
        }).eq('id', transactionId);
        if (txErr) throw txErr;
        const { error: stockErr } = await localDbAdmin.from('books').update({ quantity: currentStock - 1 }).eq('id', bookId);
        if (stockErr) throw stockErr;
        const dueLabel = new Date(dueDate).toLocaleDateString();
        showToast(copy ? `Copy ${copy.accession_id} approved (due ${dueLabel}).` : `Request approved (due ${dueLabel}).`, 'success');
        notifyUser({ user_id: userId, type: 'borrow_approved', title: 'Your borrow request was approved', body: `"${bookTitle}" has been approved.\nReturn by: ${dueLabel}.` });
      } else {
        const { error } = await localDbAdmin.from('transactions').update({ status: 'declined' }).eq('id', transactionId);
        if (error) throw error;
        showToast('Request declined.', 'success');
        notifyUser({ user_id: userId, type: 'borrow_declined', title: 'Your borrow request was declined', body: `Your request for "${bookTitle}" was declined by the librarian.` });
      }
      fetchAll();
    } catch (error) { console.error('handleAction error:', error); showToast('Error: ' + error.message, 'error'); }
  };

  /* ── Fine computation ── */
  const computeOverdueUnits = (dueDate) => {
    if (!dueDate) return 0;
    const ms = Date.now() - new Date(dueDate).getTime();
    if (ms <= 0) return 0;
    return finePolicy.fine_increment_type === 'per_hour'
      ? Math.ceil(ms / 3600000)
      : Math.ceil(ms / 86400000);
  };
  const computeFine = (dueDate) => {
    const rawUnits  = computeOverdueUnits(dueDate);
    const incrValue = finePolicy.fine_increment_value || 1;
    return Math.floor(rawUnits / incrValue) * finePolicy.fine_amount;
  };
  const fineLabel = finePolicy.fine_increment_type === 'per_hour' ? 'hour' : 'day';

  /* ── Return ── */
  const handleReturn = async (loan) => {
    try {
      const overdueUnits = computeOverdueUnits(loan.due_date);
      const fineAmount   = computeFine(loan.due_date);
      const updates      = { status: 'returned', return_date: new Date().toISOString() };
      if (fineAmount > 0) updates.fine_amount = fineAmount;
      const { error: txErr } = await localDbAdmin.from('transactions').update(updates).eq('id', loan.id);
      if (txErr) throw txErr;
      if (loan.book_copies?.accession_id) {
        await localDbAdmin.from('book_copies').update({ status: 'available' }).eq('accession_id', loan.book_copies.accession_id);
      }
      const { data: bookRow } = await localDbAdmin.from('books').select('quantity').eq('id', loan.book_id).maybeSingle();
      if (bookRow) await localDbAdmin.from('books').update({ quantity: (bookRow.quantity ?? 0) + 1 }).eq('id', loan.book_id);
      showToast(fineAmount > 0 ? `Returned. Fine ₱${fineAmount.toFixed(2)} recorded.` : 'Book returned successfully.', 'success');
      notifyUser({
        user_id: loan.user_id,
        type: fineAmount > 0 ? 'return_with_fine' : 'returned',
        title: fineAmount > 0 ? 'Book returned — fine due' : 'Book returned',
        body: fineAmount > 0
          ? `Your return of "${loan.books?.title}" was recorded. Overdue ${overdueUnits} ${fineLabel}(s). Fine due: ₱${fineAmount.toFixed(2)}.`
          : `Your return of "${loan.books?.title}" was recorded. Thank you!`,
      });
      fetchAll();
    } catch (e) { console.error('handleReturn error:', e); showToast('Error: ' + e.message, 'error'); }
  };

  const isOverdue = (item) => item.due_date && new Date(item.due_date) < new Date();

  /* ── Derived counts ── */
  const pendingCount  = requests.length;
  const activeCount   = activeLoans.filter(l => !isOverdue(l)).length;
  const overdueCount  = activeLoans.filter(l =>  isOverdue(l)).length;

  /* ═══════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="pr-root" style={{ background: C.ivory, minHeight: '100vh', padding: '32px 28px 56px' }}>
      <style>{STYLES}</style>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />
      <ConfirmModal
        isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message}
        confirmText={confirmModal.confirmText} danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm} onCancel={closeConfirm}
      />

      {/* ── PAGE HEADER ── */}
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 28 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, flexShrink: 0 }}>
          <FaBook />
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: 'var(--maroon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            Book Requests & Active Loans
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.83rem', color: C.textSoft }}>
            Review pending requests and track all currently borrowed books.
          </p>
        </div>
      </header>

      {/* ── TABS (pill style — same as inv-tab) ── */}
      <div className="pr-tabs" style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        <TabPill
          active={activeTab === 'pending'}
          color="var(--maroon)" activeText="#fff"
          onClick={() => setActiveTab('pending')}
          icon={<FaClock style={{ fontSize: 12 }} />}
          label="Pending Requests"
          count={pendingCount}
          countColor={activeTab === 'pending' ? 'rgba(255,255,255,0.22)' : undefined}
        />
        <TabPill
          active={activeTab === 'active'}
          color="var(--green)" activeText="#fff"
          onClick={() => setActiveTab('active')}
          icon={<FaBook style={{ fontSize: 12 }} />}
          label="Active Loans"
          count={activeCount}
        />
        <TabPill
          active={activeTab === 'overdue'}
          color="#E11D48" activeText="#fff"
          onClick={() => setActiveTab('overdue')}
          icon={<FaExclamationTriangle style={{ fontSize: 12 }} />}
          label="Overdue Books"
          count={overdueCount}
        />
      </div>

      {/* ── TABLE CARD ── */}
      <div
        className="pr-table-wrap"
        style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(42,33,24,0.05)', overflowX: 'auto' }}
      >
        {loading ? (
          <BookLoader inline message="Loading" />
        ) : activeTab === 'pending' ? (
          <PendingPanel
            requests={requests}
            borrowPolicy={borrowPolicy}
            openConfirm={openConfirm}
            closeConfirm={closeConfirm}
            handleAction={handleAction}
          />
        ) : activeTab === 'active' ? (
          <ActivePanel
            loans={activeLoans.filter(l => !isOverdue(l))}
            openConfirm={openConfirm}
            closeConfirm={closeConfirm}
            handleReturn={handleReturn}
            getLoanPatronName={getLoanPatronName}
            getLoanPatronId={getLoanPatronId}
            getLoanPatronSection={getLoanPatronSection}
            getLoanPatronContact={getLoanPatronContact}
            isLoanWalkIn={isLoanWalkIn}
          />
        ) : (
          <OverduePanel
            loans={activeLoans.filter(l => isOverdue(l))}
            finePolicy={finePolicy}
            fineLabel={fineLabel}
            computeOverdueUnits={computeOverdueUnits}
            computeFine={computeFine}
            openConfirm={openConfirm}
            closeConfirm={closeConfirm}
            handleReturn={handleReturn}
            getLoanPatronName={getLoanPatronName}
            getLoanPatronId={getLoanPatronId}
            getLoanPatronSection={getLoanPatronSection}
            getLoanPatronContact={getLoanPatronContact}
            isLoanWalkIn={isLoanWalkIn}
          />
        )}
      </div>

      {/* ── MOBILE CARDS ── */}
      {!loading && (
        <div className="pr-mobile-cards" style={{ marginTop: 4 }}>
          {activeTab === 'pending' && (
            requests.length === 0
              ? <EmptyState icon={<FaCheckCircle />} message="All caught up!" sub="No pending book requests." />
              : requests.map(req => (
                <div key={req.id} className="pr-record-card">
                  <div className="pr-card-header">
                    <span className="pr-card-title">{req.books?.title || '—'}</span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: req.users?.role === 'teacher' ? '#FFF0F5' : '#EDFAF4',
                      color: req.users?.role === 'teacher' ? 'var(--maroon)' : '#137A4E', flexShrink: 0,
                    }}>
                      {req.users?.role || 'student'}
                    </span>
                  </div>
                  <div className="pr-card-fields">
                    <div>
                      <div className="pr-card-field-label">Patron</div>
                      <div className="pr-card-field-value">{req.users?.name || '—'}</div>
                      <div style={{ fontSize: '0.73rem', color: '#8C8070', marginTop: 1 }}>LRN: {req.users?.lrn || req.users?.student_id || 'N/A'}</div>
                      {req.users?.grade_section && <div style={{ fontSize: '0.72rem', color: '#B5A99A' }}>{req.users.grade_section}</div>}
                    </div>
                    <div>
                      <div className="pr-card-field-label">Availability</div>
                      <div className="pr-card-field-value" style={{ color: (req.books?.quantity ?? 0) > 0 ? '#137A4E' : '#B91C1C', fontWeight: 700 }}>
                        {req.books?.quantity ?? 0} {req.books?.quantity === 1 ? 'copy' : 'copies'} available
                      </div>
                    </div>
                    <div>
                      <div className="pr-card-field-label">Requested</div>
                      <div className="pr-card-field-value" style={{ color: '#6B5F52', fontWeight: 400 }}>
                        {new Date(req.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div>
                      <div className="pr-card-field-label">Loan Terms</div>
                      <div className="pr-card-field-value" style={{ color: '#B5A99A', fontWeight: 400 }}>
                        {req.due_date ? `Wants by: ${new Date(req.due_date).toLocaleDateString()}` : `Default: ${borrowPolicy.borrow_duration_value}-${borrowPolicy.borrow_duration_unit}`}
                      </div>
                    </div>
                  </div>
                  <div className="pr-card-footer">
                    <button
                      className="pr-action-btn pr-btn-approve"
                      disabled={(req.books?.quantity ?? 0) <= 0}
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => openConfirm({ title: 'Approve Request', message: `Approve "${req.books?.title || 'this book'}" for ${req.users?.name || 'this user'}?`, confirmText: 'Approve', danger: false, onConfirm: () => { closeConfirm(); handleAction(req, true); } })}
                    >
                      <FaCheck style={{ fontSize: 10 }} /> Approve
                    </button>
                    <button
                      className="pr-action-btn pr-btn-ghost-decline"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => openConfirm({ title: 'Decline Request', message: `Decline "${req.books?.title || 'this book'}" request from ${req.users?.name || 'this user'}?`, confirmText: 'Decline', danger: true, onConfirm: () => { closeConfirm(); handleAction(req, false); } })}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
          )}
          {activeTab === 'active' && (() => {
            const activeOnly = activeLoans.filter(l => !isOverdue(l));
            return activeOnly.length === 0
              ? <EmptyState icon={<FaInbox />} message="No active loans" sub="No books are currently checked out." />
              : activeOnly.map(loan => (
                <div key={loan.id} className="pr-record-card">
                  <div className="pr-card-header">
                    <span className="pr-card-title">{loan.books?.title || '—'}</span>
                    {isLoanWalkIn(loan) && <span style={{ fontSize: '0.65rem', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>Walk-in</span>}
                  </div>
                  <div className="pr-card-fields">
                    <div>
                      <div className="pr-card-field-label">Patron</div>
                      <div className="pr-card-field-value">{getLoanPatronName(loan)}</div>
                      {getLoanPatronId(loan) && <div style={{ fontSize: '0.73rem', color: '#8C8070' }}>LRN/ID: {getLoanPatronId(loan)}</div>}
                      {getLoanPatronSection(loan) && <div style={{ fontSize: '0.72rem', color: '#B5A99A' }}>{getLoanPatronSection(loan)}</div>}
                      {getLoanPatronContact(loan) && <div style={{ fontSize: '0.72rem', color: '#6B5F52' }}>📞 {getLoanPatronContact(loan)}</div>}
                    </div>
                    <div>
                      <div className="pr-card-field-label">Accession</div>
                      <div className="pr-card-field-value">
                        {loan.book_copies?.accession_id
                          ? <><code style={{ background: '#EEF2FF', color: '#4338CA', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{loan.book_copies.accession_id}</code><div style={{ fontSize: '0.7rem', color: '#B5A99A', marginTop: 2 }}>Copy #{loan.book_copies.copy_number}</div></>
                          : <code style={{ background: '#F1EDE3', color: '#8C8070', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontSize: '0.78rem' }}>{loan.books?.accession_num || '—'}</code>
                        }
                      </div>
                    </div>
                    <div>
                      <div className="pr-card-field-label">Borrowed</div>
                      <div className="pr-card-field-value" style={{ color: '#6B5F52', fontWeight: 400 }}>{loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}</div>
                    </div>
                    <div>
                      <div className="pr-card-field-label">Due Date</div>
                      <div className="pr-card-field-value" style={{ color: '#6B5F52', fontWeight: 400 }}>{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}</div>
                    </div>
                  </div>
                  <div className="pr-card-footer">
                    <button
                      className="pr-action-btn pr-btn-ghost-return"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => openConfirm({ title: 'Confirm Return', message: `Mark "${loan.books?.title || 'this book'}" as returned?`, confirmText: 'Return', danger: false, onConfirm: () => { closeConfirm(); handleReturn(loan); } })}
                    >
                      Return
                    </button>
                  </div>
                </div>
              ));
          })()}
          {activeTab === 'overdue' && (() => {
            const overdueOnly = activeLoans.filter(l => isOverdue(l));
            return overdueOnly.length === 0
              ? <EmptyState icon={<FaCheckCircle />} message="No overdue books" sub="Great news — all loans are on time." />
              : overdueOnly.map(loan => {
                const units = computeOverdueUnits(loan.due_date);
                const estFine = computeFine(loan.due_date).toFixed(2);
                return (
                  <div key={loan.id} className="pr-record-card overdue-card">
                    <div className="pr-card-header">
                      <span className="pr-card-title" style={{ color: '#E11D48' }}>{loan.books?.title || '—'}</span>
                      <span style={{ background: '#FDE8E8', color: '#DC2626', padding: '3px 10px', borderRadius: 20, fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>{units} {units === 1 ? fineLabel : fineLabel + 's'}</span>
                    </div>
                    <div className="pr-card-fields">
                      <div>
                        <div className="pr-card-field-label">Patron</div>
                        <div className="pr-card-field-value">{getLoanPatronName(loan)}</div>
                        {getLoanPatronId(loan) && <div style={{ fontSize: '0.73rem', color: '#8C8070' }}>LRN/ID: {getLoanPatronId(loan)}</div>}
                        {getLoanPatronSection(loan) && <div style={{ fontSize: '0.72rem', color: '#B5A99A' }}>{getLoanPatronSection(loan)}</div>}
                        {getLoanPatronContact(loan) && <div style={{ fontSize: '0.72rem', color: '#6B5F52' }}>📞 {getLoanPatronContact(loan)}</div>}
                      </div>
                      <div>
                        <div className="pr-card-field-label">Accession</div>
                        <div className="pr-card-field-value">
                          {loan.book_copies?.accession_id
                            ? <><code style={{ background: '#EEF2FF', color: '#4338CA', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{loan.book_copies.accession_id}</code><div style={{ fontSize: '0.7rem', color: '#B5A99A', marginTop: 2 }}>Copy #{loan.book_copies.copy_number}</div></>
                            : <code style={{ background: '#F1EDE3', color: '#8C8070', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontSize: '0.78rem' }}>{loan.books?.accession_num || '—'}</code>
                          }
                        </div>
                      </div>
                      <div>
                        <div className="pr-card-field-label">Borrowed</div>
                        <div className="pr-card-field-value" style={{ color: '#6B5F52', fontWeight: 400 }}>{loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}</div>
                      </div>
                      <div>
                        <div className="pr-card-field-label">Due Date</div>
                        <div className="pr-card-field-value" style={{ color: '#E11D48', fontWeight: 700 }}>{loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}</div>
                      </div>
                      <div>
                        <div className="pr-card-field-label">Estimated Fine</div>
                        <div className="pr-card-field-value" style={{ color: '#DC2626', fontWeight: 700, fontSize: '1rem' }}>₱{estFine}</div>
                      </div>
                    </div>
                    <div className="pr-card-footer">
                      <button
                        className="pr-action-btn pr-btn-return-fine"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => openConfirm({ title: 'Confirm Return + Fine', message: `Mark "${loan.books?.title || 'this book'}" as returned?\n\nFine of ₱${estFine} will be recorded automatically.`, confirmText: 'Return + Fine', danger: true, onConfirm: () => { closeConfirm(); handleReturn(loan); } })}
                      >
                        Return + Fine
                      </button>
                    </div>
                  </div>
                );
              });
          })()}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SUB-PANELS
════════════════════════════════════════ */

const PR_PAGE_SIZE = 10;

function PendingPanel({ requests, borrowPolicy, openConfirm, closeConfirm, handleAction }) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.ceil(requests.length / PR_PAGE_SIZE);
  const paged = requests.slice((page - 1) * PR_PAGE_SIZE, page * PR_PAGE_SIZE);
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<FaCheckCircle />}
        message="All caught up!"
        sub="There are no pending book requests at the moment."
      />
    );
  }
  return (
    <>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
      <thead>
        <tr style={{ background: '#F9F6EF', borderBottom: `1.5px solid #E8E2D7` }}>
          {['Date Requested', 'Patron Details', 'Book Details', 'Role / Terms', 'Actions'].map(h => (
            <Th key={h}>{h}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {paged.map((req, idx) => (
          <tr key={req.id} className="pr-tr" style={{ borderBottom: `1px solid #F1EDE3`, background: idx % 2 === 0 ? '#fff' : '#FDFCF9' }}>
            {/* Date */}
            <td style={td}>
              <span style={{ fontSize: '0.84rem', color: '#6B5F52' }}>
                {new Date(req.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </td>
            {/* Patron */}
            <td style={td}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#2A2118' }}>{req.users?.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#8C8070' }}>
                LRN: {req.users?.lrn || req.users?.student_id || 'N/A'}
              </p>
              {req.users?.grade_section && (
                <p style={{ margin: '1px 0 0', fontSize: '0.73rem', color: '#B5A99A' }}>{req.users.grade_section}</p>
              )}
            </td>
            {/* Book */}
            <td style={td}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#2A2118' }}>{req.books?.title}</p>
              <p style={{ margin: '3px 0 0', fontSize: '0.76rem', fontWeight: 700, color: (req.books?.quantity ?? 0) > 0 ? '#137A4E' : '#B91C1C' }}>
                {req.books?.quantity ?? 0} {req.books?.quantity === 1 ? 'copy' : 'copies'} available
              </p>
            </td>
            {/* Role / Terms */}
            <td style={td}>
              <span style={{
                display: 'inline-block',
                background: req.users?.role === 'teacher' ? '#FFF0F5' : '#EDFAF4',
                color:      req.users?.role === 'teacher' ? 'var(--maroon)' : '#137A4E',
                padding: '3px 10px', borderRadius: 20,
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.3px',
              }}>
                {req.users?.role || 'student'}
              </span>
              <p style={{ margin: '5px 0 0', fontSize: '0.74rem', color: '#B5A99A' }}>
                {req.due_date
                  ? `Wants by: ${new Date(req.due_date).toLocaleDateString()}`
                  : `Default: ${borrowPolicy.borrow_duration_value}-${borrowPolicy.borrow_duration_unit} loan`}
              </p>
            </td>
            {/* Actions */}
            <td style={td}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="pr-action-btn pr-btn-approve"
                  disabled={(req.books?.quantity ?? 0) <= 0}
                  onClick={() => openConfirm({
                    title: 'Approve Request',
                    message: `Approve "${req.books?.title || 'this book'}" for ${req.users?.name || 'this user'}?`,
                    confirmText: 'Approve', danger: false,
                    onConfirm: () => { closeConfirm(); handleAction(req, true); },
                  })}
                >
                  <FaCheck style={{ fontSize: 10 }} /> Approve & Assign
                </button>
                <button
                  className="pr-action-btn pr-btn-ghost-decline"
                  onClick={() => openConfirm({
                    title: 'Decline Request',
                    message: `Decline "${req.books?.title || 'this book'}" request from ${req.users?.name || 'this user'}?`,
                    confirmText: 'Decline', danger: true,
                    onConfirm: () => { closeConfirm(); handleAction(req, false); },
                  })}
                >
                  Decline
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <Pagination page={page} totalPages={totalPages} total={requests.length} pageSize={PR_PAGE_SIZE} onPage={p => setPage(p)} />
    </>
  );
}

function ActivePanel({ loans, openConfirm, closeConfirm, handleReturn, getLoanPatronName, getLoanPatronId, getLoanPatronSection, getLoanPatronContact, isLoanWalkIn }) {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.ceil(loans.length / PR_PAGE_SIZE);
  const paged = loans.slice((page - 1) * PR_PAGE_SIZE, page * PR_PAGE_SIZE);
  if (loans.length === 0) {
    return <EmptyState icon={<FaInbox />} message="No active loans" sub="No books are currently checked out within their due date." />;
  }
  return (
    <>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 840 }}>
      <thead>
        <tr style={{ background: '#F9F6EF', borderBottom: `1.5px solid #E8E2D7` }}>
          {['Patron', 'Book', 'Copy / Accession', 'Borrow Date', 'Due Date', 'Actions'].map(h => (
            <Th key={h}>{h}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {paged.map((loan, idx) => (
          <tr key={loan.id} className="pr-tr" style={{ borderBottom: `1px solid #F1EDE3`, background: idx % 2 === 0 ? '#fff' : '#FDFCF9' }}>
            <td style={td}>
              <PatronCell loan={loan} getLoanPatronName={getLoanPatronName} getLoanPatronId={getLoanPatronId} getLoanPatronSection={getLoanPatronSection} getLoanPatronContact={getLoanPatronContact} isLoanWalkIn={isLoanWalkIn} />
            </td>
            <td style={td}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#2A2118' }}>{loan.books?.title}</p>
            </td>
            <td style={td}>
              <AccessionCell loan={loan} />
            </td>
            <td style={{ ...td, fontSize: '0.84rem', color: '#6B5F52' }}>
              {loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}
            </td>
            <td style={{ ...td, fontSize: '0.84rem', color: '#6B5F52' }}>
              {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : <span style={{ color: '#C8BFAF' }}>—</span>}
            </td>
            <td style={td}>
              <button
                className="pr-action-btn pr-btn-ghost-return"
                onClick={() => openConfirm({
                  title: 'Confirm Return',
                  message: `Mark "${loan.books?.title || 'this book'}" as returned?`,
                  confirmText: 'Return', danger: false,
                  onConfirm: () => { closeConfirm(); handleReturn(loan); },
                })}
              >
                Return
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <Pagination page={page} totalPages={totalPages} total={loans.length} pageSize={PR_PAGE_SIZE} onPage={p => setPage(p)} />
    </>
  );
}

function OverduePanel({ loans, finePolicy, fineLabel, computeOverdueUnits, computeFine, openConfirm, closeConfirm, handleReturn, getLoanPatronName, getLoanPatronId, getLoanPatronSection, getLoanPatronContact, isLoanWalkIn }) {
  const [page, setPage] = React.useState(1);
  const [notifying, setNotifying] = React.useState(false);
  const [notifyResult, setNotifyResult] = React.useState(null);
  const totalPages = Math.ceil(loans.length / PR_PAGE_SIZE);
  const paged = loans.slice((page - 1) * PR_PAGE_SIZE, page * PR_PAGE_SIZE);

  async function handleSendReminders() {
    setNotifying(true);
    setNotifyResult(null);
    try {
      const session = JSON.parse(window.sessionStorage.getItem('shelfmaster-session') || 'null');
      const res = await fetch('/api/admin/overdue-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setNotifyResult({ ok: true, sent: data.sent, skipped: data.skipped });
    } catch (err) {
      setNotifyResult({ ok: false, error: err.message });
    } finally {
      setNotifying(false);
    }
  }

  if (loans.length === 0) {
    return <EmptyState icon={<FaGift />} message="No overdue books!" sub="All borrowed books are within their due dates." />;
  }
  return (
    <>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '12px 16px', borderBottom: '1px solid #FCC9D3', background: '#FFF8F8' }}>
      {notifyResult && (
        <span style={{
          fontSize: '0.78rem', fontWeight: 600, padding: '5px 11px', borderRadius: 8,
          background: notifyResult.ok ? '#f0fdf4' : '#fef2f2',
          color: notifyResult.ok ? '#15803d' : '#dc2626',
          border: `1px solid ${notifyResult.ok ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {notifyResult.ok
            ? notifyResult.sent === 0
              ? `All ${notifyResult.skipped} already notified.`
              : `Notified ${notifyResult.sent}${notifyResult.skipped > 0 ? `, ${notifyResult.skipped} already sent` : ''}.`
            : `Error: ${notifyResult.error}`}
        </span>
      )}
      <button
        onClick={handleSendReminders}
        disabled={notifying}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: notifying ? '#94a3b8' : 'var(--maroon)',
          color: 'white', border: 'none', padding: '8px 16px',
          borderRadius: 8, fontWeight: 700, fontSize: '0.82rem',
          cursor: notifying ? 'not-allowed' : 'pointer',
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
        }}
      >
        <FaBell style={{ fontSize: '0.8rem' }} />
        {notifying ? 'Sending…' : 'Send Overdue Reminders'}
      </button>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
      <thead>
        <tr style={{ background: '#FFF5F7', borderBottom: `1.5px solid #FCC9D3` }}>
          {[
            'Patron', 'Book', 'Copy / Accession', 'Borrow Date', 'Due Date',
            `${finePolicy.fine_increment_type === 'per_hour' ? 'Hours' : 'Days'} Overdue`,
            `Fine (₱${finePolicy.fine_amount}/${finePolicy.fine_increment_value} ${fineLabel})`,
            'Actions',
          ].map(h => (
            <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#C0143A', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {paged.map((loan, idx) => {
          const units   = computeOverdueUnits(loan.due_date);
          const estFine = computeFine(loan.due_date).toFixed(2);
          return (
            <tr key={loan.id} className="pr-tr overdue-row" style={{ borderBottom: `1px solid #FCC9D3`, background: idx % 2 === 0 ? '#FFF8F8' : '#FFF1F1' }}>
              <td style={td}>
                <PatronCell loan={loan} getLoanPatronName={getLoanPatronName} getLoanPatronId={getLoanPatronId} getLoanPatronSection={getLoanPatronSection} getLoanPatronContact={getLoanPatronContact} isLoanWalkIn={isLoanWalkIn} />
              </td>
              <td style={td}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#2A2118' }}>{loan.books?.title}</p>
              </td>
              <td style={td}>
                <AccessionCell loan={loan} />
              </td>
              <td style={{ ...td, fontSize: '0.84rem', color: '#6B5F52' }}>
                {loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}
              </td>
              <td style={{ ...td, fontSize: '0.84rem', fontWeight: 700, color: '#E11D48' }}>
                {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}
              </td>
              <td style={td}>
                <span style={{ display: 'inline-block', background: '#FDE8E8', color: '#DC2626', padding: '3px 11px', borderRadius: 20, fontWeight: 700, fontSize: '0.76rem' }}>
                  {units} {units === 1 ? fineLabel : fineLabel + 's'}
                </span>
              </td>
              <td style={{ ...td, fontWeight: 700, fontSize: '0.92rem', color: '#DC2626' }}>
                ₱{estFine}
              </td>
              <td style={td}>
                <button
                  className="pr-action-btn pr-btn-return-fine"
                  onClick={() => openConfirm({
                    title: 'Confirm Return + Fine',
                    message: `Mark "${loan.books?.title || 'this book'}" as returned?\n\nFine of ₱${estFine} will be recorded automatically.`,
                    confirmText: 'Return + Fine', danger: true,
                    onConfirm: () => { closeConfirm(); handleReturn(loan); },
                  })}
                >
                  Return + Fine
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <Pagination page={page} totalPages={totalPages} total={loans.length} pageSize={PR_PAGE_SIZE} onPage={p => setPage(p)} />
    </>
  );
}

/* ═══════════════════════════════════════
   SHARED MICRO-COMPONENTS
════════════════════════════════════════ */

/** Table header cell — uniform across all panels */
function Th({ children }) {
  return (
    <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}

function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  const btn = (disabled, label, onClick) => (
    <button onClick={onClick} disabled={disabled} style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #E8E2D7', background: disabled ? '#F9F7F2' : '#fff', color: disabled ? '#C8BFAF' : '#2A2118', cursor: disabled ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </button>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #F1EDE3', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: '0.78rem', color: '#8C8070' }}>
        Showing <strong style={{ color: '#2A2118' }}>{from}–{to}</strong> of <strong style={{ color: '#2A2118' }}>{total}</strong>
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        {btn(page <= 1, '‹ Prev', () => onPage(page - 1))}
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} style={{ padding: '5px 6px', fontSize: '0.8rem', color: '#8C8070' }}>…</span>
          : <button key={p} onClick={() => onPage(p)} style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${p === page ? 'var(--maroon)' : '#E8E2D7'}`, background: p === page ? 'var(--maroon)' : '#fff', color: p === page ? '#fff' : '#2A2118', cursor: 'pointer', fontSize: '0.8rem', fontWeight: p === page ? 700 : 500, fontFamily: "'DM Sans', sans-serif", minWidth: 34 }}>{p}</button>
        )}
        {btn(page >= totalPages, 'Next ›', () => onPage(page + 1))}
      </div>
    </div>
  );
}

/** Pill tab — identical props/structure to Inventory's TabPill */
function TabPill({ active, color, activeText, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className="pr-tab"
      style={{
        background: active ? color : '#fff',
        color:      active ? activeText : '#8C8070',
        border:     `1.5px solid ${active ? color : '#E8E2D7'}`,
        boxShadow:  active ? `0 4px 16px ${color}33` : 'none',
      }}
    >
      {icon}
      {label}
      {count > 0 && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.22)' : '#F1EDE3',
          color:      active ? activeText : '#8C8070',
          borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700,
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

/** Patron info cell — shared between Active and Overdue panels */
function PatronCell({ loan, getLoanPatronName, getLoanPatronId, getLoanPatronSection, getLoanPatronContact, isLoanWalkIn }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#2A2118' }}>
          {getLoanPatronName(loan)}
        </p>
        {isLoanWalkIn(loan) && (
          <span style={{ fontSize: '0.65rem', background: '#FEF3C7', color: '#92400E', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
            Walk-in
          </span>
        )}
      </div>
      {getLoanPatronId(loan) && (
        <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: '#8C8070' }}>LRN/ID: {getLoanPatronId(loan)}</p>
      )}
      {getLoanPatronSection(loan) && (
        <p style={{ margin: '1px 0 0', fontSize: '0.73rem', color: '#B5A99A' }}>{getLoanPatronSection(loan)}</p>
      )}
      {getLoanPatronContact(loan) && (
        <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#6B5F52' }}>📞 {getLoanPatronContact(loan)}</p>
      )}
    </>
  );
}

/** Accession code badge — shared between Active and Overdue panels */
function AccessionCell({ loan }) {
  if (loan.book_copies?.accession_id) {
    return (
      <div>
        <code style={{ background: '#EEF2FF', color: '#4338CA', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.79rem' }}>
          {loan.book_copies.accession_id}
        </code>
        <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#B5A99A' }}>Copy #{loan.book_copies.copy_number}</p>
      </div>
    );
  }
  return (
    <code style={{ background: '#F1EDE3', color: '#8C8070', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.79rem' }}>
      {loan.books?.accession_num || '—'}
    </code>
  );
}

/** Empty / loading state — identical to Inventory's EmptyState */
function EmptyState({ icon, message, sub, loading }) {
  return (
    <div style={{ padding: '52px 20px', textAlign: 'center', color: '#B5A99A' }}>
      {loading ? (
        <p style={{ margin: 0, color: '#8C8070', fontStyle: 'italic', fontSize: '0.9rem' }}>Loading…</p>
      ) : (
        <>
          <div style={{ fontSize: '2.5rem', marginBottom: 10, opacity: 0.3 }}>{icon}</div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#8C8070' }}>{message}</p>
          {sub && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#B5A99A' }}>{sub}</p>}
        </>
      )}
    </div>
  );
}

/* Shared table cell padding */
const td = { padding: '14px 16px', verticalAlign: 'middle' };