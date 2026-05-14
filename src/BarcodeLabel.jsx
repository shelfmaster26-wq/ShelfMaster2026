import React, { useRef } from 'react';
import Barcode from 'react-barcode';
import { FaPrint } from 'react-icons/fa';

/**
 * Renders a printable barcode label for a book copy.
 * Props:
 *   value      – the barcode string (e.g. "LIB-2026-000001")
 *   title      – book title shown beneath the barcode
 *   accession  – accession number / copy label shown as small text
 *   compact    – if true, renders smaller (for modals)
 */
export default function BarcodeLabel({ value, title, accession, compact = false }) {
  const labelRef = useRef(null);

  const handlePrint = () => {
    const content = labelRef.current?.innerHTML;
    if (!content) return;

    const win = window.open('', '_blank', 'width=400,height=300');
    win.document.write(`
      <html>
        <head>
          <title>Book Label – ${value}</title>
          <style>
            body { margin: 0; padding: 16px; font-family: monospace; display: flex; justify-content: center; }
            .label { text-align: center; border: 1px dashed #aaa; padding: 12px 16px; display: inline-block; }
            .label-title { font-size: 11px; font-weight: bold; margin-top: 6px; max-width: 200px; word-break: break-word; }
            .label-acc { font-size: 10px; color: #555; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="label">
            ${content}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (!value) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        ref={labelRef}
        style={{
          background: 'white',
          border: '1px dashed #cbd5e1',
          borderRadius: '8px',
          padding: compact ? '10px 14px' : '14px 20px',
          textAlign: 'center',
          display: 'inline-block',
        }}
      >
        <Barcode
          value={value}
          format="CODE128"
          width={compact ? 1.4 : 1.8}
          height={compact ? 48 : 60}
          fontSize={compact ? 10 : 12}
          margin={4}
          displayValue={true}
        />
        {title && (
          <div style={{ fontSize: compact ? '0.72rem' : '0.8rem', fontWeight: 'bold', color: '#1e293b', marginTop: '4px', maxWidth: '220px', wordBreak: 'break-word' }}>
            {title.length > 40 ? title.slice(0, 40) + '…' : title}
          </div>
        )}
        {accession && (
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
            {accession}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handlePrint}
        style={{
          background: '#1e293b',
          color: 'white',
          border: 'none',
          padding: '7px 18px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {<FaPrint style={{verticalAlign:"middle"}} />} Print Label
      </button>
    </div>
  );
}

/**
 * Generates a barcode value for a book (legacy, per-title).
 * e.g. "00001" → "LIB-2026-00001"
 */
export function generateBarcode(accessionNum) {
  const year = new Date().getFullYear();
  return `LIB-${year}-${accessionNum}`;
}

/**
 * Generates a globally unique accession ID for a physical copy.
 * e.g. 1234 → "LIB-2026-001234"
 */
export function generateCopyAccessionId(num) {
  const year = new Date().getFullYear();
  return `LIB-${year}-${num.toString().padStart(6, '0')}`;
}
