import React, { useState, useEffect, useRef } from 'react';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import BookLoader from './BookLoader';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import {
  FaArchive, FaBook, FaBookOpen, FaCheckCircle, FaClipboardList, FaClock,
  FaExclamationTriangle, FaInfoCircle, FaRecycle, FaTrash, FaSearch,
  FaFileCsv, FaFilePdf, FaFilter, FaChevronDown, FaDownload, FaBarcode,
} from 'react-icons/fa';
import { MdClose } from 'react-icons/md';

/* ─── Design System (mirrors LibrarianDashboard) ─── */
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

  .bh-root { font-family: 'DM Sans', sans-serif; }
  .bh-root *, .bh-root *::before, .bh-root *::after { box-sizing: border-box; }

  /* ── fade-up entry ── */
  .bh-fade { opacity: 0; animation: bh-fadein 0.55s ease 0.1s forwards; }
  @keyframes bh-fadein { to { opacity: 1; } }

  .bh-rise {
    opacity: 0;
    transform: translateY(20px);
    animation: bh-rise 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  @keyframes bh-rise { to { opacity: 1; transform: translateY(0); } }

  /* ── tab pill ── */
  .bh-tab {
    position: relative;
    padding: 9px 22px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.9rem;
    color: #8C8070;
    transition: color 0.2s;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
  }
  .bh-tab.active { color: var(--maroon); border-bottom-color: var(--maroon); }
  .bh-tab:hover:not(.active) { color: #2A2118; }

  /* ── filter chip ── */
  .bh-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 20px;
    border: 1.5px solid #E8E2D7;
    background: #fff;
    color: #6B5F52;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .bh-chip.active {
    background: var(--maroon);
    border-color: var(--maroon);
    color: #fff;
    box-shadow: 0 3px 10px rgba(139,0,0,0.2);
  }
  .bh-chip:hover:not(.active) { border-color: var(--maroon); color: var(--maroon); }

  /* ── action button ── */
  .bh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 18px;
    border-radius: 9px;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .bh-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
  .bh-btn:active { transform: translateY(0); }
  .bh-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

  /* ── table rows ── */
  .bh-tr { transition: background 0.15s ease; }
  .bh-tr:hover { background: rgba(249,247,242,0.8) !important; }

  /* ── search input ── */
  .bh-search {
    width: 100%;
    padding: 13px 18px 13px 44px;
    border-radius: 12px;
    border: 1.5px solid #E8E2D7;
    background: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    color: #2A2118;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .bh-search:focus {
    border-color: var(--maroon);
    box-shadow: 0 0 0 3px rgba(139,0,0,0.08);
  }
  .bh-search::placeholder { color: #8C8070; }

  /* ── stat badge ── */
  .bh-stat-badge {
    opacity: 0;
    transform: translateY(16px);
    animation: bh-rise 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .bh-stat-badge:hover {
    transform: translateY(-3px) !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
  }

  .bh-empty-icon { font-size: 2.8rem; opacity: 0.15; margin-bottom: 12px; }

  /* ── scrollable table wrapper (desktop only) ── */
  .bh-table-wrap { overflow-x: auto; }
  .bh-table { width: 100%; border-collapse: collapse; min-width: 780px; }

  /* ── Status cell: never clip ── */
  .bh-status-cell { white-space: nowrap; }

  /* ── popover ── */
  .bh-popover {
    position: fixed;
    z-index: 9999;
    background: #fff;
    border: 1px solid #E8E2D7;
    border-radius: 14px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.13);
    padding: 16px 18px;
    min-width: 240px;
    max-width: min(290px, 90vw);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    animation: bh-fadein 0.15s ease;
    word-break: break-word;
    overflow-wrap: anywhere;
    box-sizing: border-box;
  }

  /* ── search dropdown ── */
  .bh-dropdown {
    position: absolute;
    width: 100%;
    background: #fff;
    border: 1px solid #E8E2D7;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    z-index: 100;
    overflow: hidden;
    animation: bh-fadein 0.12s ease;
  }
  .bh-dropdown-item {
    padding: 13px 16px;
    cursor: pointer;
    border-bottom: 1px solid #F1EDE3;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: background 0.12s;
  }
  .bh-dropdown-item:last-child { border-bottom: none; }
  .bh-dropdown-item:hover { background: #F9F7F2; }

  /* ── Dropdown section header ── */
  .bh-dropdown-section-header {
    padding: 7px 16px 5px;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: #8C8070;
    background: #FAFAF8;
    border-bottom: 1px solid #F1EDE3;
    font-family: 'DM Sans', sans-serif;
  }

  /* ── Table data cells wrap text vertically, not horizontally ── */
  td { overflow-wrap: break-word; word-break: break-word; }

  /* ════════════════════════════════════════════
     EXPORT DROPDOWN
     ════════════════════════════════════════════ */
  .bh-export-wrap { position: relative; display: inline-block; }

  .bh-export-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 9px;
    border: none;
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    background: var(--maroon);
    color: #fff;
    transition: all 0.18s ease;
    box-shadow: 0 2px 8px rgba(139,0,0,0.18);
  }
  .bh-export-trigger:hover {
    background: #7a0000;
    transform: translateY(-1px);
    box-shadow: 0 5px 16px rgba(139,0,0,0.28);
  }
  .bh-export-trigger:active { transform: translateY(0); }
  .bh-export-trigger .chevron {
    transition: transform 0.2s ease;
    opacity: 0.7;
  }
  .bh-export-trigger.open .chevron { transform: rotate(180deg); }

  .bh-export-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    min-width: 230px;
    background: #fff;
    border: 1.5px solid #E8E2D7;
    border-radius: 14px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.13);
    z-index: 200;
    overflow: hidden;
    animation: bh-fadein 0.15s ease;
  }

  .bh-export-header {
    padding: 11px 15px 9px;
    background: #faf7f3;
    border-bottom: 1px solid #F1EDE3;
    font-size: 0.68rem;
    font-weight: 700;
    color: #8C8070;
    text-transform: uppercase;
    letter-spacing: 0.7px;
  }

  .bh-export-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 15px;
    cursor: pointer;
    border-bottom: 1px solid #F9F7F2;
    transition: background 0.12s ease;
    text-decoration: none;
  }
  .bh-export-option:last-child { border-bottom: none; }
  .bh-export-option:hover { background: #FBF8F4; }
  .bh-export-option:hover .exp-icon { transform: scale(1.08); }

  .exp-icon {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }
  .exp-icon.csv  { background: #f0fdf4; color: #16a34a; }
  .exp-icon.pdf  { background: #fef2f2; color: var(--maroon); }

  .exp-label { font-weight: 700; font-size: 0.85rem; color: #2A2118; font-family: 'DM Sans', sans-serif; }
  .exp-desc  { font-size: 0.72rem; color: #8C8070; font-family: 'DM Sans', sans-serif; margin-top: 1px; }

  /* ════════════════════════════════════════════
     MOBILE CARD LAYOUT
     ════════════════════════════════════════════ */
  .bh-mobile-cards { display: none; }

  @media (max-width: 640px) {
    .bh-table-wrap { display: none; }
    .bh-mobile-cards { display: block; }
    .bh-tab { padding: 9px 14px; font-size: 0.82rem; }
    .bh-chip { padding: 5px 10px; font-size: 0.75rem; }
    .bh-toolbar-actions { flex-wrap: wrap; }
    .bh-export-menu { right: auto; left: 0; }
  }

  .bh-record-card {
    background: #fff;
    border: 1px solid #E8E2D7;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: box-shadow 0.15s ease;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .bh-record-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .bh-record-card.overdue { border-left: 3px solid #b91c1c; }
  .bh-record-card.selected { background: #eff6ff; border-color: #bfdbfe; }

  .bh-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 10px;
    min-width: 0;
  }
  .bh-card-title {
    font-weight: 700;
    font-size: 0.9rem;
    color: #2A2118;
    line-height: 1.35;
    flex: 1;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
    min-width: 0;
  }
  .bh-card-title.overdue { color: #b91c1c; }

  .bh-card-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .bh-card-field-label {
    font-size: 0.63rem;
    font-weight: 700;
    color: #8C8070;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .bh-card-field-value {
    font-size: 0.82rem;
    color: #2A2118;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .bh-card-footer {
    border-top: 1px solid #F1EDE3;
    margin-top: 10px;
    padding-top: 9px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .bh-card-borrower {
    font-size: 0.8rem;
    color: #6B5F52;
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
`;

const cardStyle = {
  background: '#ffffff',
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 16,
  padding: '24px',
};

/* ─── Helpers ─── */
function isMigrationError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    msg.includes('book_copies') || msg.includes('copy_id') ||
    msg.includes('schema cache') || msg.includes('fines') ||
    msg.includes('fine_id') || msg.includes('does not exist') ||
    error.code === '42P01' || error.code === 'PGRST200'
  );
}

/**
 * Format a date string as YYYY-MM-DD so Excel never auto-converts it
 * to a date serial and then displays "####" in narrow columns.
 */
function fmtDateISO(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function SectionHeading({ children, style }) {
  return (
    <h3 style={{
      margin: 0,
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: 18,
      fontWeight: 600,
      color: PALETTE.text,
      letterSpacing: '-0.2px',
      ...style,
    }}>
      {children}
    </h3>
  );
}

function StatusBadge({ status, overdue }) {
  const map = {
    overdue:  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'OVERDUE' },
    borrowed: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'BORROWED' },
    returned: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'RETURNED' },
    pending:  { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'PENDING' },
    archived: { bg: PALETTE.ivoryDk, color: PALETTE.muted, border: PALETTE.border, label: 'ARCHIVED' },
  };
  const key = overdue ? 'overdue' : (status || 'pending');
  const s = map[key] || map.pending;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 9px',
      borderRadius: 6,
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.4px',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

function AccessionCell({ item }) {
  if (item.book_copies?.accession_id) {
    return (
      <div>
        <code style={{
          background: '#eef2ff', color: '#6366f1',
          padding: '2px 8px', borderRadius: 5,
          fontSize: '0.76rem', fontFamily: 'monospace',
          fontWeight: 600,
        }}>
          {item.book_copies.accession_id}
        </code>
        <div style={{ fontSize: '0.7rem', color: PALETTE.muted, marginTop: 2 }}>
          Copy #{item.book_copies.copy_number}
        </div>
      </div>
    );
  }
  return (
    <span style={{ color: PALETTE.muted, fontSize: '0.82rem', fontStyle: 'italic' }}>
      {item.books?.accession_num || '—'}
    </span>
  );
}

/* ─── Export Dropdown ─── */
function ExportDropdown({ onCSV, onPDF, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOut(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOut);
    return () => document.removeEventListener('mousedown', handleOut);
  }, []);

  return (
    <div className="bh-export-wrap" ref={ref}>
      <button
        className={`bh-export-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
        disabled={disabled}
      >
        <FaDownload size={12} />
        Export
        <FaChevronDown size={10} className="chevron" />
      </button>

      {open && (
        <div className="bh-export-menu">
          <div className="bh-export-header">Choose format</div>

          {/* CSV */}
          <div
            className="bh-export-option"
            onClick={() => { setOpen(false); onCSV(); }}
          >
            <div className="exp-icon csv"><FaFileCsv size={16} /></div>
            <div>
              <div className="exp-label">Export as CSV</div>
              <div className="exp-desc">Spreadsheet-ready · Excel &amp; Google Sheets</div>
            </div>
          </div>

          {/* PDF */}
          <div
            className="bh-export-option"
            onClick={() => { setOpen(false); onPDF(); }}
          >
            <div className="exp-icon pdf"><FaFilePdf size={15} /></div>
            <div>
              <div className="exp-label">Export as PDF</div>
              <div className="exp-desc">Printable report · formatted table</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Mobile Record Card ─── */
function RecordCard({ item, selected, onToggle, selectedStudent, selectedAccession, isOverdueFn, getFineAmt, computeFine, getBorrowerName, getBorrowerContact, isWalkIn }) {
  const overdue = isOverdueFn(item);
  const fineAmt = getFineAmt(item);

  return (
    <div
      className={`bh-record-card ${overdue ? 'overdue' : ''} ${selected ? 'selected' : ''}`}
      onClick={() => onToggle(item.id)}
    >
      <div className="bh-card-header">
        <div className="bh-card-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(item.id)}
            onClick={e => e.stopPropagation()}
            style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)', flexShrink: 0 }}
          />
          <span className={`bh-card-title ${overdue ? 'overdue' : ''}`}>
            {item.books?.title || '—'}
            {overdue && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.68rem', color: '#b91c1c', marginLeft: 6 }}>
                <FaExclamationTriangle size={9} /> Overdue
              </span>
            )}
          </span>
        </div>
        <StatusBadge status={item.status} overdue={overdue} />
      </div>

      <div className="bh-card-grid">
        <div>
          <div className="bh-card-field-label">Borrow date</div>
          <div className="bh-card-field-value" style={{ color: PALETTE.textSoft, fontWeight: 400 }}>
            {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : '—'}
          </div>
        </div>

        <div>
          <div className="bh-card-field-label">{item.return_date ? 'Returned' : 'Due date'}</div>
          <div className="bh-card-field-value" style={{ color: overdue ? '#b91c1c' : PALETTE.textSoft, fontWeight: overdue ? 700 : 400 }}>
            {item.return_date
              ? new Date(item.return_date).toLocaleDateString()
              : item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
          </div>
        </div>

        <div>
          <div className="bh-card-field-label">Accession</div>
          <AccessionCell item={item} />
        </div>

        <div>
          <div className="bh-card-field-label">Fine</div>
          <div className="bh-card-field-value">
            {fineAmt > 0
              ? <span style={{ color: '#b91c1c', fontWeight: 700 }}>₱{fineAmt.toFixed(2)}</span>
              : overdue
                ? <span style={{ color: '#e11d48', fontStyle: 'italic', fontSize: '0.78rem' }}>~₱{computeFine(item.due_date).toFixed(2)}</span>
                : <span style={{ color: PALETTE.border }}>—</span>
            }
          </div>
        </div>
      </div>

      {(!selectedStudent && !selectedAccession || getBorrowerContact(item)) && (
        <div className="bh-card-footer">
          {!selectedStudent && (
            <div className="bh-card-borrower">
              <span style={{ fontWeight: 600, color: PALETTE.text }}>
                {getBorrowerName(item)}
              </span>
              {isWalkIn(item) && (
                <span style={{ fontSize: '0.6rem', background: '#fffbeb', color: '#92400e', padding: '1px 6px', borderRadius: 10, fontWeight: 700, border: '1px solid #fde68a' }}>
                  Walk-in
                </span>
              )}
            </div>
          )}
          {getBorrowerContact(item) && (
            <div style={{ fontSize: '0.72rem', color: PALETTE.muted }}>
              📞 {getBorrowerContact(item)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Mobile Archived Card ─── */
function ArchivedCard({ item, selected, onToggle, getBorrowerName, getBorrowerContact, isWalkIn, getFineAmt }) {
  const fineAmt = getFineAmt(item);
  return (
    <div
      className={`bh-record-card ${selected ? 'selected' : ''}`}
      onClick={() => onToggle(item.id)}
    >
      <div className="bh-card-header">
        <div className="bh-card-check">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(item.id)}
            onClick={e => e.stopPropagation()}
            style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)', flexShrink: 0 }}
          />
          <span className="bh-card-title">{item.books?.title || '—'}</span>
        </div>
        <StatusBadge status="archived" />
      </div>

      <div className="bh-card-grid">
        <div>
          <div className="bh-card-field-label">Borrow date</div>
          <div className="bh-card-field-value" style={{ color: PALETTE.textSoft, fontWeight: 400 }}>
            {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : '—'}
          </div>
        </div>
        <div>
          <div className="bh-card-field-label">Returned</div>
          <div className="bh-card-field-value" style={{ color: PALETTE.textSoft, fontWeight: 400 }}>
            {item.return_date ? new Date(item.return_date).toLocaleDateString() : '—'}
          </div>
        </div>
        <div>
          <div className="bh-card-field-label">Accession</div>
          <AccessionCell item={item} />
        </div>
        <div>
          <div className="bh-card-field-label">Fine</div>
          <div className="bh-card-field-value">
            {fineAmt > 0
              ? <span style={{ color: '#b91c1c', fontWeight: 700 }}>₱{fineAmt.toFixed(2)}</span>
              : <span style={{ color: PALETTE.border }}>—</span>
            }
          </div>
        </div>
      </div>

      {(!!(getBorrowerName(item)) || getBorrowerContact(item)) && (
        <div className="bh-card-footer">
          <div className="bh-card-borrower">
            <span style={{ fontWeight: 600, color: PALETTE.text }}>{getBorrowerName(item)}</span>
            {isWalkIn(item) && (
              <span style={{ fontSize: '0.6rem', background: '#fffbeb', color: '#92400e', padding: '1px 6px', borderRadius: 10, fontWeight: 700, border: '1px solid #fde68a' }}>Walk-in</span>
            )}
          </div>
          {getBorrowerContact(item) && (
            <div style={{ fontSize: '0.72rem', color: PALETTE.muted }}>📞 {getBorrowerContact(item)}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function BorrowingHistory() {
  const [searchQuery, setSearchQuery]           = useState('');
  const [students, setStudents]                 = useState([]);
  const [accessionResults, setAccessionResults] = useState([]); // ← NEW: book-copy search hits
  const [selectedStudent, setSelectedStudent]   = useState(null);
  const [selectedAccession, setSelectedAccession] = useState(null); // ← NEW: active accession filter
  const [history, setHistory]                   = useState([]);
  const [recentGlobalHistory, setRecentGlobalHistory] = useState([]);
  const [archivedHistory, setArchivedHistory]   = useState([]);
  const [loading, setLoading]                   = useState(false);
  const [activeFilter, setActiveFilter]         = useState('all');
  const [activeTab, setActiveTab]               = useState('active');
  const [selectedIds, setSelectedIds]           = useState(new Set());
  const [actionLoading, setActionLoading]       = useState(false);
  const [toast, setToast]                       = useState({ message: '', type: 'success' });
  const [confirmModal, setConfirmModal]         = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, danger: false, confirmText: 'Confirm' });
  const [finePolicy, setFinePolicy]             = useState({ fine_amount: 5, fine_increment_type: 'per_day' });
  const [infoPopover, setInfoPopover]           = useState(null);
  const popoverRef = useRef(null);

  const openConfirm = (opts) => setConfirmModal({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmModal(m => ({ ...m, isOpen: false }));
  const showToast = (message, type = 'success') => setToast({ message, type });

  const getFineAmount = (item) => {
    if (Array.isArray(item.fines) && item.fines.length > 0) return Number(item.fines[0].amount) || 0;
    return item.fine_amount != null ? Number(item.fine_amount) : 0;
  };

  const computeFine = (dueDate) => {
    if (!dueDate) return 0;
    const ms = Date.now() - new Date(dueDate).getTime();
    if (ms <= 0) return 0;
    const units = finePolicy.fine_increment_type === 'per_hour'
      ? Math.ceil(ms / (60 * 60 * 1000))
      : Math.ceil(ms / (24 * 60 * 60 * 1000));
    return units * (finePolicy.fine_amount ?? 5);
  };

  const isOverdue = (item) =>
    item.status === 'borrowed' && item.due_date && new Date(item.due_date) < new Date();

  useEffect(() => {
    fetchFinePolicy();
    fetchRecentGlobalHistory();
    fetchArchivedHistory();
    const onVisible = () => { if (!document.hidden) { fetchRecentGlobalHistory(); fetchArchivedHistory(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setInfoPopover(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) searchAll();
    else { setStudents([]); setAccessionResults([]); }
  }, [searchQuery]);

  /* ── Data Fetchers ── */
  async function fetchFinePolicy() {
    const { data } = await localDbAdmin.from('fine_policy').select('fine_amount, fine_increment_type').limit(1).maybeSingle();
    if (data) setFinePolicy({ fine_amount: data.fine_amount ?? 5, fine_increment_type: data.fine_increment_type || 'per_day' });
  }

  const TX_SELECT = `id, status, borrow_date, due_date, return_date,
    walk_in_name, walk_in_lrn, walk_in_grade_section, walk_in_contact, walk_in_employee_id, walk_in_position, walk_in_teacher,
    users (name, student_id, lrn, grade_section),
    books (title, accession_num),
    book_copies (accession_id, copy_number),
    fines (id, amount, status, overdue_days)`;

  const TX_SELECT_FALLBACK = `id, status, borrow_date, due_date, return_date, fine_amount,
    walk_in_name, walk_in_lrn, walk_in_grade_section, walk_in_contact, walk_in_employee_id, walk_in_position, walk_in_teacher,
    users (name, student_id, lrn, grade_section), books (title, accession_num)`;

  async function fetchRecentGlobalHistory() {
    setLoading(true);
    let { data, error } = await localDbAdmin.from('transactions').select(TX_SELECT).neq('status', 'archived').order('created_at', { ascending: false }).limit(200);
    if (error && isMigrationError(error)) ({ data, error } = await localDbAdmin.from('transactions').select(TX_SELECT_FALLBACK).neq('status', 'archived').order('created_at', { ascending: false }).limit(200));
    if (error) console.error(error);
    setRecentGlobalHistory(data || []);
    setLoading(false);
  }

  async function fetchArchivedHistory() {
    let { data, error } = await localDbAdmin.from('transactions').select(TX_SELECT).eq('status', 'archived').order('created_at', { ascending: false });
    if (error && isMigrationError(error)) ({ data, error } = await localDbAdmin.from('transactions').select(TX_SELECT_FALLBACK).eq('status', 'archived').order('created_at', { ascending: false }));
    if (error) console.error(error);
    setArchivedHistory(data || []);
  }

  /**
   * searchAll — runs two parallel queries:
   *   1. Users (students + teachers) matched by name
   *   2. Book copies matched by accession_id (barcode)
   */
  async function searchAll() {
    const [userRes, copyRes] = await Promise.all([
      localDb
        .from('users')
        .select('id, name, student_id, course_year, role')
        .ilike('name', `%${searchQuery}%`)
        .in('role', ['student', 'teacher'])
        .limit(5),
      localDbAdmin
        .from('book_copies')
        .select('id, accession_id, copy_number, books(title, accession_num)')
        .ilike('accession_id', `%${searchQuery}%`)
        .limit(5),
    ]);
    setStudents(userRes.data || []);
    setAccessionResults(copyRes.data || []);
  }

  async function fetchHistory(student) {
    setLoading(true);
    setSelectedStudent(student);
    setSelectedAccession(null);
    setSearchQuery('');
    setStudents([]);
    setAccessionResults([]);
    let { data, error } = await localDbAdmin.from('transactions').select(TX_SELECT).eq('user_id', student.id).order('created_at', { ascending: false });
    if (error && isMigrationError(error)) ({ data, error } = await localDbAdmin.from('transactions').select(TX_SELECT_FALLBACK).eq('user_id', student.id).order('created_at', { ascending: false }));
    if (error) console.error(error);
    setHistory(data || []);
    setLoading(false);
  }

  /**
   * fetchHistoryByAccession — loads ALL non-archived transactions
   * and filters to those matching the selected book copy's accession_id.
   * This ensures records beyond the 200-row global cache are included.
   */
  async function fetchHistoryByAccession(copy) {
    setLoading(true);
    setSelectedAccession(copy);
    setSelectedStudent(null);
    setSearchQuery('');
    setStudents([]);
    setAccessionResults([]);

    let { data, error } = await localDbAdmin
      .from('transactions')
      .select(TX_SELECT)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error && isMigrationError(error)) {
      ({ data, error } = await localDbAdmin
        .from('transactions')
        .select(TX_SELECT_FALLBACK)
        .neq('status', 'archived')
        .order('created_at', { ascending: false }));
    }

    if (error) console.error(error);

    // Client-side filter: match by accession_id or fall back to accession_num
    const filtered = (data || []).filter(item =>
      item.book_copies?.accession_id === copy.accession_id ||
      item.books?.accession_num === copy.accession_id
    );

    setHistory(filtered);
    setLoading(false);
  }

  /* ── Selection ── */
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = (rows) => {
    if (rows.every(r => selectedIds.has(r.id))) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(r => r.id)));
  };

  /* ── Actions ── */
  const handleArchiveSelected = () => {
    if (!selectedIds.size) return;
    openConfirm({ title: 'Archive Records', message: `Archive ${selectedIds.size} record(s)? They'll move to Archived tab.`, confirmText: 'Archive', danger: false, onConfirm: async () => { closeConfirm(); await _doArchive(); } });
  };
  const _doArchive = async () => {
    setActionLoading(true);
    let failed = 0;
    for (const id of selectedIds) { const { error } = await localDbAdmin.from('transactions').update({ status: 'archived' }).eq('id', id); if (error) failed++; }
    setSelectedIds(new Set()); await fetchRecentGlobalHistory(); await fetchArchivedHistory(); setActionLoading(false);
    failed > 0 ? showToast(`${failed} record(s) failed.`, 'error') : showToast(`${selectedIds.size || 'Selected'} record(s) archived.`, 'success');
  };

  const handleUnarchiveSelected = () => {
    if (!selectedIds.size) return;
    openConfirm({ title: 'Restore Records', message: `Restore ${selectedIds.size} record(s) to active history?`, confirmText: 'Restore', danger: false, onConfirm: async () => { closeConfirm(); await _doUnarchive(); } });
  };
  const _doUnarchive = async () => {
    setActionLoading(true);
    let failed = 0;
    for (const id of selectedIds) { const { error } = await localDbAdmin.from('transactions').update({ status: 'returned' }).eq('id', id); if (error) failed++; }
    setSelectedIds(new Set()); await fetchRecentGlobalHistory(); await fetchArchivedHistory(); setActionLoading(false);
    failed > 0 ? showToast(`${failed} failed.`, 'error') : showToast('Records restored.', 'success');
  };

  const handleDeleteSelected = () => {
    if (!selectedIds.size) return;
    openConfirm({ title: 'Permanently Delete', message: `Delete ${selectedIds.size} record(s)? This cannot be undone.`, confirmText: 'Delete Forever', danger: true, onConfirm: async () => { closeConfirm(); await _doDelete(); } });
  };
  const _doDelete = async () => {
    setActionLoading(true);
    let failed = 0;
    for (const id of selectedIds) { const { error } = await localDbAdmin.from('transactions').delete().eq('id', id); if (error) failed++; }
    setSelectedIds(new Set()); await fetchArchivedHistory(); setActionLoading(false);
    failed > 0 ? showToast(`${failed} failed.`, 'error') : showToast('Records deleted permanently.', 'success');
  };

  /* ── Display ── */
  const getDisplayData = () => {
    // Use filtered history when a student OR an accession is selected
    const base = (selectedStudent || selectedAccession) ? history : recentGlobalHistory;
    if (activeFilter === 'active')   return base.filter(i => i.status === 'borrowed');
    if (activeFilter === 'returned') return base.filter(i => i.status === 'returned');
    if (activeFilter === 'overdue')  return base.filter(i => isOverdue(i));
    if (activeFilter === 'pending')  return base.filter(i => i.status === 'pending');
    return base;
  };

  const displayData = getDisplayData();
  const baseData = (selectedStudent || selectedAccession) ? history : recentGlobalHistory;
  const activeLoansCount = baseData.filter(i => i.status === 'borrowed').length;
  const overdueCount     = baseData.filter(i => isOverdue(i)).length;

  const PAGE_SIZE = 20;
  const [activePage,   setActivePage]   = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);

  useEffect(() => { setActivePage(1); },   [activeFilter, activeTab, selectedStudent, selectedAccession]);
  useEffect(() => { setArchivedPage(1); }, [activeTab]);

  const activeTotal   = displayData.length;
  const activeTotalPg = Math.ceil(activeTotal / PAGE_SIZE);
  const pagedDisplay  = displayData.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  const archTotal   = archivedHistory.length;
  const archTotalPg = Math.ceil(archTotal / PAGE_SIZE);
  const pagedArch   = archivedHistory.slice((archivedPage - 1) * PAGE_SIZE, archivedPage * PAGE_SIZE);

  function getBorrowerName(item)    { return item.users?.name || item.walk_in_name || '—'; }
  function getBorrowerContact(item) { return item.walk_in_contact || null; }
  function isWalkIn(item)           { return !item.users?.name && !!item.walk_in_name; }

  /* ── Exports ── */
  const downloadPDF = (data, title, fileName) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.setTextColor(30, 58, 138);
      doc.text(title, 14, 20);
      doc.setFontSize(10); doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      const cols = ['Student', 'Book', 'Copy / Accession ID', 'Status', 'Due Date', 'Overdue', 'Fine (PHP)'];
      const rows = data.map(item => {
        const overdue = isOverdue(item);
        const fineAmt = getFineAmount(item);
        return [
          item.users?.name || selectedStudent?.name || 'Unknown',
          item.books?.title || 'Untitled',
          item.book_copies?.accession_id ? `${item.book_copies.accession_id} (Copy #${item.book_copies.copy_number})` : item.books?.accession_num || '—',
          item.status?.toUpperCase() || '-',
          fmtDateISO(item.due_date) || '—',
          overdue ? 'YES' : 'NO',
          fineAmt > 0 ? `PHP ${fineAmt.toFixed(2)}` : (overdue ? `~PHP ${computeFine(item.due_date).toFixed(2)}` : '—'),
        ];
      });
      autoTable(doc, {
        startY: 35,
        head: [cols],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [139, 0, 0] },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 22 },
          5: { cellWidth: 12 },
          6: { cellWidth: 20 },
        },
      });
      doc.save(fileName);
      showToast('PDF exported successfully.', 'success');
    } catch (err) { console.error(err); showToast('PDF export failed.', 'error'); }
  };

  const downloadCSV = (data, fileName) => {
    try {
      const headers = [
        'Student', 'Student ID', 'LRN',
        'Grade & Section', 'Walk-in',
        'Book Title', 'Accession ID', 'Copy #',
        'Status',
        'Borrow Date (YYYY-MM-DD)',
        'Due Date (YYYY-MM-DD)',
        'Return Date (YYYY-MM-DD)',
        'Overdue',
        'Fine (PHP)',
      ];

      const esc = (v) => {
        const s = v == null ? '' : String(v);
        return (s.includes(',') || s.includes('"') || s.includes('\n') || s.startsWith('=') || s.startsWith('+') || s.startsWith('-') || s.startsWith('@'))
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      };

      const rows = data.map(item => {
        const overdue = isOverdue(item);
        const fineAmt = getFineAmount(item);
        const fineValue = fineAmt > 0
          ? fineAmt.toFixed(2)
          : (overdue ? computeFine(item.due_date).toFixed(2) : '');

        return [
          item.users?.name || item.walk_in_name || '',
          item.users?.student_id || '',
          item.users?.lrn || item.walk_in_lrn || '',
          item.users?.grade_section || item.walk_in_grade_section || '',
          isWalkIn(item) ? 'Yes' : 'No',
          item.books?.title || '',
          item.book_copies?.accession_id || item.books?.accession_num || '',
          item.book_copies?.copy_number != null ? String(item.book_copies.copy_number) : '',
          item.status || '',
          fmtDateISO(item.borrow_date),
          fmtDateISO(item.due_date),
          fmtDateISO(item.return_date),
          overdue ? 'Yes' : 'No',
          fineValue,
        ].map(esc).join(',');
      });

      const csv = [headers.map(esc).join(','), ...rows].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = fileName; link.click();
      URL.revokeObjectURL(url);
      showToast('CSV exported successfully.', 'success');
    } catch (err) { console.error(err); showToast('CSV export failed.', 'error'); }
  };

  /* Shared card helper props */
  const cardHelpers = {
    isOverdueFn: isOverdue,
    getFineAmt: getFineAmount,
    computeFine,
    getBorrowerName,
    getBorrowerContact,
    isWalkIn,
    selectedStudent,
    selectedAccession,
  };

  // ── Dynamic export names ──
  const activeFileName = selectedStudent
    ? `${selectedStudent.name}_History`
    : selectedAccession
      ? `Accession_${selectedAccession.accession_id}_History`
      : 'Library_Activity';

  const activePDFTitle = selectedStudent
    ? `History: ${selectedStudent.name}`
    : selectedAccession
      ? `History: Accession ${selectedAccession.accession_id}${selectedAccession.books?.title ? ` — ${selectedAccession.books.title}` : ''}`
      : 'ShelfMaster Library Management System';

  /* ── Dropdown has results to show? ── */
  const hasDropdown = students.length > 0 || accessionResults.length > 0;

  /* ── Render ── */
  return (
    <div className="bh-root" style={{ background: PALETTE.ivory, minHeight: '100vh', padding: '32px 28px 56px' }}>
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

      {/* ── HEADER ── */}
      <header style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
              <FaClipboardList />
            </div>
            <h1 style={{ margin: 0, fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, color: 'var(--maroon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              Borrowing History
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: PALETTE.textSoft, paddingLeft: 52 }}>
            View, filter, and export all borrowing activity.
          </p>
        </div>

        {/* Stat badges */}
        <div style={{ display: 'flex', gap: 12 }}>
          {activeLoansCount > 0 && (
            <div className="bh-stat-badge" style={{ ...cardStyle, padding: '12px 20px', textAlign: 'center', animationDelay: '0.05s' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{activeLoansCount}</div>
              <div style={{ fontSize: '0.7rem', color: PALETTE.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Active Loans</div>
            </div>
          )}
          {overdueCount > 0 && (
            <div className="bh-stat-badge" style={{ ...cardStyle, padding: '12px 20px', textAlign: 'center', animationDelay: '0.15s', borderColor: '#fecaca' }}>
              <div style={{ fontSize: '1.7rem', fontWeight: 700, color: '#b91c1c', lineHeight: 1 }}>{overdueCount}</div>
              <div style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4 }}>Overdue</div>
            </div>
          )}
        </div>
      </header>

      {/* ── TABS ── */}
      <div style={{ borderBottom: `2px solid ${PALETTE.border}`, marginBottom: 24, display: 'flex', gap: 4 }}>
        {[
          { key: 'active',   icon: <FaClipboardList />, label: 'Active History', count: recentGlobalHistory.length },
          { key: 'archived', icon: <FaArchive />,       label: 'Archived',       count: archivedHistory.length },
        ].map(t => (
          <button
            key={t.key}
            className={`bh-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.key); setSelectedIds(new Set()); setActiveFilter('all'); }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t.icon} {t.label}
              <span style={{
                fontSize: '0.75rem', fontWeight: 700,
                padding: '1px 8px', borderRadius: 20,
                background: activeTab === t.key ? '#fef2f2' : PALETTE.ivoryDk,
                color: activeTab === t.key ? 'var(--maroon)' : PALETTE.muted,
              }}>
                {t.count}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* ══════ ACTIVE HISTORY TAB ══════ */}
      {activeTab === 'active' && (
        <div className="bh-fade">
          {/* ── Search ── */}
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <FaSearch style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: PALETTE.muted, fontSize: 14, zIndex: 1 }} />
            <input
              className="bh-search"
              type="text"
              placeholder="Search by student name or accession ID (barcode)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* ── Split dropdown: People + Book Copies ── */}
            {hasDropdown && (
              <div className="bh-dropdown" style={{ top: 'calc(100% + 6px)' }}>

                {/* ── People section ── */}
                {students.length > 0 && (
                  <>
                    <div className="bh-dropdown-section-header">
                      Students &amp; Teachers
                    </div>
                    {students.map(s => (
                      <div key={s.id} className="bh-dropdown-item" onClick={() => fetchHistory(s)}>
                        <div>
                          <span style={{ fontWeight: 600, color: PALETTE.text }}>{s.name}</span>
                          {s.student_id && <span style={{ color: PALETTE.muted, fontSize: '0.8rem', marginLeft: 6 }}>#{s.student_id}</span>}
                        </div>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                          background: s.role === 'teacher' ? '#FFF0F5' : '#F0FDF4',
                          color: s.role === 'teacher' ? 'var(--maroon)' : '#15803d',
                        }}>
                          {s.role}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {/* ── Book Copies (Accession ID) section ── */}
                {accessionResults.length > 0 && (
                  <>
                    <div className="bh-dropdown-section-header" style={{ borderTop: students.length > 0 ? `1px solid ${PALETTE.border}` : 'none' }}>
                      Book Copies · Accession ID
                    </div>
                    {accessionResults.map(copy => (
                      <div key={copy.id} className="bh-dropdown-item" onClick={() => fetchHistoryByAccession(copy)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          {/* Barcode icon badge */}
                          <div style={{
                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                            background: '#eef2ff', color: '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FaBarcode size={13} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <code style={{
                                background: '#eef2ff', color: '#6366f1',
                                padding: '1px 7px', borderRadius: 5,
                                fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700,
                              }}>
                                {copy.accession_id}
                              </code>
                              <span style={{ fontSize: '0.72rem', color: PALETTE.muted }}>Copy #{copy.copy_number}</span>
                            </div>
                            <div style={{
                              fontSize: '0.78rem', color: PALETTE.textSoft,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              maxWidth: 240, marginTop: 2,
                            }}>
                              {copy.books?.title || '—'}
                            </div>
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                          background: '#eef2ff', color: '#6366f1', flexShrink: 0, marginLeft: 6,
                        }}>
                          Copy
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { key: 'all',      label: 'All Records',  icon: <FaFilter size={10} /> },
              { key: 'active',   label: 'Active Loans', icon: <FaBookOpen size={10} /> },
              { key: 'returned', label: 'Returned',     icon: <FaCheckCircle size={10} /> },
              { key: 'pending',  label: 'Pending',      icon: <FaClock size={10} /> },
              { key: 'overdue',  label: 'Overdue',      icon: <FaExclamationTriangle size={10} /> },
            ].map(f => (
              <button
                key={f.key}
                className={`bh-chip ${activeFilter === f.key ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          {/* Card */}
          <div className="bh-rise" style={{ ...cardStyle, animationDelay: '0.1s' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                {/* ── Dynamic heading based on active filter mode ── */}
                {selectedStudent ? (
                  <SectionHeading>History — {selectedStudent.name}</SectionHeading>
                ) : selectedAccession ? (
                  <div>
                    <SectionHeading>
                      Accession{' '}
                      <code style={{ background: '#eef2ff', color: '#6366f1', padding: '1px 8px', borderRadius: 6, fontSize: '0.85em', fontFamily: 'monospace' }}>
                        {selectedAccession.accession_id}
                      </code>
                    </SectionHeading>
                    {selectedAccession.books?.title && (
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: PALETTE.muted, fontStyle: 'italic' }}>
                        {selectedAccession.books.title}
                        {selectedAccession.copy_number != null && ` · Copy #${selectedAccession.copy_number}`}
                      </p>
                    )}
                  </div>
                ) : (
                  <SectionHeading>Recent Library Activity</SectionHeading>
                )}
                <p style={{ margin: '3px 0 0', fontSize: 13, color: PALETTE.muted }}>
                  {displayData.length} record{displayData.length !== 1 ? 's' : ''} shown
                </p>
              </div>

              <div className="bh-toolbar-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {selectedIds.size > 0 && (
                  <button
                    className="bh-btn"
                    onClick={handleArchiveSelected}
                    disabled={actionLoading}
                    style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}
                  >
                    <FaArchive size={12} /> Archive {selectedIds.size}
                  </button>
                )}

                {/* Clear filter — works for both student and accession ── */}
                {(selectedStudent || selectedAccession) && (
                  <button
                    className="bh-btn"
                    onClick={() => {
                      setSelectedStudent(null);
                      setSelectedAccession(null);
                      setActiveFilter('all');
                      setSelectedIds(new Set());
                      fetchRecentGlobalHistory();
                    }}
                    style={{ background: PALETTE.ivoryDk, color: PALETTE.textSoft, border: `1px solid ${PALETTE.border}` }}
                  >
                    <MdClose size={13} /> Clear Filter
                  </button>
                )}

                {/* ── Unified Export Dropdown ── */}
                <ExportDropdown
                  disabled={displayData.length === 0}
                  onCSV={() => downloadCSV(displayData, `${activeFileName}.csv`)}
                  onPDF={() => openConfirm({
                    title: 'Export PDF',
                    message: `Export ${displayData.length} record${displayData.length !== 1 ? 's' : ''} as a PDF?\n\nFile: ${activeFileName}.pdf`,
                    confirmText: 'Export PDF',
                    danger: false,
                    onConfirm: () => { closeConfirm(); downloadPDF(displayData, activePDFTitle, `${activeFileName}.pdf`); },
                  })}
                />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: PALETTE.border, marginBottom: 0 }} />

            {/* Table / Cards */}
            {loading ? (
              <BookLoader inline message="Loading records" />
            ) : displayData.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: PALETTE.muted }}>
                <FaBook className="bh-empty-icon" style={{ fontSize: '2.8rem', opacity: 0.15, display: 'block', margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: PALETTE.text }}>No records found</p>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Try adjusting your filters or search.</p>
              </div>
            ) : (
              <>
                {/* ── DESKTOP TABLE ── */}
                <div className="bh-table-wrap">
                  <table className="bh-table">
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${PALETTE.ivoryDk}` }}>
                        <th style={th()}>
                          <input type="checkbox" style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)' }}
                            checked={displayData.length > 0 && displayData.every(r => selectedIds.has(r.id))}
                            onChange={() => toggleSelectAll(displayData)} />
                        </th>
                        {/* Hide Student column only when filtered to a specific student (not accession) */}
                        {!selectedStudent && <th style={th()}>Student</th>}
                        <th style={th()}>Book Title</th>
                        <th style={th()}>Copy / Accession</th>
                        <th style={{ ...th(), whiteSpace: 'nowrap' }}>Status</th>
                        <th style={th()}>Borrow Date</th>
                        <th style={th()}>Due Date</th>
                        <th style={th()}>Returned</th>
                        <th style={th()}>Fine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDisplay.map((item) => {
                        const overdue  = isOverdue(item);
                        const selected = selectedIds.has(item.id);
                        const fineAmt  = getFineAmount(item);
                        return (
                          <tr
                            key={item.id}
                            className="bh-tr"
                            style={{
                              borderBottom: `1px solid ${PALETTE.ivoryDk}`,
                              background: selected ? '#eff6ff' : overdue ? '#fff5f5' : 'transparent',
                            }}
                          >
                            <td style={td()}>
                              <input type="checkbox" checked={selected} onChange={() => toggleSelect(item.id)}
                                style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)' }} />
                            </td>

                            {!selectedStudent && (
                              <td style={td()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 600, color: PALETTE.text, fontSize: '0.88rem' }}>{getBorrowerName(item)}</span>
                                  {isWalkIn(item) && (
                                    <span style={{ fontSize: '0.62rem', background: '#fffbeb', color: '#92400e', padding: '1px 6px', borderRadius: 10, fontWeight: 700, border: '1px solid #fde68a' }}>Walk-in</span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setInfoPopover(infoPopover?.id === item.id ? null : { id: item.id, item, x: rect.left, y: rect.bottom + window.scrollY });
                                    }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: infoPopover?.id === item.id ? 'var(--maroon)' : PALETTE.border, lineHeight: 1, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                    title="View borrower info"
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--maroon)'}
                                    onMouseLeave={e => e.currentTarget.style.color = infoPopover?.id === item.id ? 'var(--maroon)' : PALETTE.border}
                                  >
                                    <FaInfoCircle size={12} />
                                  </button>
                                </div>
                                {getBorrowerContact(item) && (
                                  <div style={{ fontSize: '0.72rem', color: PALETTE.muted, marginTop: 2 }}>📞 {getBorrowerContact(item)}</div>
                                )}
                              </td>
                            )}

                            <td style={td()}>
                              <span style={{ fontWeight: overdue ? 700 : 500, color: overdue ? '#b91c1c' : PALETTE.text, fontSize: '0.87rem' }}>
                                {item.books?.title || '—'}
                              </span>
                              {overdue && (
                                <div style={{ fontSize: '0.68rem', color: '#b91c1c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <FaExclamationTriangle size={9} /> Overdue
                                </div>
                              )}
                            </td>

                            <td style={td()}><AccessionCell item={item} /></td>

                            <td style={{ ...td(), whiteSpace: 'nowrap' }}>
                              <StatusBadge status={item.status} overdue={overdue} />
                            </td>

                            <td style={{ ...td(), color: PALETTE.textSoft, fontSize: '0.83rem' }}>
                              {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : '—'}
                            </td>

                            <td style={{ ...td(), color: overdue ? '#b91c1c' : PALETTE.textSoft, fontSize: '0.83rem', fontWeight: overdue ? 600 : 400 }}>
                              {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                            </td>

                            <td style={{ ...td(), color: PALETTE.textSoft, fontSize: '0.83rem' }}>
                              {item.return_date ? new Date(item.return_date).toLocaleDateString() : '—'}
                            </td>

                            <td style={{ ...td(), whiteSpace: 'nowrap' }}>
                              {fineAmt > 0
                                ? <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.87rem' }}>₱{fineAmt.toFixed(2)}</span>
                                : overdue
                                  ? <span style={{ color: '#e11d48', fontSize: '0.78rem', fontStyle: 'italic' }}>~₱{computeFine(item.due_date).toFixed(2)}</span>
                                  : <span style={{ color: PALETTE.border }}>—</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination page={activePage} totalPages={activeTotalPg} total={activeTotal} pageSize={PAGE_SIZE} onPage={p => setActivePage(p)} />
                </div>

                {/* ── MOBILE CARDS ── */}
                <div className="bh-mobile-cards" style={{ paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${PALETTE.ivoryDk}` }}>
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)' }}
                      checked={pagedDisplay.length > 0 && pagedDisplay.every(r => selectedIds.has(r.id))}
                      onChange={() => toggleSelectAll(pagedDisplay)}
                    />
                    <span style={{ fontSize: '0.78rem', color: PALETTE.muted, fontWeight: 600 }}>
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all on page`}
                    </span>
                  </div>

                  {pagedDisplay.map(item => (
                    <RecordCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.has(item.id)}
                      onToggle={toggleSelect}
                      {...cardHelpers}
                    />
                  ))}
                  <Pagination page={activePage} totalPages={activeTotalPg} total={activeTotal} pageSize={PAGE_SIZE} onPage={p => setActivePage(p)} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════ ARCHIVED TAB ══════ */}
      {activeTab === 'archived' && (
        <div className="bh-fade">
          <div className="bh-rise" style={{ ...cardStyle, animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <SectionHeading>Archived Records</SectionHeading>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: PALETTE.muted }}>
                  Restore records or permanently delete them.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {selectedIds.size > 0 && (
                  <>
                    <button
                      className="bh-btn"
                      onClick={handleUnarchiveSelected}
                      disabled={actionLoading}
                      style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                    >
                      <FaRecycle size={12} /> Restore {selectedIds.size}
                    </button>
                    <button
                      className="bh-btn"
                      onClick={handleDeleteSelected}
                      disabled={actionLoading}
                      style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                    >
                      <FaTrash size={12} /> Delete {selectedIds.size}
                    </button>
                  </>
                )}
                <ExportDropdown
                  disabled={archivedHistory.length === 0}
                  onCSV={() => downloadCSV(archivedHistory, 'Archived_Records.csv')}
                  onPDF={() => openConfirm({
                    title: 'Export Archived PDF',
                    message: `Export ${archivedHistory.length} archived record(s) as a PDF?\n\nFile: Archived_Records.pdf`,
                    confirmText: 'Export PDF',
                    danger: false,
                    onConfirm: () => { closeConfirm(); downloadPDF(archivedHistory, 'ShelfMaster — Archived Records', 'Archived_Records.pdf'); },
                  })}
                />
              </div>
            </div>

            <div style={{ height: 1, background: PALETTE.border, marginBottom: 0 }} />

            {archivedHistory.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center', color: PALETTE.muted }}>
                <FaArchive style={{ fontSize: '2.8rem', opacity: 0.12, display: 'block', margin: '0 auto 14px' }} />
                <p style={{ margin: 0, fontWeight: 600, color: PALETTE.text }}>No archived records</p>
                <p style={{ margin: '4px 0 0', fontSize: 13 }}>Records you archive from Active History will appear here.</p>
              </div>
            ) : (
              <>
                {/* ── DESKTOP TABLE ── */}
                <div className="bh-table-wrap">
                  <table className="bh-table">
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${PALETTE.ivoryDk}` }}>
                        <th style={th()}>
                          <input type="checkbox" style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)' }}
                            checked={archivedHistory.length > 0 && archivedHistory.every(r => selectedIds.has(r.id))}
                            onChange={() => toggleSelectAll(archivedHistory)} />
                        </th>
                        <th style={th()}>Student</th>
                        <th style={th()}>Book Title</th>
                        <th style={th()}>Copy / Accession</th>
                        <th style={{ ...th(), whiteSpace: 'nowrap' }}>Status</th>
                        <th style={th()}>Borrow Date</th>
                        <th style={th()}>Returned</th>
                        <th style={{ ...th(), whiteSpace: 'nowrap' }}>Fine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedArch.map(item => {
                        const selected = selectedIds.has(item.id);
                        const fineAmt  = getFineAmount(item);
                        return (
                          <tr
                            key={item.id}
                            className="bh-tr"
                            style={{ borderBottom: `1px solid ${PALETTE.ivoryDk}`, background: selected ? '#eff6ff' : 'transparent' }}
                          >
                            <td style={td()}>
                              <input type="checkbox" checked={selected} onChange={() => toggleSelect(item.id)}
                                style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)' }} />
                            </td>
                            <td style={td()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, color: PALETTE.text, fontSize: '0.88rem' }}>{getBorrowerName(item)}</span>
                                {isWalkIn(item) && (
                                  <span style={{ fontSize: '0.62rem', background: '#fffbeb', color: '#92400e', padding: '1px 6px', borderRadius: 10, fontWeight: 700, border: '1px solid #fde68a' }}>Walk-in</span>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setInfoPopover(infoPopover?.id === item.id ? null : { id: item.id, item, x: rect.left, y: rect.bottom + window.scrollY });
                                  }}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: PALETTE.border, lineHeight: 1, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                  title="View borrower info"
                                  onMouseEnter={e => e.currentTarget.style.color = 'var(--maroon)'}
                                  onMouseLeave={e => e.currentTarget.style.color = PALETTE.border}
                                >
                                  <FaInfoCircle size={12} />
                                </button>
                              </div>
                              {getBorrowerContact(item) && (
                                <div style={{ fontSize: '0.72rem', color: PALETTE.muted, marginTop: 2 }}>📞 {getBorrowerContact(item)}</div>
                              )}
                            </td>
                            <td style={{ ...td(), color: PALETTE.text, fontSize: '0.87rem', fontWeight: 500 }}>{item.books?.title || '—'}</td>
                            <td style={td()}><AccessionCell item={item} /></td>
                            <td style={{ ...td(), whiteSpace: 'nowrap' }}><StatusBadge status="archived" /></td>
                            <td style={{ ...td(), color: PALETTE.textSoft, fontSize: '0.83rem' }}>
                              {item.borrow_date ? new Date(item.borrow_date).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ ...td(), color: PALETTE.textSoft, fontSize: '0.83rem' }}>
                              {item.return_date ? new Date(item.return_date).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ ...td(), whiteSpace: 'nowrap' }}>
                              {fineAmt > 0
                                ? <span style={{ color: '#b91c1c', fontWeight: 700, fontSize: '0.87rem' }}>₱{fineAmt.toFixed(2)}</span>
                                : <span style={{ color: PALETTE.border }}>—</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination page={archivedPage} totalPages={archTotalPg} total={archTotal} pageSize={PAGE_SIZE} onPage={p => setArchivedPage(p)} />
                </div>

                {/* ── MOBILE CARDS (Archived) ── */}
                <div className="bh-mobile-cards" style={{ paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${PALETTE.ivoryDk}` }}>
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer', width: 14, height: 14, accentColor: 'var(--maroon)' }}
                      checked={pagedArch.length > 0 && pagedArch.every(r => selectedIds.has(r.id))}
                      onChange={() => toggleSelectAll(pagedArch)}
                    />
                    <span style={{ fontSize: '0.78rem', color: PALETTE.muted, fontWeight: 600 }}>
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all on page'}
                    </span>
                  </div>

                  {pagedArch.map(item => (
                    <ArchivedCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.has(item.id)}
                      onToggle={toggleSelect}
                      getBorrowerName={getBorrowerName}
                      getBorrowerContact={getBorrowerContact}
                      isWalkIn={isWalkIn}
                      getFineAmt={getFineAmount}
                    />
                  ))}
                  <Pagination page={archivedPage} totalPages={archTotalPg} total={archTotal} pageSize={PAGE_SIZE} onPage={p => setArchivedPage(p)} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Borrower Info Popover ── */}
      {infoPopover && (() => {
        const item = infoPopover.item;
        const walkin   = isWalkIn(item);
        const name     = walkin ? item.walk_in_name          : item.users?.name;
        const lrn      = walkin ? item.walk_in_lrn           : (item.users?.lrn || item.users?.student_id);
        const section  = walkin ? item.walk_in_grade_section : item.users?.grade_section;
        const contact  = item.walk_in_contact || null;
        const position = item.walk_in_position || null;
        const empId    = item.walk_in_employee_id || null;
        const adviser  = item.walk_in_teacher || null;

        const InfoRow = ({ label, value }) => value ? (
          <div>
            <div style={{ fontSize: '0.67rem', fontWeight: 700, color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>{label}</div>
            <div style={{ color: PALETTE.text, fontWeight: 500, wordBreak: 'break-word' }}>{value}</div>
          </div>
        ) : null;

        return (
          <div
            ref={popoverRef}
            className="bh-popover"
            style={{
              top: Math.min(infoPopover.y + 8, window.innerHeight - 280),
              left: Math.min(infoPopover.x, window.innerWidth - 300),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${PALETTE.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>
                  <FaInfoCircle />
                </div>
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: '0.9rem', color: PALETTE.text }}>Borrower Info</span>
                {walkin && (
                  <span style={{ fontSize: '0.6rem', background: '#fffbeb', color: '#92400e', padding: '1px 7px', borderRadius: 10, fontWeight: 700, border: '1px solid #fde68a' }}>Walk-in</span>
                )}
              </div>
              <button onClick={() => setInfoPopover(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: PALETTE.muted, padding: '2px', lineHeight: 1, display: 'flex' }}>
                <MdClose size={15} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Name" value={name} />
              <InfoRow label="LRN / Student ID" value={lrn} />
              {empId && <InfoRow label="Employee ID" value={empId} />}
              <InfoRow label="Grade & Section" value={section} />
              <InfoRow label="Position" value={position} />
              <InfoRow label="Adviser / Teacher" value={adviser} />
              {contact && (
                <div style={{ borderTop: `1px solid ${PALETTE.ivoryDk}`, paddingTop: 10 }}>
                  <div style={{ fontSize: '0.67rem', fontWeight: 700, color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Contact</div>
                  <div style={{ color: PALETTE.text, fontWeight: 600 }}>📞 {contact}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
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

/* ── Style helpers ── */
function th() {
  return {
    padding: '13px 14px',
    textAlign: 'left',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: PALETTE.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.6px',
    fontFamily: "'DM Sans', sans-serif",
  };
}
function td() {
  return { padding: '13px 14px', verticalAlign: 'middle' };
}