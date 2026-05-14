import React, { useState, useEffect } from 'react';
import { localDbAdmin } from './localDbAdmin';
import { getBaseURL } from './connectionManager';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import BookLoader from './BookLoader';
import {
  FaBook, FaChalkboardTeacher, FaGraduationCap,
  FaSearch, FaArchive, FaRedo, FaTrash, FaUserAlt,
  FaChevronDown, FaChevronUp,
} from 'react-icons/fa';

/* ─────────────────────────────────────────
   GLOBAL STYLES  (mirrors Inventory.jsx)
───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .um2-root { font-family: 'DM Sans', sans-serif; }
  .um2-root *, .um2-root *::before, .um2-root *::after { box-sizing: border-box; }

  /* Tab pills — identical to inv-tab */
  .um2-tab {
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
  .um2-tab:active { transform: scale(0.97); }

  /* Table rows */
  .um2-tr { transition: background 0.12s ease; cursor: default; }
  .um2-tr:hover { background: #FAF7F2 !important; }
  .um2-tr.open   { background: #F5FBF5 !important; }
  .um2-tr.archived { opacity: 0.78; }

  /* Action buttons — mirrors inv-action-btn */
  .um2-action-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 7px;
    font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    border: 1.5px solid transparent;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .um2-action-btn:hover  { transform: translateY(-1px); }
  .um2-action-btn:active { transform: scale(0.97); }

  /* Ghost archive — mirrors inv-btn-ghost-archive */
  .um2-btn-ghost-archive {
    background: #FFF1F3; color: #C0143A; border-color: #FCC9D3;
  }
  .um2-btn-ghost-archive:hover { background: #FFE4E8; border-color: #F8A5B4; }

  /* Ghost restore — mirrors inv-btn-ghost-restore */
  .um2-btn-ghost-restore {
    background: #EDFAF4; color: #137A4E; border-color: #A8EDD1;
  }
  .um2-btn-ghost-restore:hover { background: #D8F5E9; border-color: #72D4AE; }

  /* Ghost delete — mirrors inv-btn-ghost-delete */
  .um2-btn-ghost-delete {
    background: #FFF1F1; color: #B91C1C; border-color: #FECACA;
  }
  .um2-btn-ghost-delete:hover { background: #FFE2E2; border-color: #FCA5A5; }

  /* Ghost expand — mirrors inv-btn-ghost-expand */
  .um2-btn-ghost-expand {
    background: #F4F1EC; color: #4A3F32; border-color: #DDD7CC;
  }
  .um2-btn-ghost-expand:hover  { background: #EAE5DC; }
  .um2-btn-ghost-expand.active { background: #2A2118; color: #F9F7F2; border-color: #2A2118; }

  /* Search input */
  .um2-input {
    width: 100%; padding: 10px 14px;
    border: 1.5px solid #DDD7CC; border-radius: 9px;
    font-size: 0.88rem; font-family: 'DM Sans', sans-serif;
    color: #2A2118; background: white; outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .um2-input:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(128,0,0,0.08);
  }
  .um2-input::placeholder { color: #B5A99A; }

  /* Loan drawer slide-in */
  @keyframes um2-expandin {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .um2-expand-panel { animation: um2-expandin 0.25s ease both; }

  /* Status badge */
  .um2-status {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 11px; border-radius: 20px;
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
  }
  .um2-status .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .um2-status.active   { background: #EDFAF4; color: #137A4E; }
  .um2-status.active   .dot { background: #137A4E; }
  .um2-status.archived { background: #F1EDE3; color: #8C8070; }
  .um2-status.archived .dot { background: #C8BFAF; }

  /* Loan copy status badge — mirrors inv-status */
  .um2-loan-badge {
    display: inline-block; padding: 3px 11px;
    border-radius: 20px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px;
  }
  .um2-loan-badge.onloan  { background: #EDFAF4; color: #137A4E; }
  .um2-loan-badge.overdue { background: #FFF1F1; color: #B91C1C; }

  @media (max-width: 768px) {
    .um2-header-actions { flex-wrap: wrap; }
    .um2-tabs { flex-wrap: wrap; gap: 8px !important; }
    .um2-table-wrap { overflow-x: auto; }
  }

  /* ── Table data cells wrap text vertically, not horizontally ── */
  td { overflow-wrap: break-word; word-break: break-word; }

  /* ══════════════════════════════════════
     MOBILE CARD LAYOUT (UserManagement)
  ══════════════════════════════════════ */
  .um2-mobile-cards { display: none; }

  @media (max-width: 640px) {
    .um2-table-wrap { display: none !important; }
    .um2-mobile-cards { display: block; }
  }

  .um2-record-card {
    background: #fff;
    border: 1px solid #E8E2D7;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 10px;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .um2-record-card.archived-card { opacity: 0.78; }

  .um2-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 8px;
    min-width: 0;
  }

  .um2-card-title {
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

  .um2-card-field-label {
    font-size: 0.63rem;
    font-weight: 700;
    color: #8C8070;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .um2-card-field-value {
    font-size: 0.82rem;
    color: #2A2118;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .um2-card-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .um2-card-footer {
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

/* ═══════════════════════════════════════
   COMPONENT
════════════════════════════════════════ */
export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState('student');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '',
    onConfirm: () => {}, danger: false, confirmText: 'Confirm',
  });
  const openConfirm  = (opts) => setConfirmModal({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmModal(m => ({ ...m, isOpen: false }));

  const [selectedUser, setSelectedUser] = useState(null);
  const [userLoans, setUserLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);

  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);

  useEffect(() => { fetchUsers(); }, [activeTab]);
  useEffect(() => { setPage(1); }, [activeTab, showArchived, searchQuery]);

  /* ── Data ── */
  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await localDbAdmin
      .from('users')
      .select('*, auth_id, transactions (id, status)')
      .eq('role', activeTab)
      .order('name', { ascending: true });
    if (error) console.error(`Error fetching ${activeTab}s:`, error);
    else setUsers(data || []);
    setLoading(false);
  }

  function getAuthHeaders() {
    let token = '';
    try {
      const raw = sessionStorage.getItem('shelfmaster-session');
      if (raw) token = JSON.parse(raw)?.access_token || '';
    } catch {}
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /* ── Actions ── */
  async function handleArchive(user) {
    openConfirm({
      title: 'Archive User',
      message: `Archive ${user.name}? They will no longer appear in the active list and cannot log in.`,
      confirmText: 'Archive', danger: false,
      onConfirm: async () => { closeConfirm(); await _doArchive(user); },
    });
  }
  async function _doArchive(user) {
    try {
      const res = await fetch(`${getBaseURL()}/api/users/${user.id}/archive`, {
        method: 'POST', headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Archive failed');
      showToast(`${user.name} archived.`);
      await fetchUsers();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }

  async function handleUnarchive(user) {
    openConfirm({
      title: 'Restore User',
      message: `Restore ${user.name}? They will be moved back to the active list and can log in again.`,
      confirmText: 'Restore', danger: false,
      onConfirm: async () => { closeConfirm(); await _doUnarchive(user); },
    });
  }
  async function _doUnarchive(user) {
    try {
      const res = await fetch(`${getBaseURL()}/api/users/${user.id}/unarchive`, {
        method: 'POST', headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Restore failed');
      showToast(`${user.name} restored.`);
      await fetchUsers();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }

  async function handleDelete(user) {
    if (!user.archived_at) {
      showToast(`Archive this ${activeTab} first before deleting.`, 'error');
      return;
    }
    openConfirm({
      title: 'Permanently Delete User',
      message: `Permanently delete ${user.name}?\n\nThis cannot be undone.`,
      confirmText: 'Delete', danger: true,
      onConfirm: async () => { closeConfirm(); await _doDelete(user); },
    });
  }
  async function _doDelete(user) {
    try {
      const res = await fetch(`${getBaseURL()}/api/users/${user.id}`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Delete failed');
      showToast(`${user.name} permanently deleted.`);
      if (selectedUser?.id === user.id) setSelectedUser(null);
      await fetchUsers();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }

  async function toggleLoans(user) {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null); setUserLoans([]); return;
    }
    setSelectedUser(user); setLoansLoading(true); setUserLoans([]);

    let { data, error } = await localDbAdmin
      .from('transactions')
      .select(`id, status, borrow_date, due_date,
        books (title, accession_num, authors),
        book_copies (accession_id, copy_number)`)
      .eq('user_id', user.id)
      .eq('status', 'borrowed')
      .order('borrow_date', { ascending: false });

    if (error && (error.code === 'PGRST200' || (error.message || '').includes('book_copies'))) {
      ({ data, error } = await localDbAdmin
        .from('transactions')
        .select('id, status, borrow_date, due_date, books (title, accession_num, authors)')
        .eq('user_id', user.id)
        .eq('status', 'borrowed')
        .order('borrow_date', { ascending: false }));
    }
    if (!error) setUserLoans(data || []);
    setLoansLoading(false);
  }

  /* ── Filtering ── */
  const filteredUsers = users
    .filter(u => showArchived ? !!u.archived_at : !u.archived_at)
    .filter(u => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.student_id?.toLowerCase().includes(q) ||
        u.lrn?.toLowerCase().includes(q) ||
        u.grade_section?.toLowerCase().includes(q) ||
        u.course_year?.toLowerCase().includes(q)
      );
    });

  const isOverdue  = (d) => d && new Date(d) < new Date();
  const isTeacher  = activeTab === 'teacher';
  const totalUsers = users.filter(u => showArchived ? !!u.archived_at : !u.archived_at).length;
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ══════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="um2-root" style={{ background: C.ivory, minHeight: '100vh', padding: '32px 28px 56px' }}>
      <style>{STYLES}</style>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
      />

      {/* ── PAGE HEADER ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {/* Icon badge — same pattern as Inventory */}
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, flexShrink: 0 }}>
            <FaUserAlt />
          </div>
          <div>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: 'var(--maroon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              User Management
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.83rem', color: C.textSoft }}>
              Search, archive, restore, or permanently delete user accounts.
            </p>
          </div>
        </div>

        {/* Header action — show/hide archived toggle */}
        <div className="um2-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => { setShowArchived(s => !s); setSelectedUser(null); setUserLoans([]); setSearchQuery(''); }}
            className="um2-action-btn"
            style={{
              background: showArchived ? '#FFF5E6' : '#fff',
              color:      showArchived ? '#C07A10' : C.muted,
              border:     `1.5px solid ${showArchived ? '#F5C340' : C.border}`,
            }}
          >
            <FaArchive style={{ fontSize: 11 }} />
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </button>
        </div>
      </header>

      {/* ── ROLE TABS (pill style — same as inv-tab) ── */}
      <div className="um2-tabs" style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        <TabPill
          active={activeTab === 'student' && !showArchived}
          color="var(--maroon)" activeText="#fff"
          onClick={() => { setActiveTab('student'); setShowArchived(false); setSelectedUser(null); setUserLoans([]); setSearchQuery(''); }}
          icon={<FaGraduationCap style={{ fontSize: 13 }} />}
          label="Students"
          count={activeTab === 'student' ? users.filter(u => !u.archived_at).length : null}
        />
        <TabPill
          active={activeTab === 'teacher' && !showArchived}
          color="#1D4ED8" activeText="#fff"
          onClick={() => { setActiveTab('teacher'); setShowArchived(false); setSelectedUser(null); setUserLoans([]); setSearchQuery(''); }}
          icon={<FaChalkboardTeacher style={{ fontSize: 14 }} />}
          label="Teachers"
          count={activeTab === 'teacher' ? users.filter(u => !u.archived_at).length : null}
        />
        <TabPill
          active={showArchived}
          color="#C0143A" activeText="#fff"
          onClick={() => { setShowArchived(true); setSelectedUser(null); setUserLoans([]); setSearchQuery(''); }}
          icon={<FaArchive style={{ fontSize: 12 }} />}
          label="Archived"
          count={users.filter(u => !!u.archived_at).length}
        />
      </div>

      {/* ── TABLE CARD ── */}
      {loading ? (
        <BookLoader inline message={`Loading ${activeTab} directory`} />
      ) : (
        <div
          className="um2-table-wrap"
          style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(42,33,24,0.05)' }}
        >
          {/* ── Search bar — same anatomy as Inventory ── */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.ivoryDk}`, display: 'flex', alignItems: 'center', gap: 10, background: '#FDFCF9' }}>
            <FaSearch style={{ color: C.muted, fontSize: 14, flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={
                showArchived
                  ? `Search archived ${activeTab}s by name or ID…`
                  : isTeacher
                    ? 'Search by name, Employee ID, or position…'
                    : 'Search by name, LRN, or grade & section…'
              }
              className="um2-input"
              style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.88rem', flex: 1, boxShadow: 'none' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="um2-action-btn"
                style={{ background: '#F4F1EC', color: C.textSoft, border: `1.5px solid ${C.border}`, padding: '4px 11px', fontSize: '0.75rem' }}
              >
                Clear
              </button>
            )}
            <span style={{ fontSize: '0.75rem', color: C.muted, whiteSpace: 'nowrap', borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
              {filteredUsers.length} of {totalUsers}
            </span>
          </div>

          {/* ── Table ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: showArchived ? 600 : (isTeacher ? 920 : 840) }}>
            <thead>
              <tr style={{ background: '#F9F6EF', borderBottom: `1.5px solid ${C.border}` }}>
                {(showArchived
                  ? ['Name', 'ID / LRN', 'Role', 'Archived On', 'Actions']
                  : isTeacher
                    ? ['Teacher Name', 'Employee ID', 'Position / Designation', 'Track / Strand', 'Contact', 'Status', 'Actions']
                    : ['Student Name', 'LRN / Student ID', 'Grade & Section', 'Books Held', 'Status', 'Actions']
                ).map(h => (
                  <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={showArchived ? 5 : isTeacher ? 7 : 6}>
                    <EmptyState
                      icon={<FaUserAlt />}
                      message={
                        showArchived
                          ? `No archived ${activeTab}s found.`
                          : users.length === 0
                            ? `No ${activeTab}s registered yet.`
                            : `No ${activeTab}s match "${searchQuery}".`
                      }
                      sub={
                        showArchived
                          ? `${isTeacher ? 'Teachers' : 'Students'} you archive will appear here.`
                          : users.length === 0 ? undefined : 'Try a different search term.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                pagedUsers.map((user, idx) => {
                  const activeLoans = user.transactions?.filter(t => t.status === 'borrowed').length || 0;
                  const isOpen      = selectedUser?.id === user.id;
                  const rowBg       = idx % 2 === 0 ? '#fff' : '#FDFCF9';

                  /* ────────────────────────────────
                     ARCHIVED ROW
                  ──────────────────────────────── */
                  if (showArchived) {
                    return (
                      <tr key={user.id} className="um2-tr" style={{ borderBottom: `1px solid ${C.ivoryDk}`, background: rowBg }}>
                        <td style={{ padding: '14px 16px' }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: C.text }}>{user.name}</p>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          {user.lrn || user.student_id
                            ? <code style={{ background: C.ivoryDk, color: C.textSoft, padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.79rem' }}>
                                {user.lrn || user.student_id}
                              </code>
                            : <span style={{ color: '#C8BFAF' }}>—</span>}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: C.textSoft }}>
                            {user.role === 'teacher'
                              ? <><FaChalkboardTeacher style={{ fontSize: 12 }} /> Teacher</>
                              : <><FaGraduationCap    style={{ fontSize: 12 }} /> Student</>}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.83rem', color: C.muted }}>
                          {user.archived_at
                            ? new Date(user.archived_at).toLocaleDateString('en-US', { dateStyle: 'medium' })
                            : '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleUnarchive(user)} className="um2-action-btn um2-btn-ghost-restore">
                              <FaRedo  style={{ fontSize: 10 }} /> Restore
                            </button>
                            <button onClick={() => handleDelete(user)} className="um2-action-btn um2-btn-ghost-delete">
                              <FaTrash style={{ fontSize: 10 }} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  /* ────────────────────────────────
                     ACTIVE STUDENT ROW
                  ──────────────────────────────── */
                  if (!isTeacher) {
                    return (
                      <React.Fragment key={user.id}>
                        <tr
                          className={`um2-tr${isOpen ? ' open' : ''}`}
                          style={{ borderBottom: isOpen ? `1px dashed ${C.border}` : `1px solid ${C.ivoryDk}`, background: rowBg }}
                        >
                          {/* Name */}
                          <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: C.text }}>
                              {user.name}
                            </p>
                          </td>
                          {/* LRN */}
                          <td style={{ padding: '14px 16px' }}>
                            {user.lrn || user.student_id
                              ? <code style={{ background: '#FFF0E8', color: 'var(--maroon)', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.79rem' }}>
                                  {user.lrn || user.student_id}
                                </code>
                              : <span style={{ color: '#C8BFAF' }}>—</span>}
                          </td>
                          {/* Grade & section */}
                          <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: C.textSoft }}>
                            {user.grade_section || user.course_year || <span style={{ color: '#C8BFAF' }}>—</span>}
                          </td>
                          {/* Books held — expand trigger */}
                          <td style={{ padding: '14px 16px' }}>
                            <button
                              onClick={() => toggleLoans(user)}
                              disabled={activeLoans === 0}
                              className={`um2-action-btn um2-btn-ghost-expand${isOpen ? ' active' : ''}`}
                              style={{ padding: '5px 13px', fontSize: '0.77rem', cursor: activeLoans === 0 ? 'default' : 'pointer', opacity: activeLoans === 0 ? 0.55 : 1 }}
                              title={activeLoans > 0 ? `View ${activeLoans} borrowed book${activeLoans > 1 ? 's' : ''}` : 'No active loans'}
                            >
                              <FaBook style={{ fontSize: 10 }} />
                              {activeLoans} {activeLoans === 1 ? 'Book' : 'Books'}
                              {activeLoans > 0 && (
                                isOpen
                                  ? <FaChevronUp   style={{ fontSize: 9 }} />
                                  : <FaChevronDown style={{ fontSize: 9 }} />
                              )}
                            </button>
                          </td>
                          {/* Status */}
                          <td style={{ padding: '14px 16px' }}>
                            <span className="um2-status active">
                              <span className="dot" />
                              {user.status || 'Active'}
                            </span>
                          </td>
                          {/* Actions */}
                          <td style={{ padding: '14px 16px' }}>
                            <button onClick={() => handleArchive(user)} className="um2-action-btn um2-btn-ghost-archive">
                              <FaArchive style={{ fontSize: 10 }} /> Archive
                            </button>
                          </td>
                        </tr>

                        {/* ── LOAN DRAWER — same expand-panel pattern as Inventory copies ── */}
                        {isOpen && (
                          <tr>
                            <td colSpan="6" style={{ padding: 0, borderBottom: `1px solid ${C.ivoryDk}`, background: '#F9F7F2' }}>
                              <div className="um2-expand-panel" style={{ padding: '20px 24px' }}>

                                {/* Drawer header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                  <div>
                                    <h4 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 600, color: C.text }}>
                                      Currently Borrowed
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.muted }}>{user.name}</p>
                                  </div>
                                  <button
                                    onClick={() => toggleLoans(user)}
                                    className="um2-action-btn"
                                    style={{ background: '#F4F1EC', color: C.textSoft, border: `1.5px solid ${C.border}`, fontSize: '0.77rem' }}
                                  >
                                    <FaChevronUp style={{ fontSize: 9 }} /> Collapse
                                  </button>
                                </div>

                                {loansLoading ? (
                                  <p style={{ color: C.muted, fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Loading loans…</p>
                                ) : userLoans.length === 0 ? (
                                  <p style={{ color: C.muted, fontSize: '0.83rem', fontStyle: 'italic', margin: 0 }}>No active loans found.</p>
                                ) : (
                                  /* Sub-table — same as Inventory copies table */
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: `1.5px solid ${C.border}` }}>
                                        {['#', 'Book Title', 'Accession / Copy', 'Borrowed On', 'Due Date', 'Status'].map(h => (
                                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {userLoans.map((loan, i) => {
                                        const overdue = isOverdue(loan.due_date);
                                        return (
                                          <tr key={loan.id} className="um2-tr" style={{ borderBottom: `1px solid ${C.ivoryDk}`, background: overdue ? '#FFF8F8' : 'transparent' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 700, color: C.muted, width: 36 }}>{i + 1}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: '0.88rem' }}>{loan.books?.title}</p>
                                              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: C.muted }}>{loan.books?.authors}</p>
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                              {loan.book_copies?.accession_id ? (
                                                <code style={{ background: '#EEF2FF', color: '#4338CA', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.79rem' }}>
                                                  {loan.book_copies.accession_id}
                                                  <span style={{ color: '#B0B8E0', marginLeft: 3 }}>#{loan.book_copies.copy_number}</span>
                                                </code>
                                              ) : (
                                                <code style={{ background: C.ivoryDk, color: C.muted, padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontSize: '0.79rem' }}>
                                                  {loan.books?.accession_num || '—'}
                                                </code>
                                              )}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: C.muted, fontSize: '0.83rem' }}>
                                              {loan.borrow_date
                                                ? new Date(loan.borrow_date).toLocaleDateString('en-US', { dateStyle: 'medium' })
                                                : '—'}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontSize: '0.83rem', fontWeight: overdue ? 700 : 400, color: overdue ? '#B91C1C' : C.muted }}>
                                              {loan.due_date
                                                ? new Date(loan.due_date).toLocaleDateString('en-US', { dateStyle: 'medium' })
                                                : '—'}
                                            </td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span className={`um2-loan-badge ${overdue ? 'overdue' : 'onloan'}`}>
                                                {overdue ? 'Overdue' : 'On Loan'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }

                  /* ────────────────────────────────
                     ACTIVE TEACHER ROW
                  ──────────────────────────────── */
                  return (
                    <tr key={user.id} className="um2-tr" style={{ borderBottom: `1px solid ${C.ivoryDk}`, background: rowBg }}>
                      <td style={{ padding: '14px 16px', maxWidth: 200 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: C.text }}>
                          {user.name}
                        </p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {user.student_id
                          ? <code style={{ background: '#FFF0E8', color: 'var(--maroon)', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.79rem' }}>
                              {user.student_id}
                            </code>
                          : <span style={{ color: '#C8BFAF' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: C.textSoft }}>
                        {user.course_year || <span style={{ color: '#C8BFAF' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: C.textSoft }}>
                        {user.grade_section || <span style={{ color: '#C8BFAF' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: C.textSoft }}>
                        {user.lrn || <span style={{ color: '#C8BFAF' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className="um2-status active">
                          <span className="dot" />
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <button onClick={() => handleArchive(user)} className="um2-action-btn um2-btn-ghost-archive">
                          <FaArchive style={{ fontSize: 10 }} /> Archive
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={filteredUsers.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} />
        </div>
      )}

      {/* ── MOBILE CARDS ── */}
      {!loading && (
        <div className="um2-mobile-cards" style={{ marginTop: 4 }}>
          {/* Mobile search bar */}
          <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.border}`, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <FaSearch style={{ color: C.muted, fontSize: 14, flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isTeacher ? 'Search teachers…' : showArchived ? 'Search archived…' : 'Search students…'}
              className="um2-input"
              style={{ border: 'none', background: 'transparent', padding: '2px 0', fontSize: '0.88rem', flex: 1, boxShadow: 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="um2-action-btn" style={{ background: '#F4F1EC', color: C.textSoft, border: `1.5px solid ${C.border}`, padding: '4px 10px', fontSize: '0.75rem' }}>Clear</button>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState icon={<FaUserAlt />} message={users.length === 0 ? `No ${activeTab}s registered yet.` : `No matches found.`} />
          ) : pagedUsers.map(user => {
            const activeLoansCount = user.transactions?.filter(t => t.status === 'borrowed').length || 0;

            if (showArchived) {
              return (
                <div key={user.id} className="um2-record-card archived-card">
                  <div className="um2-card-header">
                    <span className="um2-card-title">{user.name}</span>
                    <span style={{ fontSize: '0.72rem', background: '#F1EDE3', color: C.muted, padding: '2px 8px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>
                      {user.role === 'teacher' ? 'Teacher' : 'Student'}
                    </span>
                  </div>
                  <div className="um2-card-fields">
                    <div>
                      <div className="um2-card-field-label">ID / LRN</div>
                      <div className="um2-card-field-value">
                        {user.lrn || user.student_id
                          ? <code style={{ background: C.ivoryDk, color: C.textSoft, padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontWeight: 600, fontSize: '0.78rem' }}>{user.lrn || user.student_id}</code>
                          : <span style={{ color: '#C8BFAF' }}>—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="um2-card-field-label">Archived On</div>
                      <div className="um2-card-field-value" style={{ color: C.muted, fontWeight: 400 }}>
                        {user.archived_at ? new Date(user.archived_at).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—'}
                      </div>
                    </div>
                  </div>
                  <div className="um2-card-footer">
                    <button onClick={() => handleUnarchive(user)} className="um2-action-btn um2-btn-ghost-restore" style={{ flex: 1, justifyContent: 'center' }}>
                      <FaRedo style={{ fontSize: 10 }} /> Restore
                    </button>
                    <button onClick={() => handleDelete(user)} className="um2-action-btn um2-btn-ghost-delete" style={{ flex: 1, justifyContent: 'center' }}>
                      <FaTrash style={{ fontSize: 10 }} /> Delete
                    </button>
                  </div>
                </div>
              );
            }

            if (!isTeacher) {
              return (
                <div key={user.id} className="um2-record-card">
                  <div className="um2-card-header">
                    <span className="um2-card-title">{user.name}</span>
                    <span className="um2-status active" style={{ flexShrink: 0 }}>
                      <span className="dot" />{user.status || 'Active'}
                    </span>
                  </div>
                  <div className="um2-card-fields">
                    <div>
                      <div className="um2-card-field-label">LRN / Student ID</div>
                      <div className="um2-card-field-value">
                        {user.lrn || user.student_id
                          ? <code style={{ background: '#FFF0E8', color: 'var(--maroon)', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{user.lrn || user.student_id}</code>
                          : <span style={{ color: '#C8BFAF' }}>—</span>}
                      </div>
                    </div>
                    <div>
                      <div className="um2-card-field-label">Grade & Section</div>
                      <div className="um2-card-field-value" style={{ color: C.textSoft, fontWeight: 400 }}>{user.grade_section || user.course_year || '—'}</div>
                    </div>
                    <div>
                      <div className="um2-card-field-label">Books Held</div>
                      <div className="um2-card-field-value">
                        <span style={{ fontWeight: 700, color: activeLoansCount > 0 ? 'var(--maroon)' : C.muted }}>
                          {activeLoansCount} {activeLoansCount === 1 ? 'book' : 'books'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="um2-card-footer">
                    <button onClick={() => handleArchive(user)} className="um2-action-btn um2-btn-ghost-archive" style={{ flex: 1, justifyContent: 'center' }}>
                      <FaArchive style={{ fontSize: 10 }} /> Archive
                    </button>
                  </div>
                </div>
              );
            }

            // Teacher
            return (
              <div key={user.id} className="um2-record-card">
                <div className="um2-card-header">
                  <span className="um2-card-title">{user.name}</span>
                  <span className="um2-status active" style={{ flexShrink: 0 }}>
                    <span className="dot" />{user.status || 'Active'}
                  </span>
                </div>
                <div className="um2-card-fields">
                  <div>
                    <div className="um2-card-field-label">Employee ID</div>
                    <div className="um2-card-field-value">
                      {user.student_id
                        ? <code style={{ background: '#FFF0E8', color: 'var(--maroon)', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{user.student_id}</code>
                        : <span style={{ color: '#C8BFAF' }}>—</span>}
                    </div>
                  </div>
                  <div>
                    <div className="um2-card-field-label">Position / Designation</div>
                    <div className="um2-card-field-value" style={{ color: C.textSoft, fontWeight: 400 }}>{user.course_year || '—'}</div>
                  </div>
                  <div>
                    <div className="um2-card-field-label">Track / Strand</div>
                    <div className="um2-card-field-value" style={{ color: C.textSoft, fontWeight: 400 }}>{user.grade_section || '—'}</div>
                  </div>
                  <div>
                    <div className="um2-card-field-label">Contact</div>
                    <div className="um2-card-field-value" style={{ color: C.textSoft, fontWeight: 400 }}>{user.lrn || '—'}</div>
                  </div>
                </div>
                <div className="um2-card-footer">
                  <button onClick={() => handleArchive(user)} className="um2-action-btn um2-btn-ghost-archive" style={{ flex: 1, justifyContent: 'center' }}>
                    <FaArchive style={{ fontSize: 10 }} /> Archive
                  </button>
                </div>
              </div>
            );
          })}
          <Pagination page={page} totalPages={totalPages} total={filteredUsers.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════ */

/** Pill tab — identical props/structure to Inventory's TabPill */
function TabPill({ active, color, activeText, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className="um2-tab"
      style={{
        background: active ? color : '#fff',
        color:      active ? activeText : '#8C8070',
        border:     `1.5px solid ${active ? color : '#E8E2D7'}`,
        boxShadow:  active ? `0 4px 16px ${color}33` : 'none',
      }}
    >
      {icon}
      {label}
      {count !== null && (
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

/** Empty state — identical to Inventory's EmptyState */
function EmptyState({ icon, message, sub }) {
  return (
    <div style={{ padding: '52px 20px', textAlign: 'center', color: '#B5A99A' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 10, opacity: 0.3 }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#8C8070' }}>{message}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#B5A99A' }}>{sub}</p>}
    </div>
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