import React, { useState, useEffect, useRef } from 'react';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import Toast from './Toast';
import { FaBarcode, FaUndo, FaCheckCircle, FaClock, FaExclamationTriangle, FaBook } from 'react-icons/fa';
import { MdOutlineQrCodeScanner } from 'react-icons/md';

function isMigrationError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    msg.includes('book_copies') || msg.includes('copy_id') ||
    msg.includes('schema cache') || error.code === '42P01' || error.code === 'PGRST200'
  );
}

export default function ProcessReturns() {
  const [barcode,       setBarcode]       = useState('');
  const [processing,    setProcessing]    = useState(false);
  const [recentReturns, setRecentReturns] = useState([]);
  const [toast,         setToast]         = useState({ message: '', type: 'success' });
  const [finePolicy,    setFinePolicy]    = useState({ fine_amount: 5, fine_increment_value: 1, fine_increment_type: 'per_day' });
  const [scanFlash,     setScanFlash]     = useState(null); // 'success' | 'error' | null

  const inputRef    = useRef(null);
  const debounceRef = useRef(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  async function fetchFinePolicy() {
    const { data } = await localDbAdmin.from('fine_policy')
      .select('fine_amount, fine_increment_value, fine_increment_type').limit(1).maybeSingle();
    if (data) setFinePolicy({
      fine_amount:           data.fine_amount ?? 5,
      fine_increment_value:  Math.max(1, Number(data.fine_increment_value ?? 1)),
      fine_increment_type:   data.fine_increment_type || 'per_day',
    });
  }

  function computeOverdueUnits(dueDate, policy) {
    if (!dueDate) return 0;
    const ms = Date.now() - new Date(dueDate).getTime();
    if (ms <= 0) return 0;
    return policy.fine_increment_type === 'per_hour'
      ? Math.ceil(ms / (60 * 60 * 1000))
      : Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  function computeFine(dueDate, policy) {
    const units    = computeOverdueUnits(dueDate, policy);
    const incrVal  = Math.max(1, policy.fine_increment_value || 1);
    const charges  = Math.floor(units / incrVal);
    return charges * (policy.fine_amount ?? 5);
  }

  useEffect(() => {
    fetchFinePolicy();
    fetchRecentReturns();
    if (inputRef.current) inputRef.current.focus();
    const onVisible = () => { if (!document.hidden) fetchRecentReturns(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(debounceRef.current);
    };
  }, []);

  async function fetchRecentReturns() {
    let { data, error } = await localDbAdmin
      .from('transactions')
      .select('id, return_date, users (name, student_id), books (title), book_copies (accession_id, copy_number)')
      .eq('status', 'returned')
      .order('return_date', { ascending: false })
      .limit(10);

    if (error && isMigrationError(error)) {
      ({ data, error } = await localDbAdmin
        .from('transactions')
        .select('id, return_date, users (name, student_id), books (title)')
        .eq('status', 'returned')
        .order('return_date', { ascending: false })
        .limit(10));
    }
    if (data) setRecentReturns(data);
  }

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const scanned = barcode.trim();
    if (!scanned) return;
    setProcessing(true);
    try {
      await processReturn(scanned);
      setScanFlash('success');
    } catch {
      setScanFlash('error');
    } finally {
      setTimeout(() => setScanFlash(null), 900);
      setProcessing(false);
      setBarcode('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  async function processReturn(scanned) {
    try {
      const { data: copy, error: copyError } = await localDbAdmin
        .from('book_copies')
        .select('id, book_id, accession_id, copy_number, status')
        .eq('accession_id', scanned).maybeSingle();

      if (copyError && isMigrationError(copyError)) {
        // fall through to strategy 2
      } else if (!copy && !copyError) {
        // accession_id not found in book_copies — bail immediately
        throw new Error('No record found for this barcode.');
      } else if (copy) {
        if (copy.status !== 'borrowed') throw new Error(`Copy ${copy.accession_id} is not currently marked as borrowed. Its status is: "${copy.status}".`);

        const { data: transactions, error: transError } = await localDbAdmin
          .from('transactions')
          .select('id, user_id, due_date, users(name), books(title)')
          .eq('copy_id', copy.id).eq('status', 'borrowed')
          .order('borrow_date', { ascending: true }).limit(1);

        if (transError) throw new Error(`Database error: ${transError.message}`);
        if (!transactions?.length) throw new Error(`No active loan found linked to copy ${copy.accession_id}.`);

        const transaction  = transactions[0];
        const fineAmount   = computeFine(transaction.due_date, finePolicy);
        const overdueUnits = computeOverdueUnits(transaction.due_date, finePolicy);
        const fineLabel    = finePolicy.fine_increment_type === 'per_hour' ? 'hour' : 'day';

        let fineId = null;
        if (fineAmount > 0) {
          const { data: fineRow, error: fineErr } = await localDbAdmin.from('fines')
            .insert([{ transaction_id: transaction.id, user_id: transaction.user_id, amount: fineAmount, overdue_days: overdueUnits, status: 'unpaid' }])
            .select('id').single();
          if (fineErr) throw fineErr;
          fineId = fineRow.id;
        }

        const transUpdate = { status: 'returned', return_date: new Date().toISOString() };
        if (fineAmount > 0) { transUpdate.fine_amount = fineAmount; transUpdate.fine_id = fineId; }
        const { error: updateTransError } = await localDbAdmin.from('transactions').update(transUpdate).eq('id', transaction.id);
        if (updateTransError) throw updateTransError;
        const { error: updateCopyError } = await localDbAdmin.from('book_copies').update({ status: 'available' }).eq('id', copy.id);
        if (updateCopyError) throw updateCopyError;
        const { data: bookData } = await localDbAdmin.from('books').select('quantity').eq('id', copy.book_id).single();
        if (bookData) await localDbAdmin.from('books').update({ quantity: (bookData.quantity || 0) + 1 }).eq('id', copy.book_id);

        showToast(
          fineAmount > 0
            ? `Copy ${copy.accession_id} returned by ${transaction.users?.name}. Overdue ${overdueUnits} ${fineLabel}(s). Fine: ₱${fineAmount.toFixed(2)}.`
            : `Copy ${copy.accession_id} returned by ${transaction.users?.name}. Marked available.`,
          'success'
        );

        if (transaction.user_id) {
          const notifRow = {
            user_id: transaction.user_id, type: fineAmount > 0 ? 'return_with_fine' : 'returned',
            title: fineAmount > 0 ? 'Book returned — fine due' : 'Book returned',
            body: fineAmount > 0
              ? `Your return of "${transaction.books?.title}" was recorded. Overdue ${overdueUnits} ${fineLabel}(s). Fine due: ₱${fineAmount.toFixed(2)}.`
              : `Your return of "${transaction.books?.title}" was recorded. Thank you!`,
            email_sent: false, read: false,
          };
          if (fineId) notifRow.fine_id = fineId;
          await localDbAdmin.from('notifications').insert([notifRow]);
        }
        fetchRecentReturns();
        return;
      }

      // Strategy 2: legacy barcode
      const { data: book, error: bookError } = await localDbAdmin
        .from('books').select('id, title, quantity').eq('barcode', scanned).maybeSingle();
      if (bookError || !book) throw new Error('No record found for this barcode.');

      const { data: transactions, error: transError } = await localDbAdmin
        .from('transactions').select('id, user_id, due_date, users(name), books(title)')
        .eq('book_id', book.id).eq('status', 'borrowed')
        .order('borrow_date', { ascending: true }).limit(1);

      if (transError) throw new Error(`Database error: ${transError.message}`);
      if (!transactions?.length) throw new Error(`"${book.title}" is not currently marked as borrowed.`);

      const transaction  = transactions[0];
      const fineAmount   = computeFine(transaction.due_date, finePolicy);
      const overdueUnits = computeOverdueUnits(transaction.due_date, finePolicy);
      const fineLabel    = finePolicy.fine_increment_type === 'per_hour' ? 'hour' : 'day';

      let fineId = null;
      if (fineAmount > 0) {
        const { data: fineRow, error: fineErr } = await localDbAdmin.from('fines')
          .insert([{ transaction_id: transaction.id, user_id: transaction.user_id, amount: fineAmount, overdue_days: overdueUnits, status: 'unpaid' }])
          .select('id').single();
        if (fineErr) throw fineErr;
        fineId = fineRow.id;
      }

      const transUpdate = { status: 'returned', return_date: new Date().toISOString() };
      if (fineAmount > 0) { transUpdate.fine_amount = fineAmount; transUpdate.fine_id = fineId; }
      const { error: updateTransError } = await localDbAdmin.from('transactions').update(transUpdate).eq('id', transaction.id);
      if (updateTransError) throw updateTransError;
      const { error: updateBookError } = await localDbAdmin.from('books').update({ quantity: book.quantity + 1 }).eq('id', book.id);
      if (updateBookError) throw updateBookError;

      showToast(
        fineAmount > 0
          ? `"${book.title}" returned by ${transaction.users?.name}. Overdue ${overdueUnits} ${fineLabel}(s). Fine: ₱${fineAmount.toFixed(2)}.`
          : `"${book.title}" returned by ${transaction.users?.name}. Stock updated.`,
        'success'
      );

      if (transaction.user_id) {
        const notifRow = {
          user_id: transaction.user_id, type: fineAmount > 0 ? 'return_with_fine' : 'returned',
          title: fineAmount > 0 ? 'Book returned — fine due' : 'Book returned',
          body: fineAmount > 0
            ? `Your return of "${book.title}" was recorded. Overdue ${overdueUnits} ${fineLabel}(s). Fine due: ₱${fineAmount.toFixed(2)}.`
            : `Your return of "${book.title}" was recorded. Thank you!`,
          email_sent: false, read: false,
        };
        if (fineId) notifRow.fine_id = fineId;
        await localDbAdmin.from('notifications').insert([notifRow]);
      }
      fetchRecentReturns();

    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  }

  const scanBorderColor = scanFlash === 'success' ? '#16a34a'
    : scanFlash === 'error' ? '#dc2626'
    : processing ? '#b45309'
    : barcode ? 'var(--maroon)' : '#e2e8f0';

  return (
    <div style={{ width: '100%', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

        @keyframes pr-fadeUp   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pr-flash    { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        @keyframes pr-pulse    { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.04); opacity:.8; } }
        @keyframes pr-scan     { 0% { top:8px; opacity:.8; } 100% { top:calc(100% - 8px); opacity:0; } }
        @keyframes pr-slideIn  { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes pr-spin     { to { transform:rotate(360deg); } }

        .pr-page { animation: pr-fadeUp .4s ease both; }

        /* ── Header ── */
        .pr-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; margin-bottom: 28px;
        }
        .pr-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: .68rem; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: var(--maroon);
          background: rgba(123,31,31,.08); padding: 4px 12px;
          border-radius: 20px; margin-bottom: 8px;
        }
        .pr-title {
          font-size: 1.75rem; font-weight: 800; color: #0f172a;
          margin: 0; letter-spacing: -.025em; line-height: 1.15;
        }
        .pr-sub { font-size: .88rem; color: #64748b; margin: 6px 0 0; line-height: 1.6; }
        .pr-code {
          font-family: 'DM Mono', monospace; font-size: .8rem;
          background: #f0f4ff; color: #4f46e5;
          padding: 2px 8px; border-radius: 5px;
          border: 1px solid #e0e7ff;
        }

        /* ── Scanner card ── */
        .pr-scanner-card {
          background: white;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,.06), 0 1px 4px rgba(0,0,0,.04);
          overflow: hidden;
          margin-bottom: 24px;
          animation: pr-fadeUp .4s ease .05s both;
        }
        .pr-scanner-top {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 28px 32px 24px;
          position: relative; overflow: hidden;
        }
        .pr-scanner-top::before {
          content: '';
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .pr-scanner-label {
          font-size: .65rem; font-weight: 700; letter-spacing: 1.2px;
          text-transform: uppercase; color: rgba(255,255,255,.45);
          margin: 0 0 6px; position: relative;
        }
        .pr-scanner-heading {
          font-size: 1.2rem; font-weight: 800; color: white;
          margin: 0 0 4px; position: relative;
        }
        .pr-scanner-hint {
          font-size: .8rem; color: rgba(255,255,255,.5);
          margin: 0; position: relative;
        }
        .pr-scanner-icon {
          position: absolute; right: 32px; top: 50%; transform: translateY(-50%);
          font-size: 4.5rem; color: rgba(255,255,255,.06);
          pointer-events: none;
        }

        /* Status dot */
        .pr-status-dot {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: .72rem; font-weight: 600;
          position: absolute; top: 20px; right: 28px;
          background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12);
          padding: 5px 12px; border-radius: 20px; color: rgba(255,255,255,.75);
        }
        .pr-dot {
          width: 7px; height: 7px; border-radius: 50%;
          animation: pr-pulse 2s ease-in-out infinite;
        }

        /* Input row */
        .pr-input-row {
          padding: 24px 28px;
          display: flex; gap: 12px; align-items: stretch;
        }
        .pr-input-wrap {
          flex: 1; position: relative;
        }
        .pr-input-prefix {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; font-size: 1rem; pointer-events: none;
          display: flex; align-items: center;
          transition: color .2s;
        }
        .pr-input {
          width: 100%; padding: 15px 16px 15px 46px;
          font-family: 'DM Mono', monospace; font-size: 1.05rem; font-weight: 500;
          border: 2px solid; border-radius: 12px;
          background: #f8fafc; color: #0f172a; outline: none;
          transition: border-color .25s, background .25s, box-shadow .25s;
          letter-spacing: .04em;
        }
        .pr-input:focus { background: white; }
        .pr-input::placeholder { color: #c0c9d4; font-weight: 400; letter-spacing: 0; }
        .pr-input:disabled { opacity: .6; cursor: not-allowed; }

        /* Scan line animation inside input */
        .pr-scan-line {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--maroon), transparent);
          border-radius: 2px; pointer-events: none;
          animation: pr-scan 1s ease-in-out infinite alternate;
        }

        .pr-submit-btn {
          padding: 0 28px; border: none; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-weight: 700; font-size: .92rem;
          cursor: pointer; display: flex; align-items: center; gap: 8px;
          white-space: nowrap; transition: all .2s; letter-spacing: .01em;
          min-width: 130px; justify-content: center;
        }
        .pr-submit-btn.ready   { background: var(--maroon); color: white; box-shadow: 0 3px 12px rgba(123,31,31,.3); }
        .pr-submit-btn.ready:hover { opacity: .88; transform: translateY(-1px); }
        .pr-submit-btn.working { background: #64748b; color: white; cursor: not-allowed; }
        .pr-submit-btn.empty   { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

        /* Spinner */
        .pr-spinner {
          width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.4);
          border-top-color: white; border-radius: 50%;
          animation: pr-spin .7s linear infinite;
        }

        /* ── Recent returns ── */
        .pr-returns-card {
          background: white; border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,.05), 0 1px 4px rgba(0,0,0,.03);
          overflow: hidden;
          animation: pr-fadeUp .4s ease .12s both;
        }
        .pr-returns-head {
          padding: 20px 28px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
        }
        .pr-returns-title {
          font-size: 1rem; font-weight: 800; color: #0f172a; margin: 0;
          display: flex; align-items: center; gap: 9px;
        }
        .pr-returns-count {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--maroon); color: white;
          font-size: .65rem; font-weight: 800;
        }
        .pr-live-badge {
          font-size: .65rem; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; color: #16a34a;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          padding: 3px 10px; border-radius: 20px;
          display: flex; align-items: center; gap: 5px;
        }
        .pr-live-dot {
          width: 5px; height: 5px; border-radius: 50%; background: #16a34a;
          animation: pr-pulse 2s ease-in-out infinite;
        }

        /* Return row */
        .pr-row {
          display: flex; align-items: center;
          padding: 16px 28px; gap: 16px;
          border-bottom: 1px solid #f8fafc;
          transition: background .15s;
          animation: pr-slideIn .3s ease both;
        }
        .pr-row:last-child { border-bottom: none; }
        .pr-row:hover { background: #fafafa; }

        .pr-row-icon {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 1rem;
        }
        .pr-row-body { flex: 1; min-width: 0; }
        .pr-row-title {
          font-size: .9rem; font-weight: 700; color: #0f172a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          margin: 0 0 3px;
        }
        .pr-row-accession {
          font-family: 'DM Mono', monospace; font-size: .72rem; font-weight: 500;
          background: #f0f4ff; color: #4f46e5;
          padding: 2px 8px; border-radius: 5px; border: 1px solid #e0e7ff;
          display: inline-block;
        }
        .pr-row-borrower {
          font-size: .8rem; color: #64748b; margin: 0; white-space: nowrap;
        }
        .pr-row-borrower strong { color: #334155; font-weight: 700; }
        .pr-row-time {
          font-size: .75rem; color: #94a3b8; white-space: nowrap;
          text-align: right; flex-shrink: 0;
        }

        .pr-empty {
          padding: 56px 24px; text-align: center;
        }
        .pr-empty-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: #f8fafc; display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; color: #cbd5e1; margin: 0 auto 14px;
        }
        .pr-empty p { color: #94a3b8; font-size: .88rem; margin: 0; }

        @media (max-width: 640px) {
          .pr-input-row { padding: 16px; flex-direction: column; }
          .pr-submit-btn { padding: 14px; width: 100%; }
          .pr-scanner-top { padding: 24px 20px; }
          .pr-row { padding: 14px 16px; flex-wrap: wrap; }
          .pr-row-time { width: 100%; text-align: left; padding-left: 58px; margin-top: -2px; }
          .pr-returns-head { padding: 16px 20px; }
          .pr-header { margin-bottom: 20px; }
        }
      `}</style>

      <Toast {...toast} onClose={() => setToast({ message: '' })} />

      <div className="pr-page">

        {/* ── Header ── */}
        <div className="pr-header">
          <div>
            <div className="pr-eyebrow">
              <FaUndo style={{ fontSize: '.6rem' }} /> Returns Station
            </div>
            <h1 className="pr-title">Process Returns</h1>
            <p className="pr-sub">
              Scan a copy barcode&nbsp;
              <code className="pr-code">LIB-2026-000001</code>
              &nbsp;to check it back in. Fines are calculated automatically.
            </p>
          </div>
        </div>

        {/* ── Scanner Card ── */}
        <div className="pr-scanner-card">

          {/* Dark header bar */}
          <div className="pr-scanner-top">
            <div className="pr-scanner-label">Barcode Scanner</div>
            <h2 className="pr-scanner-heading">Ready to Scan</h2>
            <p className="pr-scanner-hint">Use a USB scanner or type the accession ID manually</p>
            <div className="pr-scanner-icon"><MdOutlineQrCodeScanner /></div>

            {/* Live status */}
            <div className="pr-status-dot">
              <span className="pr-dot" style={{ background: processing ? '#f59e0b' : '#22c55e' }} />
              {processing ? 'Processing…' : 'Awaiting scan'}
            </div>
          </div>

          {/* Input row */}
          <form onSubmit={handleScanSubmit}>
            <div className="pr-input-row">
              <div className="pr-input-wrap">
                <span className="pr-input-prefix" style={{ color: barcode ? 'var(--maroon)' : '#94a3b8' }}>
                  <FaBarcode />
                </span>
                <input
                  ref={inputRef}
                  className="pr-input"
                  type="text"
                  placeholder="Scan or type barcode — e.g. LIB-2026-000001"
                  value={barcode}
                  style={{ borderColor: scanBorderColor, boxShadow: barcode && !processing ? `0 0 0 3px ${scanBorderColor}22` : 'none' }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBarcode(val);
                    clearTimeout(debounceRef.current);
                    if (val.trim()) {
                      debounceRef.current = setTimeout(() => {
                        if (val.trim()) e.target.form.requestSubmit();
                      }, 600);
                    }
                  }}
                  disabled={processing}
                  autoFocus
                />
                {/* Animated scan line while processing */}
                {processing && <div className="pr-scan-line" />}
              </div>

              <button
                type="submit"
                disabled={processing || !barcode}
                className={`pr-submit-btn ${processing ? 'working' : barcode ? 'ready' : 'empty'}`}
              >
                {processing
                  ? <><div className="pr-spinner" /> Processing</>
                  : <><FaCheckCircle style={{ fontSize: '.85rem' }} /> Return</>}
              </button>
            </div>
          </form>
        </div>

        {/* ── Recent Returns ── */}
        <div className="pr-returns-card">
          <div className="pr-returns-head">
            <h3 className="pr-returns-title">
              <FaClock style={{ color: 'var(--maroon)', fontSize: '.9rem' }} />
              Recently Returned
              {recentReturns.length > 0 && (
                <span className="pr-returns-count">{recentReturns.length}</span>
              )}
            </h3>
            <div className="pr-live-badge">
              <div className="pr-live-dot" /> Live
            </div>
          </div>

          {recentReturns.length === 0 ? (
            <div className="pr-empty">
              <div className="pr-empty-icon"><FaBook /></div>
              <p>No returns recorded yet — scan a book to get started.</p>
            </div>
          ) : (
            recentReturns.map((item, idx) => (
              <div className="pr-row" key={item.id} style={{ animationDelay: `${idx * 0.04}s` }}>
                {/* Icon */}
                <div className="pr-row-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <FaCheckCircle />
                </div>

                {/* Book & accession */}
                <div className="pr-row-body">
                  <div className="pr-row-title">{item.books?.title || '—'}</div>
                  {item.book_copies?.accession_id ? (
                    <span className="pr-row-accession">
                      {item.book_copies.accession_id} · Copy #{item.book_copies.copy_number}
                    </span>
                  ) : (
                    <span className="pr-row-accession" style={{ background: '#f8fafc', color: '#94a3b8', borderColor: '#e2e8f0' }}>
                      Legacy return
                    </span>
                  )}
                </div>

                {/* Borrower */}
                <div className="pr-row-borrower">
                  Returned by <strong>{item.users?.name || '—'}</strong>
                </div>

                {/* Time */}
                <div className="pr-row-time">
                  {item.return_date
                    ? new Date(item.return_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}