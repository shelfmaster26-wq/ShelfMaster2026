import React, { useState, useEffect, useRef, useMemo } from 'react';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import BookLoader from './BookLoader';
import { getBaseURL } from './connectionManager';
import ConfirmModal from './ConfirmModal';

function apiUrl(path) {
  const base = getBaseURL();
  return base ? base.replace(/\/$/, '') + path : path;
}
import BarcodeLabel, { generateBarcode, generateCopyAccessionId } from './BarcodeLabel';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import Toast from './Toast';
import { FaArchive, FaBookOpen, FaChartBar, FaCheck, FaCheckCircle, FaExclamationTriangle, FaFileAlt, FaLink, FaRecycle, FaSearch, FaStar, FaTag, FaTrash, FaBook, FaDownload, FaEdit, FaPlus, FaChevronDown, FaChevronUp, FaRedo } from 'react-icons/fa';
import { MdTabletMac } from 'react-icons/md';

/* ─────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .inv-root { font-family: 'DM Sans', sans-serif; }
  .inv-root *, .inv-root *::before, .inv-root *::after { box-sizing: border-box; }

  /* ── Tab pills ── */
  .inv-tab {
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
  .inv-tab:active { transform: scale(0.97); }

  /* ── Table wrapper — always scrollable ── */
  .inv-table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #D4C9B8 transparent;
  }
  .inv-table-wrap::-webkit-scrollbar { height: 6px; }
  .inv-table-wrap::-webkit-scrollbar-track { background: transparent; }
  .inv-table-wrap::-webkit-scrollbar-thumb { background: #D4C9B8; border-radius: 3px; }

  /* ── Table cells — truncate long text, horizontal scroll reveals full content ── */
  .inv-cell-truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 0;
  }
  .inv-cell-truncate p,
  .inv-cell-truncate span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Table rows ── */
  .inv-tr { transition: background 0.12s ease; cursor: default; }
  .inv-tr:hover { background: #FAF7F2 !important; }

  /* ── Action buttons ── */
  .inv-action-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 7px;
    font-size: 0.78rem; font-weight: 600;
    cursor: pointer; transition: all 0.15s ease;
    border: 1.5px solid transparent;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .inv-action-btn:hover { transform: translateY(-1px); }
  .inv-action-btn:active { transform: scale(0.97); }

  /* Primary btn */
  .inv-btn-primary { background: var(--green); color: white; border-color: var(--green); }
  .inv-btn-primary:hover { opacity: 0.88; box-shadow: 0 4px 14px rgba(125,179,86,0.35); }

  /* Maroon btn */
  .inv-btn-maroon { background: var(--maroon); color: white; border-color: var(--maroon); }
  .inv-btn-maroon:hover { opacity: 0.88; box-shadow: 0 4px 14px rgba(128,0,0,0.25); }

  /* Dark btn */
  .inv-btn-dark { background: #1E2A38; color: white; border-color: #1E2A38; }
  .inv-btn-dark:hover { background: #2D3E52; box-shadow: 0 4px 12px rgba(30,42,56,0.3); }

  /* Indigo btn */
  .inv-btn-indigo { background: #6366F1; color: white; border-color: #6366F1; }
  .inv-btn-indigo:hover { opacity: 0.88; box-shadow: 0 4px 14px rgba(99,102,241,0.3); }

  /* Ghost edit btn */
  .inv-btn-ghost-edit { background: #F4F1EC; color: #5A4E40; border-color: #E0D9CE; }
  .inv-btn-ghost-edit:hover { background: #ECE7DF; border-color: #C8BFAF; }

  /* Ghost archive btn */
  .inv-btn-ghost-archive { background: #FFF1F3; color: #C0143A; border-color: #FCC9D3; }
  .inv-btn-ghost-archive:hover { background: #FFE4E8; border-color: #F8A5B4; }

  /* Ghost restore btn */
  .inv-btn-ghost-restore { background: #EDFAF4; color: #137A4E; border-color: #A8EDD1; }
  .inv-btn-ghost-restore:hover { background: #D8F5E9; border-color: #72D4AE; }

  /* Ghost delete btn */
  .inv-btn-ghost-delete { background: #FFF1F1; color: #B91C1C; border-color: #FECACA; }
  .inv-btn-ghost-delete:hover { background: #FFE2E2; border-color: #FCA5A5; }

  /* Ghost expand btn */
  .inv-btn-ghost-expand { background: #F4F1EC; color: #4A3F32; border-color: #DDD7CC; }
  .inv-btn-ghost-expand:hover { background: #EAE5DC; }
  .inv-btn-ghost-expand.expanded { background: #2A2118; color: #F9F7F2; border-color: #2A2118; }

  /* ── Form inputs ── */
  .inv-input {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid #DDD7CC;
    border-radius: 9px;
    font-size: 0.88rem;
    font-family: 'DM Sans', sans-serif;
    color: #2A2118;
    background: white;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
    outline: none;
  }
  .inv-input:focus { border-color: var(--maroon); box-shadow: 0 0 0 3px rgba(128,0,0,0.08); }
  .inv-input::placeholder { color: #B5A99A; }

  select.inv-input {
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238C8070' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
    cursor: pointer;
  }

  /* ── Modal slide-up ── */
  @keyframes inv-slideup {
    from { opacity: 0; transform: translateY(28px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .inv-modal { animation: inv-slideup 0.3s cubic-bezier(0.22,1,0.36,1) both; }

  /* ── Copies expand slide ── */
  @keyframes inv-expandin {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .inv-expand-panel { animation: inv-expandin 0.25s ease both; }

  /* ── eBook card ── */
  .inv-ebook-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: default;
  }
  .inv-ebook-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(42,33,24,0.12) !important;
  }

  /* ── Copy status badge ── */
  .inv-status { display: inline-block; padding: 3px 11px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap; }
  .inv-status-available { background: #EDFAF4; color: #137A4E; }
  .inv-status-borrowed  { background: #EEF2FF; color: #4338CA; }
  .inv-status-damaged   { background: #FFFBEB; color: #92400E; }
  .inv-status-lost      { background: #FFF1F1; color: #B91C1C; }

  /* ── Copy status select ── */
  .inv-copy-select {
    padding: 5px 32px 5px 10px;
    border: 1.5px solid #DDD7CC;
    border-radius: 7px;
    font-size: 0.78rem;
    font-family: 'DM Sans', sans-serif;
    background: white;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238C8070' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    min-width: 120px;
  }
  .inv-copy-select:focus { border-color: var(--maroon); }

  /* ── Drag zone ── */
  .inv-drop-zone {
    border: 2px dashed #C8BFAF;
    border-radius: 12px;
    padding: 28px 20px;
    text-align: center;
    cursor: pointer;
    background: #FAF8F4;
    transition: background 0.15s, border-color 0.15s;
  }
  .inv-drop-zone:hover, .inv-drop-zone.drag-over { background: #F0F9EA; border-color: var(--green); }

  /* ── Page header layout ── */
  .inv-page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    gap: 16px;
    flex-wrap: wrap;
  }

  /* ── Header action buttons ── */
  .inv-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  /* ── Tab bar ── */
  .inv-tabs {
    display: flex;
    gap: 6px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  /* ── Search bar row ── */
  .inv-search-bar {
    padding: 14px 20px;
    border-bottom: 1px solid #F1EDE3;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #FDFCF9;
    flex-wrap: wrap;
  }
  .inv-search-input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  /* ── Actions cell — never wraps awkwardly ── */
  .inv-actions-cell {
    padding: 10px 14px;
    white-space: nowrap;
  }
  .inv-actions-cell > div {
    display: flex;
    gap: 6px;
    flex-wrap: nowrap;
  }

  /* ── Copies inner table wrap ── */
  .inv-copies-table-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    scrollbar-color: #D4C9B8 transparent;
    border-radius: 10px;
  }
  .inv-copies-table-wrap::-webkit-scrollbar { height: 5px; }
  .inv-copies-table-wrap::-webkit-scrollbar-thumb { background: #D4C9B8; border-radius: 3px; }

  /* ─── RESPONSIVE BREAKPOINTS ─── */

  /* Medium screens (tablets ~900px) */
  @media (max-width: 900px) {
    .inv-root { padding: 24px 16px 48px !important; }
    .inv-tab { padding: 8px 16px; font-size: 0.82rem; gap: 5px; }
  }

  /* Small screens (phones ~640px) */
  @media (max-width: 640px) {
    .inv-root { padding: 16px 12px 40px !important; }

    .inv-page-header { gap: 12px; }
    .inv-header-actions { width: 100%; justify-content: flex-end; }

    /* Stack action buttons 2-per-row on phones */
    .inv-header-actions .inv-action-btn {
      flex: 1 1 calc(50% - 4px);
      justify-content: center;
      min-width: 0;
    }

    .inv-tabs { gap: 6px; }
    .inv-tab { padding: 7px 13px; font-size: 0.8rem; }

    /* Tighter search bar on mobile */
    .inv-search-bar { padding: 10px 14px; flex-wrap: nowrap; }

    /* Modal adjustments */
    .inv-modal { padding: 20px 18px !important; max-width: 100% !important; width: 100% !important; border-radius: 20px 20px 0 0 !important; }

    /* Copies panel header stacks */
    .inv-copies-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
    .inv-copies-header button { width: 100%; justify-content: center; }
  }

  /* Very small screens (<400px) */
  @media (max-width: 400px) {
    .inv-tab .inv-tab-count { display: none; }
    .inv-tab { padding: 6px 11px; font-size: 0.78rem; }
  }

  /* ── Table data cells truncate — horizontal scroll shows full content ── */
  td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ══════════════════════════════════════
     MOBILE CARD LAYOUT (Inventory)
  ══════════════════════════════════════ */
  .inv-mobile-cards { display: none; }

  @media (max-width: 640px) {
    .inv-table-wrap { display: none; }
    .inv-mobile-cards { display: block; }
  }

  .inv-record-card {
    background: #fff;
    border: 1px solid #E8E2D7;
    border-radius: 14px;
    padding: 14px 16px;
    margin-bottom: 10px;
    overflow: hidden;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .inv-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    gap: 8px;
    min-width: 0;
  }

  .inv-card-title {
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

  .inv-card-field-label {
    font-size: 0.63rem;
    font-weight: 700;
    color: #8C8070;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .inv-card-field-value {
    font-size: 0.82rem;
    color: #2A2118;
    font-weight: 500;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .inv-card-fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .inv-card-footer {
    border-top: 1px solid #F1EDE3;
    margin-top: 10px;
    padding-top: 9px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

/* ─────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────── */
const C = {
  ivory:    '#F9F7F2',
  ivoryDk:  '#F1EDE3',
  border:   '#E8E2D7',
  muted:    '#8C8070',
  text:     '#2A2118',
  textSoft: '#6B5F52' };

const MIGRATION_SQL =
`-- The Express server creates this table automatically when XAMPP MySQL is running.
-- If you prefer manual setup, import xampp_schema.sql in phpMyAdmin.

CREATE TABLE IF NOT EXISTS book_copies (
  id VARCHAR(36) PRIMARY KEY,
  book_id VARCHAR(36) NOT NULL,
  copy_number INT NOT NULL DEFAULT 1,
  accession_id VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'available',
  date_acquired DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (book_id),
  CONSTRAINT fk_book_copies_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);`;

const nullableNumberFields = ['pages', 'cost_price', 'quantity'];

function cleanBookPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (nullableNumberFields.includes(key)) {
        if (value === '' || value === null || value === undefined) return [key, null];
        const n = Number(value);
        return [key, Number.isFinite(n) ? n : null];
      }
      return [key, typeof value === 'string' ? value.trim() : value];
    })
  );
}

/* ── Utility: truncate text for display ── */
function truncate(str, max = 40) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('books');
  const [books, setBooks] = useState([]);
  const [ebooks, setEbooks] = useState([]);
  const [archivedBooks, setArchivedBooks] = useState([]);
  const [archivedSearch, setArchivedSearch] = useState('');
  const [booksSearch, setBooksSearch] = useState('');
  const [ebooksSearch, setEbooksSearch] = useState('');

  // Debounced search values
  const [debouncedBooksSearch, setDebouncedBooksSearch] = useState('');
  const [debouncedEbooksSearch, setDebouncedEbooksSearch] = useState('');
  const [debouncedArchivedSearch, setDebouncedArchivedSearch] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebouncedBooksSearch(booksSearch), 250); return () => clearTimeout(t); }, [booksSearch]);
  useEffect(() => { const t = setTimeout(() => setDebouncedEbooksSearch(ebooksSearch), 250); return () => clearTimeout(t); }, [ebooksSearch]);
  useEffect(() => { const t = setTimeout(() => setDebouncedArchivedSearch(archivedSearch), 250); return () => clearTimeout(t); }, [archivedSearch]);

  const [showModal, setShowModal] = useState(false);
  const [showEbookModal, setShowEbookModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);
  const [ebookForm, setEbookForm] = useState({ title: '', url: '' });
  const [ebookImgValid, setEbookImgValid] = useState(false);
  const [editingEbook, setEditingEbook] = useState(null);
  const [expandedBookId, setExpandedBookId] = useState(null);
  const [copiesMap, setCopiesMap] = useState({});
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, danger: false, confirmText: 'Confirm' });
  const openConfirm = (opts) => setConfirmModal({ isOpen: true, ...opts });
  const closeConfirm = () => setConfirmModal(m => ({ ...m, isOpen: false }));
  const showToast = (message, type = 'success') => setToast({ message, type });

  const PAGE_SIZE = 10;
  const [booksPage, setBooksPage] = useState(1);
  const [ebooksPage, setEbooksPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);

  const initialFormState = {
    accession_num: '', barcode: '', title: '', authors: '', quantity: 1,
    date_acquired: new Date().toISOString().split('T')[0], edition: '', pages: '',
    book_type: 'Hardbound', subject_class: '', cost_price: '', publisher: '',
    isbn: '', copyright: '', source: '', remark: '', status: 'active', cover_image: null };

  const [formData, setFormData] = useState(initialFormState);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [coverColAvailable, setCoverColAvailable] = useState(null);
  const coverInputRef = useRef(null);

  useEffect(() => { fetchInventory(); checkCoverColumn(); checkMigration(); prefetchAllCopies(); }, []);

  async function prefetchAllCopies() {
    const { data, error } = await localDbAdmin.from('book_copies').select('*').order('copy_number', { ascending: true });
    if (error || !data) return;
    const map = {};
    for (const copy of data) {
      if (!map[copy.book_id]) map[copy.book_id] = [];
      map[copy.book_id].push(copy);
    }
    setCopiesMap(map);
  }

  async function checkMigration() {
    const { error } = await localDbAdmin.from('book_copies').select('id').limit(1);
    const needed = error && (error.code === '42P01' || error.code === 'PGRST200' || (error.message || '').includes('book_copies') || (error.message || '').includes('schema cache'));
    setMigrationNeeded(needed); setMigrationChecked(true);
  }

  async function checkCoverColumn() {
    const { error } = await localDbAdmin.from('books').select('cover_image').limit(1);
    setCoverColAvailable(!error || error.code !== '42703');
  }

  async function fetchInventory() {
    const { data, error } = await localDb.from('books').select('*').neq('status', 'archived').order('created_at', { ascending: false });
    if (error) { console.error('Fetch error:', error); return; }
    const all = data || [];
    setBooks(all.filter(b => b.book_type !== 'eBook'));
    setEbooks(all.filter(b => b.book_type === 'eBook'));
    const { data: archived, error: archErr } = await localDb.from('books').select('*').eq('status', 'archived').order('created_at', { ascending: false });
    if (!archErr) setArchivedBooks(archived || []);
  }

  const handleDeleteForever = async (book) => {
    openConfirm({
      title: 'Permanently Delete Book', message: `Permanently delete "${book.title}"? This cannot be undone.`,
      confirmText: 'Delete', danger: true, onConfirm: async () => { closeConfirm(); await _doDeleteForever(book); } });
  };
  const _doDeleteForever = async (book) => {
    const { data: sessionData } = await localDb.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { showToast('Delete failed: please sign in again.', 'error'); return; }
    try {
      const response = await fetch(apiUrl(`/api/books/${book.id}`), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Delete failed.');
      fetchInventory(); showToast(`"${book.title}" permanently deleted.`, 'success');
    } catch (error) { showToast('Delete failed: ' + error.message, 'error'); }
  };

  const handleUnarchive = async (book) => {
    openConfirm({
      title: 'Restore Book', message: `Restore "${book.title}" to the active catalog?`,
      confirmText: 'Restore', danger: false, onConfirm: async () => { closeConfirm(); await _doUnarchive(book); } });
  };
  const _doUnarchive = async (book) => {
    const { data: sessionData } = await localDb.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { showToast('Restore failed: please sign in again.', 'error'); return; }
    try {
      const response = await fetch(apiUrl(`/api/books/${book.id}/unarchive`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Restore failed.');
      fetchInventory(); showToast(`"${book.title}" restored successfully.`, 'success');
    } catch (error) { showToast('Restore failed: ' + error.message, 'error'); }
  };

  async function getNextCopyNumber() {
    const { data, error } = await localDbAdmin.from('book_copies').select('accession_id').order('accession_id', { ascending: false }).limit(1);
    if (error) return 1;
    if (!data || data.length === 0) return 1;
    const parts = data[0].accession_id.split('-');
    return parseInt(parts[parts.length - 1]) + 1;
  }

  async function generateCopiesForBook(bookId, count, dateAcquired, startCopyNum = 1) {
    const nextNum = await getNextCopyNumber();
    const copies = Array.from({ length: count }, (_, i) => ({
      book_id: bookId, copy_number: startCopyNum + i,
      accession_id: generateCopyAccessionId(nextNum + i),
      status: 'available', date_acquired: dateAcquired || new Date().toISOString().split('T')[0] }));
    const { error } = await localDbAdmin.from('book_copies').insert(copies);
    if (error) throw error;
  }

  async function fetchCopiesForBook(bookId) {
    setCopiesLoading(true);
    const { data, error } = await localDbAdmin.from('book_copies').select('*').eq('book_id', bookId).order('copy_number', { ascending: true });
    if (!error) setCopiesMap(prev => ({ ...prev, [bookId]: data || [] }));
    setCopiesLoading(false);
  }

  const toggleExpandCopies = (bookId) => {
    if (expandedBookId === bookId) { setExpandedBookId(null); }
    else { setExpandedBookId(bookId); fetchCopiesForBook(bookId); }
  };

  const openAddModal = async () => {
    setIsEditing(false);
    const { data } = await localDb.from('books').select('accession_num').order('accession_num', { ascending: false }).limit(1);
    const lastNum = data && data[0] ? parseInt(data[0].accession_num) : 0;
    const nextAcc = (lastNum + 1).toString().padStart(5, '0');
    setFormData({ ...initialFormState, accession_num: nextAcc, barcode: generateBarcode(nextAcc) });
    setCoverFile(null); setCoverPreview(null); setShowModal(true);
  };

  const openEditModal = (book) => {
    setIsEditing(true); setCurrentBookId(book.id);
    setFormData({ ...book }); setCoverFile(null); setCoverPreview(book.cover_image || null); setShowModal(true);
  };

  const handleCoverChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'warning'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be 5 MB or less.', 'warning'); return; }
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
  };

  const handleArchive = async (book) => {
    openConfirm({
      title: 'Archive Book', message: `Archive "${book.title}"? It will be hidden from the catalog.`,
      confirmText: 'Archive', danger: false, onConfirm: async () => { closeConfirm(); await _doArchive(book); } });
  };
  const _doArchive = async (book) => {
    const { data: sessionData } = await localDb.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) { showToast('Archive failed: please sign in again.', 'error'); return; }
    try {
      const response = await fetch(apiUrl(`/api/books/${book.id}/archive`), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Archive failed.');
      fetchInventory(); showToast(`"${book.title}" archived successfully.`, 'success');
    } catch (error) { showToast('Archive failed: ' + error.message, 'error'); }
  };

  async function getSessionToken() {
    const { data: sessionData } = await localDb.auth.getSession();
    return sessionData?.session?.access_token;
  }

  async function requestJson(url, options = {}) {
    const token = await getSessionToken();
    if (!token) throw new Error('Please sign in again.');
    const response = await fetch(apiUrl(url), { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }

  const handleSaveBook = async (e) => {
    e.preventDefault(); setLoading(true);
    const parsedQty = parseInt(formData.quantity);
    if (!parsedQty || parsedQty < 1) { showToast('Quantity must be at least 1.', 'error'); setLoading(false); return; }

    if ((formData.title || '').trim().length > 100) {
      showToast('Book title must not exceed 100 characters.', 'error');
      setLoading(false); return;
    }

    const accNum = (formData.accession_num || '').trim();
    if (accNum) {
      let dupQuery = localDbAdmin.from('books').select('id').eq('accession_num', accNum);
      if (isEditing) dupQuery = dupQuery.neq('id', currentBookId);
      const { data: dupData, error: dupError } = await dupQuery.maybeSingle();
      if (dupError) { showToast('Could not verify accession number. Please try again.', 'error'); setLoading(false); return; }
      if (dupData) { showToast(`Accession number "${accNum}" is already in use by another book.`, 'error'); setLoading(false); return; }
    }

    setLoading(false);

    const lines = [
      `📖  ${(formData.title || '').trim()}`,
      ``,
      `Accession No.   ${formData.accession_num || '—'}`,
      `Author          ${formData.authors || '—'}`,
      `Subject         ${formData.subject_class || '—'}`,
      `Copyright       ${formData.copyright || '—'}`,
      `Copies          ${parsedQty}`,
      formData.publisher ? `Publisher       ${formData.publisher}` : null,
      formData.isbn      ? `ISBN            ${formData.isbn}`      : null,
    ].filter(l => l !== null).join('\n');

    openConfirm({
      title: isEditing ? 'Confirm Book Update' : 'Confirm New Book',
      message: lines,
      confirmText: isEditing ? 'Update Book' : 'Add Book',
      danger: false,
      onConfirm: async () => { closeConfirm(); await _doSaveBook(); } });
  };

  const _doSaveBook = async () => {
    setLoading(true);
    let coverUrl = formData.cover_image || null;
    if (coverFile) {
      const ext = coverFile.name.split('.').pop().toLowerCase();
      const filename = `covers/${Date.now()}-${formData.accession_num}.${ext}`;
      const { data: uploadData, error: upErr } = await localDbAdmin.storage.from('book-covers').upload(filename, coverFile, { upsert: true, contentType: coverFile.type });
      if (upErr) { showToast('Image upload failed: ' + upErr.message, 'error'); setLoading(false); return; }
      coverUrl = uploadData?.publicUrl || null;
    }
    const { cover_image: _ignored, ...formWithoutCover } = formData;
    const bookPayload = cleanBookPayload(coverColAvailable ? { ...formWithoutCover, cover_image: coverUrl } : formWithoutCover);
    if (isEditing) {
      const { error } = await localDb.from('books').update(bookPayload).eq('id', currentBookId);
      if (error) { showToast(error.message, 'error'); setLoading(false); return; }
      if (!migrationNeeded) {
        const existing = copiesMap[currentBookId] || [];
        const newCount = parseInt(formData.quantity) || 1;
        if (newCount > existing.length) {
          try { await generateCopiesForBook(currentBookId, newCount - existing.length, formData.date_acquired, existing.length + 1); }
          catch (err) { console.warn('Copy generation failed:', err.message); }
        }
      }
    } else {
      const { data: inserted, error } = await localDb.from('books').insert([bookPayload]).select();
      if (error) { showToast(error.message, 'error'); setLoading(false); return; }
      if (!migrationNeeded && inserted && inserted[0]) {
        try { await generateCopiesForBook(inserted[0].id, parseInt(formData.quantity) || 1, formData.date_acquired, 1); }
        catch (err) {
          const msg = err.message || '';
          if (!msg.includes('book_copies') && !msg.includes('schema cache') && !msg.includes('PGRST200')) {
            showToast('Book saved but copy generation failed: ' + err.message, 'warning');
          }
        }
      }
    }
    setShowModal(false); fetchInventory();
    if (expandedBookId) fetchCopiesForBook(expandedBookId);
    showToast(isEditing ? 'Book updated successfully.' : 'Book saved successfully.', 'success');
    setLoading(false);
  };

  const openEbookModal = (ebook = null) => {
    if (ebook) { setEditingEbook(ebook); setEbookForm({ title: ebook.title, url: ebook.source || '' }); }
    else { setEditingEbook(null); setEbookForm({ title: '', url: '' }); }
    setEbookImgValid(false); setShowEbookModal(true);
  };

  /* ── eBook save with duplicate-title check ── */
  const handleSaveEbook = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      // Duplicate title check (case-insensitive, trimmed)
      const normalizedTitle = ebookForm.title.trim().toLowerCase();
      const duplicate = ebooks.find(eb =>
        eb.title.trim().toLowerCase() === normalizedTitle &&
        (!editingEbook || eb.id !== editingEbook.id)
      );
      if (duplicate) {
        showToast(`An eBook titled "${duplicate.title}" already exists.`, 'error');
        setLoading(false);
        return;
      }

      if (editingEbook) { await requestJson(`/api/ebooks/${editingEbook.id}`, { method: 'PATCH', body: JSON.stringify(ebookForm) }); }
      else { await requestJson('/api/ebooks', { method: 'POST', body: JSON.stringify(ebookForm) }); }
      setShowEbookModal(false); fetchInventory();
      showToast(editingEbook ? 'eBook updated successfully.' : 'eBook saved successfully.', 'success');
    } catch (error) { showToast('Failed to save eBook: ' + error.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleCopyStatusChange = async (copyId, bookId, newStatus) => {
    const { error } = await localDbAdmin.from('book_copies').update({ status: newStatus }).eq('id', copyId);
    if (error) { showToast('Failed to update copy status: ' + error.message, 'error'); return; }
    const copies = copiesMap[bookId] || [];
    const available = copies.filter(c => c.id !== copyId ? c.status === 'available' : newStatus === 'available').length;
    await localDb.from('books').update({ quantity: available }).eq('id', bookId);
    fetchCopiesForBook(bookId); fetchInventory();
    showToast('Copy status updated.', 'success');
  };

  const exportAllCopiesPDF = async () => {
    if (migrationNeeded) { showToast('Please run the database setup first.', 'warning'); return; }
    const { data: allCopies, error } = await localDbAdmin.from('book_copies').select('*, books(title, accession_num)').order('accession_id', { ascending: true });
    if (error || !allCopies || allCopies.length === 0) { showToast('No copies found. Add books first.', 'warning'); return; }
    _renderBarcodePDF(allCopies, `ShelfMaster-CopyBarcodes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportAvailableCopiesPDF = async () => {
    if (migrationNeeded) { showToast('Please run the database setup first.', 'warning'); return; }
    const { data: allCopies, error } = await localDbAdmin.from('book_copies').select('*, books(title, accession_num)').eq('status', 'available').order('accession_id', { ascending: true });
    if (error || !allCopies || allCopies.length === 0) { showToast('No available copies found.', 'warning'); return; }
    _renderBarcodePDF(allCopies, `ShelfMaster-AvailableBarcodes-${new Date().toISOString().split('T')[0]}.pdf`);
    showToast(`Exported ${allCopies.length} available copy barcodes.`, 'success');
  };

  function _renderBarcodePDF(copies, filename) {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const [cols, rows, mX, mY] = [3, 8, 8, 10];
    const cellW = (210 - mX * 2) / cols, cellH = (297 - mY * 2) / rows;
    let li = 0;
    copies.forEach((copy, idx) => {
      if (idx > 0 && idx % (cols * rows) === 0) { pdf.addPage(); li = 0; }
      const x = mX + (li % cols) * cellW, y = mY + Math.floor(li / cols) * cellH;
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, copy.accession_id, { format: 'CODE128', width: 1.5, height: 36, fontSize: 9, margin: 4, displayValue: true });
        const imgW = cellW - 6, imgH = (canvas.height / canvas.width) * imgW;
        const imgX = x + (cellW - imgW) / 2, imgY = y + 2;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, imgY, imgW, imgH);
        const title = (copy.books?.title || '').length > 28 ? (copy.books?.title || '').slice(0, 28) + '…' : (copy.books?.title || '');
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 41, 59);
        pdf.text(title, x + cellW / 2, imgY + imgH + 3, { align: 'center', maxWidth: cellW - 4 });
        pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 116, 139);
        pdf.text(`Copy #${copy.copy_number}`, x + cellW / 2, imgY + imgH + 7, { align: 'center' });
        pdf.setDrawColor(220, 230, 240); pdf.setLineWidth(0.2); pdf.rect(x + 1, y + 1, cellW - 2, cellH - 2);
      } catch (err) { console.warn('Barcode render failed:', copy.accession_id, err); }
      li++;
    });
    pdf.save(filename);
  }

  const exportInventoryReport = async () => {
    try {
      const { data: allBooks, error } = await localDbAdmin.from('books').select('*').neq('status', 'archived').order('title', { ascending: true });
      if (error) throw error;
      if (!allBooks || allBooks.length === 0) { showToast('No books found in inventory.', 'warning'); return; }
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFillColor(123, 31, 31); doc.rect(0, 0, 297, 22, 'F');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('ShelfMaster — Inventory Report', 14, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleString()}  |  Total titles: ${allBooks.length}`, 185, 14);
      const totalCopies = allBooks.reduce((s, b) => s + (Number(b.quantity) || 0), 0);
      doc.setTextColor(255, 220, 150); doc.text(`Total available copies: ${totalCopies}`, 14, 20);
      const physical = allBooks.filter(b => b.book_type !== 'eBook').length;
      const ebooksCount = allBooks.filter(b => b.book_type === 'eBook').length;
      const outOfStock = allBooks.filter(b => (b.quantity ?? 0) === 0).length;
      doc.setFillColor(245, 250, 232); doc.rect(0, 22, 297, 12, 'F');
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
      doc.text(`Physical Books: ${physical}   |   eBooks: ${ebooksCount}   |   Out of Stock: ${outOfStock}`, 14, 30);
      const { default: autoTable } = await import('jspdf-autotable');
      autoTable(doc, {
        startY: 36,
        head: [['#', 'Accession No.', 'Title', 'Author(s)', 'Classification / Subject', 'Type', 'Copyright', 'Qty / Copies']],
        body: allBooks.map((b, i) => [i + 1, b.accession_num || '—', b.title || '—', b.authors || '—', b.subject_class || b.category || '—', b.book_type || 'Physical', b.copyright || '—', b.quantity ?? 0]),
        theme: 'grid',
        headStyles: { fillColor: [123, 31, 31], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 8, right: 8 },
        columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 28 }, 2: { cellWidth: 68 }, 3: { cellWidth: 54 }, 4: { cellWidth: 42 }, 5: { cellWidth: 24 }, 6: { cellWidth: 22, halign: 'center' }, 7: { cellWidth: 24, halign: 'center' } },
        didParseCell: (data) => { if (data.section === 'body' && data.column.index === 7 && data.cell.raw === 0) { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; } } });
      doc.addPage();
      doc.setFillColor(123, 31, 31); doc.rect(0, 0, 297, 22, 'F');
      doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text('ShelfMaster — Inventory Report (Acquisition Details)', 14, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`Generated: ${new Date().toLocaleString()}`, 210, 14);
      doc.setFillColor(245, 250, 232); doc.rect(0, 22, 297, 12, 'F');
      doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 60, 60);
      doc.text('Page 2 of 2 — Publisher, ISBN, Source of Fund, Cost Price, Pages & Remarks', 14, 30);
      autoTable(doc, {
        startY: 36,
        head: [['#', 'Accession No.', 'Title', 'Publisher', 'ISBN', 'Source of Fund', 'Cost Price', 'Pages', 'Remarks']],
        body: allBooks.map((b, i) => [i + 1, b.accession_num || '—', b.title || '—', b.publisher || '—', b.isbn || '—', b.source || '—', b.cost_price != null ? `₱${Number(b.cost_price).toFixed(2)}` : '—', b.pages || '—', b.remark || '—']),
        theme: 'grid',
        headStyles: { fillColor: [123, 31, 31], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7, textColor: [30, 30, 30] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 8, right: 8 },
        columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 28 }, 2: { cellWidth: 58 }, 3: { cellWidth: 40 }, 4: { cellWidth: 30 }, 5: { cellWidth: 34 }, 6: { cellWidth: 24, halign: 'right' }, 7: { cellWidth: 16, halign: 'center' }, 8: { cellWidth: 43 } } });
      doc.save(`ShelfMaster-Inventory-${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Inventory report exported successfully (2 pages).', 'success');
    } catch (err) { showToast('Failed to generate inventory report: ' + err.message, 'error'); }
  };

  const exportCopiesForBook = async (book) => {
    if (migrationNeeded) return;
    const copies = copiesMap[book.id] || [];
    if (copies.length === 0) { showToast('No copies found for this book.', 'warning'); return; }
    _renderBarcodePDF(copies.map(c => ({ ...c, books: { title: book.title } })), `${book.title.slice(0, 30)}-Copies.pdf`);
  };

  /* ── Filtered lists ── */
  const filteredBooks = useMemo(() => {
    const q = debouncedBooksSearch.trim().toLowerCase();
    if (!q) return books;
    return books.filter(b => {
      if (
        (b.title || '').toLowerCase().includes(q) ||
        (b.authors || '').toLowerCase().includes(q) ||
        String(b.accession_num || '').toLowerCase().includes(q) ||
        (b.subject_class || '').toLowerCase().includes(q)
      ) return true;
      // Also match against any loaded copy accession IDs
      const copies = copiesMap[b.id] || [];
      return copies.some(c => (c.accession_id || '').toLowerCase().includes(q));
    });
  }, [books, debouncedBooksSearch, copiesMap]);

  const filteredEbooks = useMemo(() => {
    const q = debouncedEbooksSearch.trim().toLowerCase();
    return q ? ebooks.filter(b => (b.title || '').toLowerCase().includes(q) || (b.authors || '').toLowerCase().includes(q) || String(b.accession_num || '').toLowerCase().includes(q)) : ebooks;
  }, [ebooks, debouncedEbooksSearch]);

  const filteredArchived = useMemo(() => {
    const q = debouncedArchivedSearch.trim().toLowerCase();
    return q ? archivedBooks.filter(b => (b.title || '').toLowerCase().includes(q) || (b.authors || '').toLowerCase().includes(q) || String(b.accession_num || '').toLowerCase().includes(q)) : archivedBooks;
  }, [archivedBooks, debouncedArchivedSearch]);

  /* ── Paginated slices ── */
  const booksTotalPages = Math.max(1, Math.ceil(filteredBooks.length / PAGE_SIZE));
  const safeBooksPage = Math.min(booksPage, booksTotalPages);
  const pagedBooks = filteredBooks.slice((safeBooksPage - 1) * PAGE_SIZE, safeBooksPage * PAGE_SIZE);

  const ebooksTotalPages = Math.max(1, Math.ceil(filteredEbooks.length / PAGE_SIZE));
  const safeEbooksPage = Math.min(ebooksPage, ebooksTotalPages);
  const pagedEbooks = filteredEbooks.slice((safeEbooksPage - 1) * PAGE_SIZE, safeEbooksPage * PAGE_SIZE);

  const archivedTotalPages = Math.max(1, Math.ceil(filteredArchived.length / PAGE_SIZE));
  const safeArchivedPage = Math.min(archivedPage, archivedTotalPages);
  const pagedArchived = filteredArchived.slice((safeArchivedPage - 1) * PAGE_SIZE, safeArchivedPage * PAGE_SIZE);

  /* ═══════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="inv-root" style={{ background: C.ivory, minHeight: '100vh', padding: '32px 28px 56px' }}>
      <style>{STYLES}</style>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />
      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} confirmText={confirmModal.confirmText} danger={confirmModal.danger} onConfirm={confirmModal.onConfirm} onCancel={closeConfirm} />

      {/* ── MIGRATION BANNER ── */}
      {migrationChecked && migrationNeeded && (
        <div style={{ background: '#FFFCF0', border: '1.5px solid #F5C340', borderRadius: 14, padding: '16px 22px', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', flexShrink: 0, marginTop: 2 }}>
                <FaExclamationTriangle style={{ fontSize: 16 }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#92400E', fontSize: '0.92rem', fontFamily: "'Playfair Display', serif" }}>One-time database setup required</p>
                <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#78350F' }}>
                  To enable per-copy barcode tracking, run the SQL below in your <strong>phpMyAdmin SQL tab</strong> once.
                </p>
              </div>
            </div>
            <button onClick={() => setShowMigration(v => !v)} className="inv-action-btn" style={{ background: '#FDE68A', color: '#78350F', border: '1.5px solid #F5C340', flexShrink: 0 }}>
              {showMigration ? 'Hide SQL' : 'Show Setup SQL'}
            </button>
          </div>
          {showMigration && (
            <div style={{ marginTop: 16, position: 'relative' }}>
              <pre style={{ background: '#1A2332', color: '#86EFAC', padding: '16px 18px', borderRadius: 10, fontSize: '0.76rem', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7, overflowX: 'auto' }}>
                {MIGRATION_SQL}
              </pre>
              <button onClick={() => { navigator.clipboard.writeText(MIGRATION_SQL); showToast('SQL copied!', 'success'); }}
                className="inv-action-btn" style={{ position: 'absolute', top: 10, right: 10, background: '#2D3E52', color: 'white', border: '1px solid #3D5068', fontSize: '0.72rem', padding: '4px 12px' }}>
                Copy
              </button>
              <p style={{ margin: '8px 0 0', fontSize: '0.76rem', color: '#92400E' }}>After running the SQL, refresh this page. The warning will disappear automatically.</p>
            </div>
          )}
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <header className="inv-page-header">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, flexShrink: 0 }}>
            <FaBook />
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 700, color: 'var(--maroon)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              Inventory
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.83rem', color: C.textSoft }}>
              Manage physical books, eBooks, and archived titles.
            </p>
          </div>
        </div>

        {/* Header action buttons */}
        <div className="inv-header-actions">
          {activeTab === 'ebooks' && (
            <button onClick={() => openEbookModal()} className="inv-action-btn inv-btn-indigo">
              <FaPlus style={{ fontSize: 11 }} /> Add eBook
            </button>
          )}
          {activeTab === 'books' && (
            <>
              <button onClick={() => openConfirm({ title: 'Export All Barcodes', message: 'Export barcodes for all book copies as a PDF?\n\nFile: ShelfMaster-CopyBarcodes-[date].pdf', confirmText: 'Export PDF', danger: false, onConfirm: () => { closeConfirm(); exportAllCopiesPDF(); } })} className="inv-action-btn inv-btn-dark" title="Export all copy barcodes">
                <FaDownload style={{ fontSize: 11 }} /> All Barcodes
              </button>
              <button onClick={() => openConfirm({ title: 'Export Available Barcodes', message: 'Export barcodes for all available copies as a PDF?\n\nFile: ShelfMaster-AvailableBarcodes-[date].pdf', confirmText: 'Export PDF', danger: false, onConfirm: () => { closeConfirm(); exportAvailableCopiesPDF(); } })} className="inv-action-btn inv-btn-primary" title="Export available barcodes">
                <FaDownload style={{ fontSize: 11 }} /> Available
              </button>
              <button onClick={() => openConfirm({ title: 'Export Inventory Report', message: 'Generate a full 2-page inventory report as a PDF?\n\nFile: ShelfMaster-Inventory-[date].pdf', confirmText: 'Export PDF', danger: false, onConfirm: () => { closeConfirm(); exportInventoryReport(); } })} className="inv-action-btn" style={{ background: '#1D4ED8', color: 'white', border: '1.5px solid #1D4ED8' }} title="Full inventory report">
                <FaFileAlt style={{ fontSize: 11 }} /> Report
              </button>
              <button onClick={openAddModal} className="inv-action-btn inv-btn-maroon">
                <FaPlus style={{ fontSize: 11 }} /> Add Book
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── TABS ── */}
      <div className="inv-tabs">
        {[
          { key: 'books',    color: 'var(--maroon)', icon: <FaBookOpen style={{ fontSize: 13 }} />,  label: 'Physical Books', count: books.length },
          { key: 'ebooks',   color: '#6366F1',       icon: <MdTabletMac style={{ fontSize: 14 }} />, label: 'eBooks',         count: ebooks.length },
          { key: 'archived', color: '#C0143A',       icon: <FaArchive style={{ fontSize: 12 }} />,   label: 'Archived',       count: archivedBooks.length },
        ].map(t => (
          <TabPill key={t.key} active={activeTab === t.key} color={t.color} activeText="#fff"
            onClick={() => { setActiveTab(t.key); setBooksPage(1); setEbooksPage(1); setArchivedPage(1); }} icon={t.icon} label={t.label} count={t.count} />
        ))}
      </div>

      {/* ══════════════════════════════
         PHYSICAL BOOKS TABLE
      ══════════════════════════════ */}
      {activeTab === 'books' && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(42,33,24,0.05)' }}>
          {/* Search bar */}
          <div className="inv-search-bar">
            <div className="inv-search-input-wrap">
              <FaSearch style={{ color: C.muted, fontSize: 14, flexShrink: 0 }} />
              <input
                type="text" value={booksSearch} onChange={e => { setBooksSearch(e.target.value); setBooksPage(1); }}
                placeholder="Search by title, author, accession #, or subject…"
                className="inv-input"
                style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.88rem', flex: 1, boxShadow: 'none', minWidth: 0 }}
              />
              {booksSearch && (
                <button onClick={() => { setBooksSearch(''); setBooksPage(1); }} className="inv-action-btn inv-btn-ghost-edit" style={{ padding: '4px 11px', fontSize: '0.75rem' }}>Clear</button>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: C.muted, whiteSpace: 'nowrap', borderLeft: `1px solid ${C.border}`, paddingLeft: 12, flexShrink: 0 }}>
              {filteredBooks.length} / {books.length}
            </span>
          </div>

          {/* Scrollable table wrapper */}
          <div className="inv-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 780 }}>
              <colgroup>
                <col style={{ width: '110px' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '80px' }} />
                <col style={{ width: '72px' }} />
                <col style={{ width: '120px' }} />
                <col style={{ width: '180px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#F9F6EF', borderBottom: `1.5px solid ${C.border}` }}>
                  {['Accession No.', 'Title', 'Author', 'Subject / Class', 'Year', 'Avail.', 'Copies', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap', overflow: 'hidden' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBooks.length === 0 ? (
                  <tr><td colSpan="8">
                    <EmptyState icon={<FaBook />} message={books.length === 0 ? 'No physical books yet.' : `No books match "${booksSearch}".`} sub={books.length === 0 ? "Click 'Add Book' above to register your first title." : 'Try a different search term.'} />
                  </td></tr>
                ) : pagedBooks.map((book, idx) => (
                  <React.Fragment key={book.id}>
                    <tr className="inv-tr" style={{ borderBottom: expandedBookId === book.id ? `1px dashed ${C.border}` : `1px solid ${C.ivoryDk}`, background: idx % 2 === 0 ? '#fff' : '#FDFCF9' }}>

                      {/* Accession */}
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        <code style={{ background: '#FFF0E8', color: 'var(--maroon)', padding: '3px 8px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.4px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.accession_num || '—'}
                        </code>
                      </td>

                      {/* Title */}
                      <td style={{ padding: '12px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.title}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.87rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.title}
                        </p>
                      </td>

                      {/* Author */}
                      <td style={{ padding: '12px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.authors || undefined}>
                        <span style={{ display: 'block', fontSize: '0.84rem', color: C.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.authors || '—'}
                        </span>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '12px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.subject_class || undefined}>
                        <span style={{ display: 'block', fontSize: '0.82rem', color: C.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.subject_class || '—'}
                        </span>
                      </td>

                      {/* Copyright */}
                      <td style={{ padding: '12px 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: C.muted, textAlign: 'center' }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.copyright || '—'}
                        </span>
                      </td>

                      {/* Available count */}
                      <td style={{ padding: '12px 14px', textAlign: 'center', overflow: 'hidden' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: book.quantity > 0 ? '#137A4E' : '#B91C1C' }}>{book.quantity}</span>
                        <span style={{ fontSize: '0.68rem', color: C.muted, display: 'block', marginTop: 1 }}>copies</span>
                      </td>

                      {/* Copies toggle */}
                      <td style={{ padding: '12px 14px', overflow: 'hidden' }}>
                        {migrationNeeded
                          ? <span style={{ fontSize: '0.73rem', color: C.muted, fontStyle: 'italic' }}>Setup needed</span>
                          : (
                            <button onClick={() => toggleExpandCopies(book.id)} className={`inv-action-btn inv-btn-ghost-expand${expandedBookId === book.id ? ' expanded' : ''}`} style={{ padding: '5px 11px', fontSize: '0.75rem', width: '100%', justifyContent: 'center' }}>
                              {expandedBookId === book.id ? <FaChevronUp style={{ fontSize: 10 }} /> : <FaChevronDown style={{ fontSize: 10 }} />}
                              {expandedBookId === book.id ? 'Hide' : 'View'}
                            </button>
                          )
                        }
                      </td>

                      {/* Actions */}
                      <td className="inv-actions-cell">
                        <div>
                          <button onClick={() => openEditModal(book)} className="inv-action-btn inv-btn-ghost-edit">
                            <FaEdit style={{ fontSize: 11 }} /> Edit
                          </button>
                          <button onClick={() => handleArchive(book)} className="inv-action-btn inv-btn-ghost-archive">
                            <FaArchive style={{ fontSize: 10 }} /> Archive
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── EXPANDED COPIES PANEL ── */}
                    {expandedBookId === book.id && (
                      <tr>
                        <td colSpan="8" style={{ padding: 0, borderBottom: `1px solid ${C.ivoryDk}`, background: '#F9F7F2' }}>
                          <div className="inv-expand-panel" style={{ padding: '20px 20px' }}>

                            {/* Copies panel header */}
                            <div className="inv-copies-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
                              <div style={{ minWidth: 0 }}>
                                <h4 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 600, color: C.text }}>
                                  Physical Copies
                                </h4>
                                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.muted, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {book.title}
                                </p>
                              </div>
                              <button onClick={() => openConfirm({ title: 'Export Copy Barcodes', message: `Export barcode labels for all copies of:\n"${book.title}"\n\nFile: ${book.title.slice(0, 30)}-Copies.pdf`, confirmText: 'Export PDF', danger: false, onConfirm: () => { closeConfirm(); exportCopiesForBook(book); } })} className="inv-action-btn inv-btn-dark" style={{ fontSize: '0.78rem', padding: '6px 14px', flexShrink: 0 }}>
                                <FaDownload style={{ fontSize: 10 }} /> Export Barcodes
                              </button>
                            </div>

                            {copiesLoading ? (
                              <BookLoader inline message="Loading copies" />
                            ) : (copiesMap[book.id] || []).length === 0 ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                <p style={{ color: C.muted, margin: 0, fontSize: '0.83rem', fontStyle: 'italic' }}>No copies generated yet.</p>
                                <button onClick={async () => {
                                  try { await generateCopiesForBook(book.id, book.quantity || 1, book.date_acquired, 1); await fetchCopiesForBook(book.id); showToast('Copies generated.', 'success'); }
                                  catch (err) { showToast('Failed: ' + err.message, 'error'); }
                                }} className="inv-action-btn inv-btn-primary" style={{ fontSize: '0.8rem' }}>
                                  Generate {book.quantity || 1} {book.quantity === 1 ? 'Copy' : 'Copies'}
                                </button>
                              </div>
                            ) : (
                              <div className="inv-copies-table-wrap">
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 560 }}>
                                  <colgroup>
                                    <col style={{ width: '90px' }} />
                                    <col style={{ width: '180px' }} />
                                    <col style={{ width: '110px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '140px' }} />
                                  </colgroup>
                                  <thead>
                                    <tr style={{ borderBottom: `1.5px solid ${C.border}` }}>
                                      {['Copy #', 'Accession ID', 'Status', 'Date Acquired', 'Change Status'].map(h => (
                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: C.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(copiesMap[book.id] || []).map(copy => (
                                      <tr key={copy.id} className="inv-tr" style={{ borderBottom: `1px solid ${C.ivoryDk}` }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: C.textSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Copy {copy.copy_number}</td>
                                        <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                                          <code style={{ background: '#EEF2FF', color: '#4338CA', padding: '3px 9px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.79rem', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {copy.accession_id}
                                          </code>
                                        </td>
                                        <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                                          <span className={`inv-status inv-status-${copy.status}`}>
                                            {copy.status.charAt(0).toUpperCase() + copy.status.slice(1)}
                                          </span>
                                        </td>
                                        <td style={{ padding: '10px 12px', color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{copy.date_acquired || '—'}</td>
                                        <td style={{ padding: '10px 12px', overflow: 'hidden' }}>
                                          <select value={copy.status} onChange={e => handleCopyStatusChange(copy.id, book.id, e.target.value)} className="inv-copy-select">
                                            <option value="available">Available</option>
                                            <option value="borrowed">Borrowed</option>
                                            <option value="damaged">Damaged</option>
                                            <option value="lost">Lost</option>
                                          </select>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safeBooksPage} totalPages={booksTotalPages} total={filteredBooks.length} pageSize={PAGE_SIZE} onPage={setBooksPage} />

          {/* ── MOBILE CARDS (Physical Books) ── */}
          <div className="inv-mobile-cards" style={{ padding: '12px 14px' }}>
            {filteredBooks.length === 0 ? (
              <EmptyState icon={<FaBook />} message={books.length === 0 ? 'No physical books yet.' : `No books match "${booksSearch}".`} sub={books.length === 0 ? "Tap 'Add Book' above to register your first title." : 'Try a different search term.'} />
            ) : pagedBooks.map(book => (
              <div key={book.id} className="inv-record-card">
                <div className="inv-card-header">
                  <span className="inv-card-title">{book.title || '—'}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: book.quantity > 0 ? '#137A4E' : '#B91C1C', flexShrink: 0 }}>
                    {book.quantity} <span style={{ fontSize: '0.68rem', color: C.muted, fontWeight: 400 }}>avail</span>
                  </span>
                </div>
                <div className="inv-card-fields">
                  <div>
                    <div className="inv-card-field-label">Accession No.</div>
                    <div className="inv-card-field-value">
                      <code style={{ background: '#FFF0E8', color: 'var(--maroon)', padding: '2px 8px', borderRadius: 5, fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>{book.accession_num || '—'}</code>
                    </div>
                  </div>
                  <div>
                    <div className="inv-card-field-label">Author</div>
                    <div className="inv-card-field-value" style={{ color: C.textSoft }}>{book.authors || '—'}</div>
                  </div>
                  <div>
                    <div className="inv-card-field-label">Subject / Class</div>
                    <div className="inv-card-field-value" style={{ color: C.textSoft }}>{book.subject_class || '—'}</div>
                  </div>
                  <div>
                    <div className="inv-card-field-label">Copyright Year</div>
                    <div className="inv-card-field-value" style={{ color: C.muted }}>{book.copyright || '—'}</div>
                  </div>
                </div>
                <div className="inv-card-footer">
                  <button onClick={() => openEditModal(book)} className="inv-action-btn inv-btn-ghost-edit" style={{ flex: 1, justifyContent: 'center' }}>
                    <FaEdit style={{ fontSize: 11 }} /> Edit
                  </button>
                  <button onClick={() => handleArchive(book)} className="inv-action-btn inv-btn-ghost-archive" style={{ flex: 1, justifyContent: 'center' }}>
                    <FaArchive style={{ fontSize: 10 }} /> Archive
                  </button>
                </div>
              </div>
            ))}
            <Pagination page={safeBooksPage} totalPages={booksTotalPages} total={filteredBooks.length} pageSize={PAGE_SIZE} onPage={setBooksPage} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════
         EBOOKS GRID
      ══════════════════════════════ */}
      {activeTab === 'ebooks' && (
        <div>
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(42,33,24,0.05)', flexWrap: 'wrap' }}>
            <div className="inv-search-input-wrap">
              <FaSearch style={{ color: C.muted, fontSize: 14, flexShrink: 0 }} />
              <input
                type="text" value={ebooksSearch} onChange={e => { setEbooksSearch(e.target.value); setEbooksPage(1); }}
                placeholder="Search Title"
                className="inv-input" style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.88rem', flex: 1, boxShadow: 'none', minWidth: 0 }}
              />
              {ebooksSearch && (
                <button onClick={() => { setEbooksSearch(''); setEbooksPage(1); }} className="inv-action-btn inv-btn-ghost-edit" style={{ padding: '4px 11px', fontSize: '0.75rem' }}>Clear</button>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: C.muted, whiteSpace: 'nowrap', borderLeft: `1px solid ${C.border}`, paddingLeft: 12, flexShrink: 0 }}>
              {filteredEbooks.length} / {ebooks.length}
            </span>
          </div>

          {ebooks.length === 0
            ? <EmptyState icon={<MdTabletMac />} message="No eBooks yet." sub='Click "Add eBook" above to get started.' fullCard />
            : filteredEbooks.length === 0
              ? <EmptyState icon={<MdTabletMac />} message={`No eBooks match "${ebooksSearch}".`} sub="Try a different search term." fullCard />
              : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 18 }}>
                    {pagedEbooks.map(ebook => (
                      <EbookCard key={ebook.id} ebook={ebook} onEdit={() => openEbookModal(ebook)} onArchive={() => handleArchive(ebook)} />
                    ))}
                  </div>
                  <Pagination page={safeEbooksPage} totalPages={ebooksTotalPages} total={filteredEbooks.length} pageSize={PAGE_SIZE} onPage={setEbooksPage} />
                </>
              )
          }
        </div>
      )}

      {/* ══════════════════════════════
         ARCHIVED TABLE
      ══════════════════════════════ */}
      {activeTab === 'archived' && (
        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(42,33,24,0.05)' }}>
          <div className="inv-search-bar" style={{ borderBottom: `1px solid ${C.ivoryDk}` }}>
            <div className="inv-search-input-wrap">
              <FaSearch style={{ color: C.muted, fontSize: 14, flexShrink: 0 }} />
              <input
                type="text" value={archivedSearch} onChange={e => { setArchivedSearch(e.target.value); setArchivedPage(1); }}
                placeholder="Search archived books…"
                className="inv-input" style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: '0.88rem', flex: 1, boxShadow: 'none', minWidth: 0 }}
              />
              {archivedSearch && (
                <button onClick={() => { setArchivedSearch(''); setArchivedPage(1); }} className="inv-action-btn inv-btn-ghost-edit" style={{ padding: '4px 11px', fontSize: '0.75rem' }}>Clear</button>
              )}
            </div>
          </div>

          <div className="inv-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 480 }}>
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '170px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#FFF5F7', borderBottom: `1.5px solid #FCC9D3` }}>
                  {['Title', 'Author', 'Type', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#C0143A', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredArchived.length === 0 ? (
                  <tr><td colSpan="4">
                    <EmptyState icon={<FaArchive />} message={archivedBooks.length === 0 ? 'No archived books.' : `No matches for "${archivedSearch}".`} sub={archivedBooks.length === 0 ? 'Books you archive will appear here.' : 'Try a different search term.'} />
                  </td></tr>
                ) : pagedArchived.map((book, idx) => (
                  <tr key={book.id} className="inv-tr" style={{ borderBottom: `1px solid ${C.ivoryDk}`, background: idx % 2 === 0 ? '#fff' : '#FDFCF9' }}>
                    <td style={{ padding: '13px 16px', overflow: 'hidden' }} title={book.title}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.title}</p>
                      <code style={{ fontSize: '0.72rem', color: C.muted, background: C.ivoryDk, padding: '1px 7px', borderRadius: 4, marginTop: 3, display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Acc# {book.accession_num}</code>
                    </td>
                    <td style={{ padding: '13px 16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.authors || undefined}>
                      <span style={{ display: 'block', fontSize: '0.85rem', color: C.textSoft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{book.authors || '—'}</span>
                    </td>
                    <td style={{ padding: '13px 16px', overflow: 'hidden' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: C.textSoft, whiteSpace: 'nowrap' }}>
                        {book.book_type === 'eBook' ? <><MdTabletMac style={{ fontSize: 14 }} /> eBook</> : <><FaBookOpen style={{ fontSize: 12 }} /> Physical</>}
                      </span>
                    </td>
                    <td className="inv-actions-cell">
                      <div>
                        <button onClick={() => handleUnarchive(book)} className="inv-action-btn inv-btn-ghost-restore">
                          <FaRedo style={{ fontSize: 10 }} /> Restore
                        </button>
                        <button onClick={() => handleDeleteForever(book)} className="inv-action-btn inv-btn-ghost-delete">
                          <FaTrash style={{ fontSize: 10 }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={safeArchivedPage} totalPages={archivedTotalPages} total={filteredArchived.length} pageSize={PAGE_SIZE} onPage={setArchivedPage} />

          {/* ── MOBILE CARDS (Archived) ── */}
          <div className="inv-mobile-cards" style={{ padding: '12px 14px' }}>
            {filteredArchived.length === 0 ? (
              <EmptyState icon={<FaArchive />} message={archivedBooks.length === 0 ? 'No archived books.' : `No matches for "${archivedSearch}".`} sub={archivedBooks.length === 0 ? 'Books you archive will appear here.' : 'Try a different search term.'} />
            ) : pagedArchived.map(book => (
              <div key={book.id} className="inv-record-card" style={{ borderLeft: '3px solid #C0143A' }}>
                <div className="inv-card-header">
                  <span className="inv-card-title">{book.title || '—'}</span>
                  <span style={{ fontSize: '0.72rem', background: '#FFF1F3', color: '#C0143A', padding: '2px 8px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>
                    {book.book_type === 'eBook' ? 'eBook' : 'Physical'}
                  </span>
                </div>
                <div className="inv-card-fields">
                  <div>
                    <div className="inv-card-field-label">Accession No.</div>
                    <div className="inv-card-field-value">
                      <code style={{ background: C.ivoryDk, color: C.muted, padding: '2px 7px', borderRadius: 4, fontSize: '0.72rem' }}>Acc# {book.accession_num}</code>
                    </div>
                  </div>
                  <div>
                    <div className="inv-card-field-label">Author</div>
                    <div className="inv-card-field-value" style={{ color: C.textSoft }}>{book.authors || '—'}</div>
                  </div>
                </div>
                <div className="inv-card-footer">
                  <button onClick={() => handleUnarchive(book)} className="inv-action-btn inv-btn-ghost-restore" style={{ flex: 1, justifyContent: 'center' }}>
                    <FaRedo style={{ fontSize: 10 }} /> Restore
                  </button>
                  <button onClick={() => handleDeleteForever(book)} className="inv-action-btn inv-btn-ghost-delete" style={{ flex: 1, justifyContent: 'center' }}>
                    <FaTrash style={{ fontSize: 10 }} /> Delete
                  </button>
                </div>
              </div>
            ))}
            <Pagination page={safeArchivedPage} totalPages={archivedTotalPages} total={filteredArchived.length} pageSize={PAGE_SIZE} onPage={setArchivedPage} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════
         EBOOK MODAL
      ══════════════════════════════ */}
      {showEbookModal && (
        <ModalOverlay onClose={() => setShowEbookModal(false)}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', fontSize: 16, flexShrink: 0 }}>
                <MdTabletMac />
              </div>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 600, color: C.text }}>
                {editingEbook ? 'Edit eBook' : 'Add New eBook'}
              </h3>
            </div>
            <p style={{ margin: '0 0 22px 46px', fontSize: '0.82rem', color: C.muted }}>Enter the eBook title and its URL link.</p>
          </div>

          <form onSubmit={handleSaveEbook}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="eBook Title">
                <input type="text" required placeholder="e.g. Introduction to Python" className="inv-input"
                  value={ebookForm.title} onChange={e => setEbookForm({ ...ebookForm, title: e.target.value })} />
              </FormField>
              <FormField label="URL / Link">
                <input type="url" required placeholder="https://example.com/book.pdf" className="inv-input"
                  value={ebookForm.url} onChange={e => { setEbookForm({ ...ebookForm, url: e.target.value }); setEbookImgValid(false); }} />
              </FormField>
              {ebookForm.url && (
                <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: '#F9F7F2' }}>
                  <img src={ebookForm.url} alt="preview" onLoad={() => setEbookImgValid(true)} onError={() => setEbookImgValid(false)}
                    style={{ display: ebookImgValid ? 'block' : 'none', width: '100%', maxHeight: 200, objectFit: 'contain' }} />
                  {!ebookImgValid && (
                    <div style={{ padding: '22px', textAlign: 'center', color: C.muted, fontSize: '0.82rem' }}>
                      <MdTabletMac style={{ fontSize: '2rem', marginBottom: 6, color: '#C8BFAF' }} />
                      <p style={{ margin: 0 }}>No image preview available for this URL</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <ModalFooter>
              <button type="button" onClick={() => setShowEbookModal(false)} className="inv-action-btn" style={{ background: 'transparent', color: C.muted, border: '1.5px solid transparent', padding: '8px 18px' }}>Cancel</button>
              <button type="submit" disabled={loading} className="inv-action-btn inv-btn-indigo" style={{ padding: '9px 22px', fontSize: '0.88rem' }}>
                {loading ? 'Saving…' : editingEbook ? 'Update eBook' : 'Save eBook'}
              </button>
            </ModalFooter>
          </form>
        </ModalOverlay>
      )}

      {/* ══════════════════════════════
         BOOK MODAL
      ══════════════════════════════ */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: '#FFF0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--maroon)', fontSize: 16, flexShrink: 0 }}>
                <FaBook />
              </div>
              <h3 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 600, color: C.text }}>
                {isEditing ? 'Update Book Details' : 'Register New Book'}
              </h3>
            </div>
            <p style={{ margin: '0 0 22px 46px', fontSize: '0.82rem', color: C.muted }}>
              Fields marked <span style={{ color: 'var(--maroon)' }}>*</span> are required.
            </p>
          </div>

          <form onSubmit={handleSaveBook}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Accession */}
              <div style={{ background: '#FFF8F0', border: `1.5px solid #F5CEB0`, borderRadius: 12, padding: '12px 14px' }}>
                <FormField label={<><span style={{ color: 'var(--maroon)' }}>*</span> Accession / Code No.</>}>
                  <input type="text" required className="inv-input" placeholder="e.g. 00001" style={{ background: '#fff' }}
                    inputMode="numeric"
                    value={formData.accession_num}
                    onChange={e => { const acc = e.target.value.replace(/\D/g, ''); setFormData({ ...formData, accession_num: acc, barcode: isEditing ? formData.barcode : generateBarcode(acc) }); }} />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <FormField label={<><span style={{ color: 'var(--maroon)' }}>*</span> Title</>} style={{ gridColumn: '1 / -1' }}>
                  <input type="text" required className="inv-input" placeholder="Enter Title" maxLength={100}
                    value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value.slice(0, 100) })} />
                </FormField>
                <FormField label={<><span style={{ color: 'var(--maroon)' }}>*</span> Author</>}>
                  <input type="text" required className="inv-input" placeholder="Enter Author"
                    value={formData.authors} onChange={e => setFormData({ ...formData, authors: e.target.value })} />
                </FormField>
                <FormField label={<><span style={{ color: 'var(--maroon)' }}>*</span> Classification / Subject</>}>
                  <input type="text" required className="inv-input" placeholder="Enter Classification / Subject"
                    value={formData.subject_class || ''} onChange={e => setFormData({ ...formData, subject_class: e.target.value })} />
                </FormField>
                <FormField label={<><span style={{ color: 'var(--maroon)' }}>*</span> Copyright Year</>}>
                  <input type="text" required className="inv-input" placeholder={`e.g. ${new Date().getFullYear()}`}
                    inputMode="numeric" maxLength={4}
                    value={formData.copyright || ''}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      const currentYear = new Date().getFullYear();
                      if (digits.length === 4 && parseInt(digits) > currentYear) return;
                      setFormData({ ...formData, copyright: digits });
                    }} />
                </FormField>
                <FormField label={
                  <span>Number of Copies
                    {!migrationNeeded && <span style={{ color: 'var(--green)', fontWeight: 500, textTransform: 'none', marginLeft: 6 }}>— auto-generates barcodes</span>}
                  </span>
                }>
                  <input type="number" min="1" className="inv-input"
                    value={formData.quantity}
                    onChange={e => {
                      const raw = e.target.value;
                      if (raw === '') { setFormData({ ...formData, quantity: '' }); return; }
                      const v = parseInt(raw);
                      setFormData({ ...formData, quantity: isNaN(v) ? '' : Math.max(1, v) });
                    }}
                    onBlur={e => { const v = parseInt(e.target.value); setFormData(f => ({ ...f, quantity: isNaN(v) || v < 1 ? 1 : v })); }} />
                </FormField>
              </div>

              {/* Barcode hint */}
              {!migrationNeeded && !isEditing && (
                <div style={{ background: '#F0FDF4', border: '1.5px solid #A8EDD1', borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FaCheckCircle style={{ color: 'var(--green)', fontSize: 18, flexShrink: 0 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#137A4E' }}>
                      {formData.quantity || 1} unique copy {parseInt(formData.quantity) === 1 ? 'barcode' : 'barcodes'} will be generated
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#2D6A4F' }}>Each copy gets its own scannable accession ID</p>
                  </div>
                </div>
              )}

              {/* Cover upload */}
              <FormField label={<>Book Cover Photo <span style={{ fontWeight: 400, textTransform: 'none', color: C.muted }}>(optional · max 5 MB)</span></>}>
                {coverPreview ? (
                  <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={coverPreview} alt="Cover" style={{ width: 90, height: 122, objectFit: 'cover', borderRadius: 9, border: `2px solid ${C.border}` }} />
                      <button type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); setFormData(f => ({ ...f, cover_image: null })); }}
                        style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', color: 'white', border: 'none', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        ✕
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: C.muted, alignSelf: 'flex-end', wordBreak: 'break-all' }}>{coverFile ? coverFile.name : 'Existing cover'}</p>
                  </div>
                ) : (
                  <div
                    className={`inv-drop-zone${coverDragOver ? ' drag-over' : ''}`}
                    onClick={() => coverInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setCoverDragOver(true); }}
                    onDragLeave={() => setCoverDragOver(false)}
                    onDrop={e => { e.preventDefault(); setCoverDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleCoverChange(f); }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>🖼️</div>
                    <p style={{ margin: 0, fontWeight: 600, color: C.textSoft, fontSize: '0.85rem' }}>Click or drag & drop a cover image</p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.73rem', color: C.muted }}>JPG, PNG, WEBP — 5 MB max</p>
                  </div>
                )}
                <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverChange(f); e.target.value = ''; }} />
              </FormField>

            </div>

            <ModalFooter>
              <button type="button" onClick={() => setShowModal(false)} className="inv-action-btn" style={{ background: 'transparent', color: C.muted, border: '1.5px solid transparent', padding: '8px 18px' }}>Cancel</button>
              <button type="submit" disabled={loading} className="inv-action-btn inv-btn-maroon" style={{ padding: '9px 22px', fontSize: '0.88rem' }}>
                {loading ? 'Saving…' : isEditing ? 'Update Book' : `Add Book & Generate ${formData.quantity || 1} ${parseInt(formData.quantity) === 1 ? 'Copy' : 'Copies'}`}
              </button>
            </ModalFooter>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════ */

function TabPill({ active, color, activeText, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className="inv-tab"
      style={{
        background: active ? color : '#fff',
        color: active ? activeText : '#8C8070',
        border: `1.5px solid ${active ? color : '#E8E2D7'}`,
        boxShadow: active ? `0 4px 16px ${color}33` : 'none' }}
    >
      {icon}
      {label}
      <span className="inv-tab-count" style={{
        background: active ? 'rgba(255,255,255,0.22)' : '#F1EDE3',
        color: active ? activeText : '#8C8070',
        borderRadius: 20, padding: '1px 8px', fontSize: '0.75rem', fontWeight: 700
      }}>
        {count}
      </span>
    </button>
  );
}

function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid #F1EDE3', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: '0.78rem', color: '#8C8070' }}>
        Showing <strong style={{ color: '#2A2118' }}>{from}–{to}</strong> of <strong style={{ color: '#2A2118' }}>{total}</strong>
      </span>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => onPage(page - 1)} disabled={page <= 1}
          style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #E8E2D7', background: page <= 1 ? '#F9F7F2' : '#fff', color: page <= 1 ? '#C8BFAF' : '#2A2118', cursor: page <= 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          ‹ Prev
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} style={{ padding: '5px 6px', fontSize: '0.8rem', color: '#8C8070' }}>…</span>
            : <button key={p} onClick={() => onPage(p)}
                style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${p === page ? 'var(--maroon)' : '#E8E2D7'}`, background: p === page ? 'var(--maroon)' : '#fff', color: p === page ? '#fff' : '#2A2118', cursor: 'pointer', fontSize: '0.8rem', fontWeight: p === page ? 700 : 500, fontFamily: "'DM Sans', sans-serif", minWidth: 34 }}>
                {p}
              </button>
        )}
        <button
          onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          style={{ padding: '5px 12px', borderRadius: 7, border: '1.5px solid #E8E2D7', background: page >= totalPages ? '#F9F7F2' : '#fff', color: page >= totalPages ? '#C8BFAF' : '#2A2118', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          Next ›
        </button>
      </div>
    </div>
  );
}

function FormField({ label, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8C8070', textTransform: 'uppercase', letterSpacing: '0.5px', userSelect: 'none' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,33,24,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '16px', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="inv-modal"
        style={{ background: '#fff', padding: '28px 30px', borderRadius: 18, width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box', wordBreak: 'break-word', overflowWrap: 'anywhere', boxShadow: '0 24px 64px rgba(42,33,24,0.2)' }}
      >
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 28, paddingTop: 18, borderTop: '1px solid #F1EDE3', flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

function EmptyState({ icon, message, sub, fullCard }) {
  const inner = (
    <div style={{ padding: '52px 20px', textAlign: 'center', color: '#B5A99A' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 10, opacity: 0.3 }}>{icon}</div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#8C8070' }}>{message}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#B5A99A' }}>{sub}</p>}
    </div>
  );
  if (!fullCard) return inner;
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1.5px dashed #E0D9CE', overflow: 'hidden' }}>
      {inner}
    </div>
  );
}

function EbookCard({ ebook, onEdit, onArchive }) {
  const [imgValid, setImgValid] = useState(false);
  return (
    <div className="inv-ebook-card" style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8E2D7', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 14px rgba(42,33,24,0.06)' }}>
      <div style={{ height: 148, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {ebook.source && (
          <img src={ebook.source} alt={ebook.title} onLoad={() => setImgValid(true)} onError={() => setImgValid(false)}
            style={{ display: imgValid ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {!imgValid && (
          <div style={{ textAlign: 'center', color: '#6366F1' }}>
            <MdTabletMac style={{ fontSize: '2.8rem' }} />
            <div style={{ fontSize: '0.62rem', fontWeight: 800, marginTop: 4, color: '#A5B4FC', letterSpacing: '1.5px' }}>eBOOK</div>
          </div>
        )}
        <div style={{ position: 'absolute', top: 8, right: 8, background: '#6366F1', color: '#fff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 7px', borderRadius: 20, letterSpacing: '0.5px' }}>
          DIGITAL
        </div>
      </div>
      <div style={{ padding: '14px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.86rem', color: '#2A2118', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={ebook.title}>
            {ebook.title}
          </p>
          <code style={{ fontSize: '0.68rem', color: '#8C8070', background: '#F1EDE3', padding: '2px 7px', borderRadius: 5, display: 'inline-block', marginTop: 5, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ebook.accession_num}</code>
        </div>
        {ebook.source && (
          <a href={ebook.source} target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#EEF2FF', color: '#6366F1', textAlign: 'center', padding: '7px', borderRadius: 8, fontSize: '0.79rem', fontWeight: 700, textDecoration: 'none', transition: 'background 0.15s' }}>
            <FaLink style={{ verticalAlign: 'middle', marginRight: 5, fontSize: 11 }} /> Open eBook
          </a>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
          <button onClick={onEdit} className="inv-action-btn inv-btn-ghost-edit" style={{ flex: 1, justifyContent: 'center' }}>
            <FaEdit style={{ fontSize: 11 }} /> Edit
          </button>
          <button onClick={onArchive} className="inv-action-btn inv-btn-ghost-archive" style={{ flex: 1, justifyContent: 'center' }}>
            <FaArchive style={{ fontSize: 10 }} /> Archive
          </button>
        </div>
      </div>
    </div>
  );
}