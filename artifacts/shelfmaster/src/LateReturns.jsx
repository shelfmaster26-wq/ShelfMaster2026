import React, { useEffect, useState } from 'react';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import BookLoader from './BookLoader';
import { FaBell, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function LateReturns() {
  const [lateBooks, setLateBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finePolicy, setFinePolicy] = useState({ fine_amount: 5, fine_increment_value: 1, fine_increment_type: 'per_day' });
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [notifying, setNotifying] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);

  useEffect(() => {
    fetchFinePolicy();
    fetchLateBooks();
  }, []);

  async function fetchFinePolicy() {
    const { data } = await localDbAdmin
      .from('fine_policy')
      .select('fine_amount, fine_increment_value, fine_increment_type')
      .limit(1)
      .maybeSingle();
    if (data) {
      setFinePolicy({
        fine_amount: data.fine_amount ?? 5,
        fine_increment_value: Math.max(1, Number(data.fine_increment_value ?? 1)),
        fine_increment_type: data.fine_increment_type || 'per_day',
      });
    }
  }

  async function fetchLateBooks() {
    const now = new Date().toISOString();

    let { data, error } = await localDbAdmin
      .from('transactions')
      .select(`
        id,
        due_date,
        borrow_date,
        user_id,
        users (name, student_id, email),
        books (title),
        book_copies (accession_id, copy_number)
      `)
      .eq('status', 'borrowed')
      .lt('due_date', now)
      .order('due_date', { ascending: true });

    if (error && (error.code === '42P01' || error.code === 'PGRST200' || (error.message || '').includes('book_copies'))) {
      ({ data, error } = await localDbAdmin
        .from('transactions')
        .select('id, due_date, borrow_date, user_id, users (name, student_id, email), books (title)')
        .eq('status', 'borrowed')
        .lt('due_date', now)
        .order('due_date', { ascending: true }));
    }

    if (error) console.error(error);
    else setLateBooks(data || []);
    setLoading(false);
  }

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

  const computeOverdueUnits = (dueDate, policy) => {
    if (!dueDate) return 0;
    const ms = Date.now() - new Date(dueDate).getTime();
    if (ms <= 0) return 0;
    if (policy.fine_increment_type === 'per_hour') {
      return Math.ceil(ms / (60 * 60 * 1000));
    }
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  };

  const computeFine = (dueDate, policy) => {
    const units = computeOverdueUnits(dueDate, policy);
    const incrValue = Math.max(1, policy.fine_increment_value || 1);
    const charges = Math.floor(units / incrValue);
    return charges * (policy.fine_amount ?? 5);
  };

  const fineLabel = finePolicy.fine_increment_type === 'per_hour' ? 'hour' : 'day';
  const totalFines = lateBooks.reduce((sum, item) => sum + computeFine(item.due_date, finePolicy), 0);
  const totalPages = Math.ceil(lateBooks.length / PAGE_SIZE);
  const pagedBooks = lateBooks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ color: 'var(--dark-blue)', margin: 0 }}><FaExclamationTriangle style={{ verticalAlign: 'middle' }} /> Overdue Books</h1>
          <p style={{ color: '#64748b', marginTop: '5px', margin: '5px 0 0' }}>Students who have not returned books past their due date.</p>
        </div>

        {lateBooks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <button
              onClick={handleSendReminders}
              disabled={notifying}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: notifying ? '#94a3b8' : 'var(--maroon)',
                color: 'white', border: 'none', padding: '10px 20px',
                borderRadius: 10, fontWeight: 700, fontSize: '0.88rem',
                cursor: notifying ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                transition: 'background 0.2s',
              }}
            >
              <FaBell style={{ fontSize: '0.9rem' }} />
              {notifying ? 'Sending...' : 'Send Overdue Reminders'}
            </button>
            {notifyResult && (
              <div style={{
                fontSize: '0.8rem', fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                background: notifyResult.ok ? '#f0fdf4' : '#fef2f2',
                color: notifyResult.ok ? '#15803d' : '#dc2626',
                border: `1px solid ${notifyResult.ok ? '#bbf7d0' : '#fecaca'}`,
              }}>
                {notifyResult.ok
                  ? notifyResult.sent === 0
                    ? `All ${notifyResult.skipped} student${notifyResult.skipped !== 1 ? 's' : ''} already notified.`
                    : `Notified ${notifyResult.sent} student${notifyResult.sent !== 1 ? 's' : ''}${notifyResult.skipped > 0 ? `, ${notifyResult.skipped} already sent` : ''}.`
                  : `Error: ${notifyResult.error}`}
              </div>
            )}
          </div>
        )}
      </div>

      {lateBooks.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 20px', minWidth: '160px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{lateBooks.length}</div>
            <div style={{ fontSize: '0.78rem', color: '#7f1d1d', fontWeight: 600 }}>Overdue Books</div>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '14px 20px', minWidth: '160px' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c2410c' }}>₱{totalFines.toFixed(2)}</div>
            <div style={{ fontSize: '0.78rem', color: '#7c2d12', fontWeight: 600 }}>Total Accrued Fines</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 20px', flex: 1 }}>
            <div style={{ fontSize: '0.82rem', color: '#15803d', fontWeight: 600 }}>Fine Policy</div>
            <div style={{ fontSize: '0.9rem', color: '#166534', marginTop: '4px' }}>
              ₱{finePolicy.fine_amount} per {finePolicy.fine_increment_value > 1 ? `${finePolicy.fine_increment_value} ` : ''}{fineLabel}{finePolicy.fine_increment_value > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <BookLoader inline message="Loading overdue books" />
      ) : lateBooks.length === 0 ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}><FaCheckCircle style={{ verticalAlign: 'middle' }} /></div>
          <p style={{ color: '#166534', fontWeight: 600, margin: 0 }}>No books are currently overdue.</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', border: '1px solid #fecaca' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fee2e2', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Student</th>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Book Title</th>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Copy</th>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Due Date</th>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Overdue ({fineLabel}s)</th>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Accrued Fine (₱{finePolicy.fine_amount}/{finePolicy.fine_increment_value > 1 ? `${finePolicy.fine_increment_value} ` : ''}{fineLabel})</th>
                <th style={{ padding: '12px 16px', color: '#7f1d1d', fontWeight: 700 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedBooks.map((item) => {
                const units = computeOverdueUnits(item.due_date, finePolicy);
                const fine = computeFine(item.due_date, finePolicy);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #fee2e2', background: '#fffbfb' }}>
                    <td style={{ padding: '13px 16px' }}>
                      <strong style={{ color: 'var(--dark-blue)', display: 'block' }}>
                        {item.users?.name || 'Unknown'}
                      </strong>
                      <small style={{ color: '#64748b' }}>
                        {item.users?.student_id || item.users?.email || ''}
                      </small>
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 600, color: '#1e293b' }}>
                      {item.books?.title || '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      {item.book_copies?.accession_id ? (
                        <code style={{ background: '#eef2ff', color: '#6366f1', padding: '2px 7px', borderRadius: '4px', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                          {item.book_copies.accession_id}
                        </code>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '13px 16px', color: '#dc2626', fontWeight: 700 }}>
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: '#fecaca', color: '#991b1b', padding: '3px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.82rem' }}>
                        {units} {units === 1 ? fineLabel : fineLabel + 's'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', fontWeight: 800, color: '#dc2626', fontSize: '1rem' }}>
                      ₱{fine.toFixed(2)}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ background: '#fecaca', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                        OVERDUE
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} total={lateBooks.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} />
        </div>
      )}
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
