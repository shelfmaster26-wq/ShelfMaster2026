import React, { useState, useEffect } from 'react';
import { localDb } from './localDbClient';
import StudentNavbar from './StudentNavbar';
import { FaBookOpen, FaClock, FaCalendarAlt, FaBarcode } from 'react-icons/fa';
import ConfirmModal from './ConfirmModal';
import BookLoader from './BookLoader';

function isMigrationError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return msg.includes('book_copies') || msg.includes('copy_id') || msg.includes('schema cache') || error.code === '42P01' || error.code === 'PGRST200';
}

export default function StudentBooks() {
  const [activeTab, setActiveTab] = useState('loans');
  const [loans, setLoans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  useEffect(() => {
    fetchData();
    const onVisible = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await localDb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: userData } = await localDb.from('users').select('id').eq('auth_id', user.id).maybeSingle();
    const userId = userData?.id;
    if (!userId) { setLoading(false); return; }

    let [loansRes, requestsRes] = await Promise.all([
      localDb.from('transactions')
        .select('id, borrow_date, due_date, status, books(title, authors, accession_num), book_copies(accession_id, copy_number)')
        .eq('user_id', userId).in('status', ['borrowed', 'approved', 'issued', 'active', 'loaned', 'checked_out']),
      localDb.from('transactions')
        .select('id, created_at, status, books(title, authors)')
        .eq('user_id', userId).eq('status', 'pending'),
    ]);

    if (loansRes.error && isMigrationError(loansRes.error)) {
      loansRes = await localDb.from('transactions')
        .select('id, borrow_date, due_date, status, books(title, authors, accession_num)')
        .eq('user_id', userId).in('status', ['borrowed', 'approved', 'issued', 'active', 'loaned', 'checked_out']);
    }

    if (!loansRes.error) setLoans(loansRes.data || []);
    if (!requestsRes.error) setRequests(requestsRes.data || []);
    setLoading(false);
  }

  async function cancelRequest(requestId) {
    setCancellingId(requestId);
    const { error } = await localDb.from('transactions').delete().eq('id', requestId);
    if (!error) setRequests(prev => prev.filter(r => r.id !== requestId));
    setCancellingId(null);
    setConfirmCancelId(null);
  }

  const calculateDaysLeft = (dueDate) => {
    const diffDays = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: `${Math.abs(diffDays)}d Overdue`, color: '#e11d48', bg: '#fee2e2', weight: 'bold' };
    if (diffDays === 0) return { text: 'Due Today', color: '#d97706', bg: '#fef3c7', weight: 'bold' };
    if (diffDays <= 2) return { text: `${diffDays}d Left`, color: '#d97706', bg: '#fef3c7', weight: 'bold' };
    return { text: `${diffDays}d Left`, color: '#16a34a', bg: '#dcfce7', weight: '600' };
  };

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100%{opacity:.5;} 50%{opacity:1;} }
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(.7);} }

        /* ── Page shell ── */
        .books-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px;
        }

        /* ── Page header ── */
        .page-header {
          margin-bottom: 28px;
          opacity: 0;
          animation: fadeUp .45s ease .05s forwards;
        }
        .page-header h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          color: var(--maroon);
          margin: 0 0 4px;
          line-height: 1.2;
        }
        .page-header p {
          color: #94a3b8;
          margin: 0;
          font-size: 0.88rem;
        }

        /* ── Tabs ── */
        .tabs-bar {
          display: flex;
          gap: 4px;
          margin-bottom: 0;
          border-bottom: 1.5px solid #e8edf3;
          opacity: 0;
          animation: fadeUp .45s ease .12s forwards;
        }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          color: #94a3b8;
          border-bottom: 2.5px solid transparent;
          margin-bottom: -1.5px;
          border-radius: 8px 8px 0 0;
          transition: color .18s, background .18s;
        }
        .tab-btn:hover { color: #475569; background: #f8fafc; }
        .tab-btn.active {
          color: var(--maroon);
          border-bottom-color: var(--maroon);
          background: rgba(127,29,29,0.04);
        }
        .tab-count {
          font-size: 0.67rem;
          font-weight: 800;
          border-radius: 20px;
          padding: 2px 8px;
          letter-spacing: 0.2px;
        }

        /* ── Panel shell ── */
        .books-panel {
          background: white;
          border-radius: 0 0 18px 18px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
          overflow: hidden;
          opacity: 0;
          animation: fadeUp .45s ease .2s forwards;
        }

        /* ── Table ── */
        .loans-table { width: 100%; border-collapse: collapse; }
        .loans-table thead tr {
          background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 60%, #b91c1c 100%);
        }
        .loans-table th {
          padding: 14px 18px;
          text-align: left;
          font-weight: 700;
          font-size: 0.72rem;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.85);
          white-space: nowrap;
        }
        .loans-table tbody tr { transition: background .15s; }
        .loans-table tbody tr:hover { background: #fafbfc; }
        .loans-table td {
          padding: 14px 18px;
          vertical-align: middle;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.88rem;
          color: #334155;
        }
        .loans-table tbody tr:last-child td { border-bottom: none; }

        .book-title-cell strong {
          display: block;
          font-size: 0.92rem;
          color: #0f172a;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .book-author-cell {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .accession-chip {
          display: inline-block;
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          color: #4338ca;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-family: 'Fira Code', 'Courier New', monospace;
          font-weight: 700;
          letter-spacing: 0.5px;
          border: 1px solid #c7d2fe;
        }
        .copy-num {
          font-size: 0.68rem;
          color: #94a3b8;
          margin-top: 3px;
        }

        /* ── Due date badge ── */
        .due-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 11px;
          border-radius: 20px;
          font-size: 0.76rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .due-badge::before {
          content: '';
          width: 6px; height: 6px;
          border-radius: 50%;
          background: currentColor;
          opacity: .7;
          flex-shrink: 0;
          animation: pulseDot 1.6s ease infinite;
        }

        /* ── Mobile loan cards ── */
        .loans-cards { display: none; }

        .loan-card {
          padding: 18px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .loan-card:last-child { border-bottom: none; }

        .loan-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
        }
        .loan-card-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7f1d1d, #b91c1c);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.85);
          font-size: 1rem;
          flex-shrink: 0;
        }
        .loan-card-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
        }
        .loan-card-author {
          font-size: 0.76rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .loan-meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .loan-meta-item {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 10px;
          padding: 9px 11px;
        }
        .loan-meta-label {
          font-size: 0.62rem;
          font-weight: 800;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 3px;
        }
        .loan-meta-val {
          font-size: 0.84rem;
          font-weight: 700;
          color: #1e293b;
        }

        /* ── Request rows ── */
        .req-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 22px;
          border-bottom: 1px solid #f1f5f9;
          gap: 16px;
          transition: background .15s;
        }
        .req-row:last-child { border-bottom: none; }
        .req-row:hover { background: #fafbfc; }

        .req-book-dot {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #fef9c3, #fde68a);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          flex-shrink: 0;
          border: 1px solid #fcd34d;
        }
        .req-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .req-meta {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }
        .req-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .pending-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fffbeb;
          color: #92400e;
          border: 1.5px solid #fde68a;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .pending-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #d97706;
          animation: pulseDot 1.4s ease infinite;
          flex-shrink: 0;
        }

        .cancel-btn {
          padding: 7px 16px;
          border-radius: 20px;
          border: 1.5px solid #fecdd3;
          background: #fff1f2;
          color: #e11d48;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          white-space: nowrap;
          transition: background .15s, border-color .15s, transform .15s;
        }
        .cancel-btn:hover {
          background: #fee2e2;
          border-color: #f9a8b8;
          transform: translateY(-1px);
        }

        /* ── Empty state ── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 72px 24px;
        }
        .empty-icon-ring {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border: 2px dashed #e2e8f0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.8rem;
          margin-bottom: 16px;
          color: #cbd5e1;
        }
        .empty-state p {
          margin: 0;
          font-size: 0.92rem;
          color: #94a3b8;
          font-weight: 500;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .books-wrap { padding: 20px 14px; }
          .page-header h2 { font-size: 1.5rem; }

          .loans-table-wrap { display: none !important; }
          .loans-cards { display: flex; flex-direction: column; }

          .req-row { flex-direction: column; align-items: flex-start; padding: 14px 16px; }
          .req-actions { width: 100%; justify-content: space-between; }

          .tab-label-full { display: none; }
          .tab-label-short { display: inline; }
        }
        @media (min-width: 641px) {
          .tab-label-full { display: inline; }
          .tab-label-short { display: none; }
        }
      `}</style>

      <StudentNavbar />

      <div className="books-wrap">

        {/* ── Page Header ── */}
        <div className="page-header">
          <h2>My Books</h2>
          <p>Track your active loans and borrowing requests</p>
        </div>

        {/* ── Tabs ── */}
        <div className="tabs-bar">
          {[
            { key: 'loans',    full: 'Active Loans',    short: 'Loans',   badge: loans.length,    badgeBg: '#dcfce7', badgeColor: '#15803d' },
            { key: 'requests', full: 'Pending Requests', short: 'Pending', badge: requests.length, badgeBg: '#fef3c7', badgeColor: '#92400e' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="tab-label-full">{tab.full}</span>
              <span className="tab-label-short">{tab.short}</span>
              {tab.badge > 0 && (
                <span className="tab-count" style={{ background: tab.badgeBg, color: tab.badgeColor }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <BookLoader inline message="Loading" />
        ) : (
          <div className="books-panel">

            {/* ── LOANS TAB ── */}
            {activeTab === 'loans' && (
              loans.length === 0 ? (
                <EmptyState icon={<FaBookOpen />} message="You have no active loans." />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="loans-table-wrap" style={{ overflowX: 'auto' }}>
                    <table className="loans-table">
                      <thead>
                        <tr>
                          <th>Book</th>
                          <th>Copy / Barcode</th>
                          <th>Borrowed</th>
                          <th>Due Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loans.map(loan => {
                          const cd = loan.due_date ? calculateDaysLeft(loan.due_date) : null;
                          return (
                            <tr key={loan.id}>
                              <td className="book-title-cell">
                                <strong>{loan.books?.title}</strong>
                                <span className="book-author-cell">by {loan.books?.authors}</span>
                              </td>
                              <td>
                                {loan.book_copies?.accession_id ? (
                                  <>
                                    <span className="accession-chip">{loan.book_copies.accession_id}</span>
                                    <div className="copy-num">Copy #{loan.book_copies.copy_number}</div>
                                  </>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                    {loan.books?.accession_num || '—'}
                                  </span>
                                )}
                              </td>
                              <td>{loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}</td>
                              <td style={{ color: cd?.color ?? '#334155', fontWeight: cd ? 600 : 400 }}>
                                {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}
                              </td>
                              <td>
                                {cd
                                  ? <span className="due-badge" style={{ background: cd.bg, color: cd.color }}>{cd.text}</span>
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="loans-cards">
                    {loans.map(loan => {
                      const cd = loan.due_date ? calculateDaysLeft(loan.due_date) : null;
                      return (
                        <div key={loan.id} className="loan-card">
                          <div className="loan-card-header">
                            <div className="loan-card-icon"><FaBookOpen /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="loan-card-title">{loan.books?.title}</div>
                              <div className="loan-card-author">by {loan.books?.authors}</div>
                            </div>
                            {cd && (
                              <span className="due-badge" style={{ background: cd.bg, color: cd.color, flexShrink: 0 }}>
                                {cd.text}
                              </span>
                            )}
                          </div>
                          <div className="loan-meta-grid">
                            <div className="loan-meta-item">
                              <div className="loan-meta-label">Borrowed</div>
                              <div className="loan-meta-val">
                                {loan.borrow_date ? new Date(loan.borrow_date).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            <div className="loan-meta-item">
                              <div className="loan-meta-label">Due Date</div>
                              <div className="loan-meta-val" style={{ color: cd?.color }}>
                                {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}
                              </div>
                            </div>
                            {loan.book_copies?.accession_id && (
                              <div className="loan-meta-item" style={{ gridColumn: '1 / -1' }}>
                                <div className="loan-meta-label">Barcode</div>
                                <div className="loan-meta-val">
                                  <span className="accession-chip">{loan.book_copies.accession_id}</span>
                                  <span style={{ color: '#94a3b8', fontSize: '0.72rem', marginLeft: 8 }}>
                                    Copy #{loan.book_copies.copy_number}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )
            )}

            {/* ── REQUESTS TAB ── */}
            {activeTab === 'requests' && (
              requests.length === 0 ? (
                <EmptyState icon={<FaClock />} message="No pending requests at the moment." />
              ) : (
                <div>
                  {requests.map(req => (
                    <div key={req.id} className="req-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div className="req-book-dot">📖</div>
                        <div style={{ minWidth: 0 }}>
                          <div className="req-title">{req.books?.title}</div>
                          <div className="req-meta">
                            by {req.books?.authors} · {new Date(req.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="req-actions">
                        <span className="pending-badge">
                          <span className="pending-dot" /> Pending
                        </span>
                        <button className="cancel-btn" onClick={() => setConfirmCancelId(req.id)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!confirmCancelId}
        onCancel={() => setConfirmCancelId(null)}
        onConfirm={() => cancelRequest(confirmCancelId)}
        title="Cancel Request?"
        message="Are you sure you want to cancel this borrowing request? This action cannot be undone."
        confirmText="Yes, Cancel"
        cancelText="Keep"
      />
    </div>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon-ring">{icon}</div>
      <p>{message}</p>
    </div>
  );
}