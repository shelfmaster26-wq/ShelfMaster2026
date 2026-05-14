import React, { useState, useEffect } from 'react';
import { localDb } from './localDbClient';
import StudentNavbar from './StudentNavbar';
import { FaSearch } from 'react-icons/fa';
import { MdTabletMac } from 'react-icons/md';
import BookLoader from './BookLoader';

export default function StudentEbooks() {
  const [ebooks, setEbooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('title-asc');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEbooks();
  }, []);

  async function fetchEbooks() {
    setLoading(true);
    const { data, error } = await localDb
      .from('books')
      .select('*')
      .eq('book_type', 'eBook')
      .neq('status', 'archived');
    if (!error) setEbooks(data || []);
    setLoading(false);
  }

  const getCategory = (e) => e.category || e.genre || e.subject || 'General';

  const categories = ['All', ...new Set(ebooks.map(getCategory))].sort();

  const filtered = ebooks
    .filter(e => {
      const s = searchTerm.toLowerCase();
      const cat = getCategory(e);
      return (
        (e.title?.toLowerCase().includes(s) || e.authors?.toLowerCase().includes(s) || cat.toLowerCase().includes(s)) &&
        (categoryFilter === 'All' || cat === categoryFilter)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
      if (sortBy === 'author-asc') return (a.authors || '').localeCompare(b.authors || '');
      return 0;
    });

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <style>{`
        .eb-wrap { max-width: 1200px; margin: 0 auto; padding: 40px 20px; }
        .eb-filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .eb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
        .eb-card { background: white; border-radius: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); display: flex; flex-direction: column; overflow: hidden; text-decoration: none; color: inherit; transition: transform 0.15s, box-shadow 0.15s; }
        .eb-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }

        @media (max-width: 600px) {
          .eb-wrap { padding: 24px 14px; }
          .eb-filters { flex-direction: column; gap: 8px; }
          .eb-filters > * { width: 100%; box-sizing: border-box; }
          .eb-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
        }
        @media (min-width: 601px) and (max-width: 900px) {
          .eb-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <StudentNavbar />

      <div className="eb-wrap">
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ color: 'var(--maroon)', margin: '0 0 6px 0' }}>
            <MdTabletMac style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            eBooks
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Click any eBook to open the link in a new tab.
          </p>
        </div>

        {/* Filters row — same pattern as StudentCatalog */}
        <div className="eb-filters">
          {/* Search */}
          <div style={{ position: 'relative', flex: '2', minWidth: '200px' }}>
            <FaSearch style={{
              position: 'absolute', left: 13, top: '50%',
              transform: 'translateY(-50%)', color: '#94a3b8',
              fontSize: '0.85rem', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Search title, author, or category..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px 11px 40px',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                fontSize: '0.93rem',
                background: 'white',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Category select */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '11px 14px', borderRadius: 10,
              border: '1px solid #e2e8f0', fontSize: '0.9rem',
              background: 'white', cursor: 'pointer',
              outline: 'none', minWidth: '160px',
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          {/* Sort select */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding: '11px 14px', borderRadius: 10,
              border: '1px solid #e2e8f0', fontSize: '0.9rem',
              background: 'white', cursor: 'pointer',
              outline: 'none', minWidth: '150px',
            }}
          >
            <option value="title-asc">Title A → Z</option>
            <option value="title-desc">Title Z → A</option>
            <option value="author-asc">Author A → Z</option>
          </select>
        </div>

        {/* Results */}
        {loading ? (
          <BookLoader inline message="Loading eBooks" />
        ) : (
          <>
            <p style={{ color: '#64748b', marginBottom: 16, fontSize: '0.88rem' }}>
              Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'eBook' : 'eBooks'}
            </p>
            <div className="eb-grid">
              {filtered.length > 0 ? filtered.map(ebook => {
                const cat = getCategory(ebook);
                return (
                  <a
                    key={ebook.id}
                    href={ebook.source || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eb-card"
                  >
                    {/* Cover */}
                    <div style={{
                      height: '160px',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      padding: '12px', boxSizing: 'border-box', position: 'relative',
                    }}>
                      {cat && cat !== 'General' && (
                        <span style={{
                          position: 'absolute', top: 8, right: 8,
                          background: 'rgba(255,255,255,0.2)', color: 'white',
                          fontSize: '0.62rem', fontWeight: 700,
                          padding: '3px 7px', borderRadius: 20,
                          backdropFilter: 'blur(4px)',
                        }}>
                          {cat}
                        </span>
                      )}
                      <span style={{ fontSize: '2.4rem', marginBottom: '6px' }}>
                        <MdTabletMac style={{ verticalAlign: 'middle', color: 'white' }} />
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                        eBook
                      </span>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{
                        fontSize: '0.62rem', background: '#eef2ff', color: '#4f46e5',
                        padding: '3px 8px', borderRadius: 20, fontWeight: 700,
                        alignSelf: 'flex-start', marginBottom: 7,
                        textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {cat}
                      </div>
                      <h3 style={{ fontSize: '0.95rem', color: '#1e293b', margin: '0 0 3px', fontWeight: 700, lineHeight: 1.3 }}>
                        {ebook.title}
                      </h3>
                      {ebook.authors && (
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0 0 12px', flexGrow: 1 }}>
                          by {ebook.authors}
                        </p>
                      )}
                      <div style={{
                        marginTop: 'auto', background: '#eef2ff', color: '#6366f1',
                        textAlign: 'center', padding: '8px 0', borderRadius: '8px',
                        fontWeight: 700, fontSize: '0.82rem',
                      }}>
                        Open Link ↗
                      </div>
                    </div>
                  </a>
                );
              }) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px' }}>
                  <p style={{ fontSize: '1.05rem', color: '#94a3b8' }}>No eBooks found matching your filters.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}