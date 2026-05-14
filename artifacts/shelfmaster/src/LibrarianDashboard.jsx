import React, { useState, useEffect } from 'react';
import { localDb } from './localDbClient';
import { localDbAdmin } from './localDbAdmin';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { FaBook, FaBookOpen, FaHourglassHalf, FaGraduationCap, FaExclamationTriangle } from 'react-icons/fa';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  .ld-root { font-family: 'DM Sans', sans-serif; }
  .ld-root *, .ld-root *::before, .ld-root *::after { box-sizing: border-box; }

  .ld-stat {
    opacity: 0;
    transform: translateY(24px);
    animation: ld-rise 0.55s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  .ld-stat:nth-child(1) { animation-delay: 0.05s; }
  .ld-stat:nth-child(2) { animation-delay: 0.15s; }
  .ld-stat:nth-child(3) { animation-delay: 0.25s; }
  .ld-stat:nth-child(4) { animation-delay: 0.35s; }

  @keyframes ld-rise {
    to { opacity: 1; transform: translateY(0); }
  }

  .ld-fade {
    opacity: 0;
    animation: ld-fadein 0.6s ease 0.5s forwards;
  }
  @keyframes ld-fadein { to { opacity: 1; } }

  .ld-stat:hover {
    transform: translateY(-4px) !important;
    box-shadow: 0 16px 48px rgba(0,0,0,0.10) !important;
  }
  .ld-stat { transition: transform 0.2s ease, box-shadow 0.2s ease; }

  .ld-book-row { transition: background 0.15s ease, padding 0.15s ease; border-radius: 10px; }
  .ld-book-row:hover { background: rgba(0,0,0,0.03); padding-left: 10px !important; padding-right: 10px !important; }

  .ld-bar-fill { transition: width 0.9s cubic-bezier(0.22,1,0.36,1); }

  @media (max-width: 900px) {
    .ld-main-grid { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .ld-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .ld-header-meta { display: none !important; }
  }
  @media (max-width: 400px) {
    .ld-stats-grid { grid-template-columns: 1fr !important; }
  }
`;

const PALETTE = {
  ivory:    '#F9F7F2',
  ivoryDk:  '#F1EDE3',
  border:   '#E8E2D7',
  muted:    '#8C8070',
  text:     '#2A2118',
  textSoft: '#6B5F52',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 10,
      padding: '10px 16px',
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    }}>
      <p style={{ margin: 0, fontSize: 11, color: PALETTE.muted, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 600, color: 'var(--maroon)' }}>{payload[0].value} <span style={{ fontSize: 12, fontWeight: 400, color: PALETTE.muted }}>loans</span></p>
    </div>
  );
}

export default function LibrarianDashboard() {
  const [stats, setStats] = useState({ totalBooks: 0, activeLoans: 0, pending: 0, totalBorrowed: 0 });
  const [chartData, setChartData] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    const channel = localDb
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, fetchDashboardData)
      .subscribe();
    return () => localDb.removeChannel(channel);
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setStatsError(null);

    const [
      { count: books, error: booksErr },
      { count: loans, error: loansErr },
      { count: pending, error: pendingErr },
      { count: totalBorrowed, error: borrowedErr },
    ] = await Promise.all([
      localDbAdmin.from('books').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
      localDbAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'borrowed'),
      localDbAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      localDbAdmin.from('transactions').select('*', { count: 'exact', head: true }).in('status', ['borrowed', 'returned']),
    ]);

    if (booksErr || loansErr || pendingErr || borrowedErr) {
      setStatsError('Some stats could not be loaded. Check your database permissions.');
    }

    setStats({
      totalBooks:   books        ?? 0,
      activeLoans:  loans        ?? 0,
      pending:      pending      ?? 0,
      totalBorrowed: totalBorrowed ?? 0,
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: transactions } = await localDbAdmin
      .from('transactions')
      .select('borrow_date')
      .gte('borrow_date', sevenDaysAgo.toISOString());

    const dateMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    transactions?.forEach(t => {
      const label = new Date(t.borrow_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dateMap[label] !== undefined) dateMap[label]++;
    });
    setChartData(Object.keys(dateMap).map(key => ({ date: key, loans: dateMap[key] })));

    const { data: topData } = await localDbAdmin
      .from('transactions')
      .select('book_id, books(title, authors)')
      .limit(20);

    const counts = {};
    topData?.forEach(t => {
      const title = t.books?.title || 'Unknown';
      counts[title] = (counts[title] || 0) + 1;
    });
    setTopBooks(
      Object.keys(counts)
        .map(title => ({ title, count: counts[title] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
    setLoading(false);
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const maxCount = topBooks[0]?.count || 1;

  return (
    <div className="ld-root" style={{ background: PALETTE.ivory, minHeight: '100vh', padding: '32px 28px 48px' }}>
      <style>{STYLES}</style>

      {/* ── HEADER ── */}
      <header style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, flexShrink: 0,
            }}>
              <FaBook />
            </div>
            <h1 style={{
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(22px, 4vw, 30px)',
              fontWeight: 700,
              color: 'var(--maroon)',
              letterSpacing: '-0.3px',
              lineHeight: 1.1,
            }}>
              Librarian Dashboard
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: PALETTE.textSoft, paddingLeft: 52 }}>
            Welcome back — here's your library at a glance.
          </p>
        </div>
        <div className="ld-header-meta" style={{
          background: '#fff', border: `1px solid ${PALETTE.border}`, borderRadius: 10,
          padding: '8px 16px', fontSize: 13, color: PALETTE.muted,
          fontWeight: 400, whiteSpace: 'nowrap',
        }}>
          {today}
        </div>
      </header>

      {/* ── ERROR BANNER ── */}
      {statsError && (
        <div style={{
          background: '#FFFBF0', border: '1px solid #F5C84C', borderRadius: 12,
          padding: '12px 18px', marginBottom: 24,
          color: '#7A5E00', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          {statsError}
        </div>
      )}

      {/* ── STAT CARDS ── */}
      <div
        className="ld-stats-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}
      >
        <StatCard label="Total Collection"   value={stats.totalBooks}   accent="var(--maroon)"  icon={<FaBook />}          loading={loading} />
        <StatCard label="Active Loans"        value={stats.activeLoans}  accent="var(--green)"   icon={<FaBookOpen />}      loading={loading} />
        <StatCard label="Pending Requests"    value={stats.pending}      accent="var(--yellow)"  icon={<FaHourglassHalf />} loading={loading} />
        <StatCard label="Total Borrowed"      value={stats.totalBorrowed} accent="#6366F1"       icon={<FaGraduationCap />} loading={loading} />
      </div>

      {/* ── CHART + TOP BOOKS ── */}
      <div
        className="ld-main-grid"
        style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}
      >

        {/* Chart */}
        <div className="ld-fade" style={cardStyle}>
          <SectionHeading>Weekly Circulation Trends</SectionHeading>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: PALETTE.muted }}>
            Loan activity over the past 7 days
          </p>
          <div style={{ width: '100%', height: 260, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-loans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--green)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={PALETTE.border} />
                <XAxis
                  dataKey="date"
                  axisLine={false} tickLine={false}
                  tick={{ fill: PALETTE.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fill: PALETTE.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: PALETTE.border, strokeWidth: 1 }} />
                <Area
                  type="monotone" dataKey="loans"
                  stroke="var(--green)" strokeWidth={2.5}
                  fillOpacity={1} fill="url(#grad-loans)"
                  dot={{ r: 4, fill: '#fff', stroke: 'var(--green)', strokeWidth: 2.5 }}
                  activeDot={{ r: 6, fill: 'var(--green)', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Books */}
        <div className="ld-fade" style={{ ...cardStyle, animationDelay: '0.65s', minWidth: 0 }}>
          <SectionHeading>Most Popular Books</SectionHeading>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: PALETTE.muted }}>
            Ranked by total transactions
          </p>

          {topBooks.length > 0 ? (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {topBooks.map((book, i) => (
                <li
                  key={i}
                  className="ld-book-row"
                  style={{
                    padding: '10px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    cursor: 'default',
                    minWidth: 0,       // ← fix 1
                    overflow: 'hidden', // ← fix 2
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    minWidth: 0,       // ← fix 3
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      minWidth: 0,
                      flex: 1,         // ← fix 4
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: i === 0 ? 'var(--maroon)' : PALETTE.ivoryDk,
                        color: i === 0 ? '#fff' : PALETTE.muted,
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: PALETTE.text,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {book.title}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: 'var(--green)',
                      flexShrink: 0,
                      background: 'rgba(125,179,86,0.1)',
                      padding: '2px 8px', borderRadius: 20,
                    }}>
                      {book.count}×
                    </span>
                  </div>
                  <div style={{ height: 3, background: PALETTE.ivoryDk, borderRadius: 99, overflow: 'hidden', marginLeft: 32 }}>
                    <div
                      className="ld-bar-fill"
                      style={{
                        height: '100%',
                        width: `${(book.count / maxCount) * 100}%`,
                        background: i === 0 ? 'var(--maroon)' : 'var(--green)',
                        borderRadius: 99,
                        opacity: i === 0 ? 0.8 : 0.6,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: PALETTE.muted, fontSize: 13,
            }}>
              <FaBook style={{ fontSize: 28, opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
              No transaction data yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeading({ children }) {
  return (
    <h3 style={{
      margin: '0 0 2px',
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: 17,
      fontWeight: 600,
      color: PALETTE.text,
      letterSpacing: '-0.2px',
    }}>
      {children}
    </h3>
  );
}

function StatCard({ label, value, accent, icon, loading }) {
  return (
    <div
      className="ld-stat"
      style={{
        background: '#ffffff',
        border: `1px solid ${PALETTE.border}`,
        borderRadius: 14,
        padding: '20px 20px 22px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: accent,
        borderRadius: '14px 14px 0 0',
      }} />

      {/* icon watermark */}
      <div style={{
        position: 'absolute', bottom: -8, right: 10,
        fontSize: 64, color: accent, opacity: 0.05,
        lineHeight: 1, pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {icon}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: `${accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, fontSize: 16,
        }}>
          {icon}
        </div>
      </div>

      <div style={{ fontSize: 11, color: PALETTE.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontSize: loading ? 28 : 'clamp(26px, 3vw, 32px)',
        fontWeight: 600,
        color: loading ? PALETTE.border : PALETTE.text,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '-1px',
        lineHeight: 1,
        transition: 'color 0.4s ease',
        background: loading ? PALETTE.ivoryDk : 'transparent',
        borderRadius: loading ? 6 : 0,
        minWidth: loading ? 48 : 'auto',
        minHeight: 32,
      }}>
        {loading ? '' : value.toLocaleString()}
      </div>
    </div>
  );
}

const cardStyle = {
  background: '#ffffff',
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 16,
  padding: '24px 24px 20px',
};