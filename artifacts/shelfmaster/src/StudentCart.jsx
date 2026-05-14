import React, { useState, useEffect } from 'react';
import { localDb } from './localDbClient';
import StudentNavbar from './StudentNavbar';

export default function StudentCart() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  async function fetchPendingRequests() {
    const { data: { user } } = await localDb.auth.getUser();
    if (user) {
      const { data } = await localDb
        .from('transactions')
        .select('id, created_at, status, books(title, authors)')
        .eq('user_id', user.id)
        .eq('status', 'pending');
      setRequests(data || []);
    }
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh' }}>
      <StudentNavbar userName="Jane Doe" />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
        <h2 style={{ color: 'var(--maroon)', marginBottom: '20px' }}>Borrowing Requests</h2>
        
        <div style={{ background: 'white', borderRadius: '15px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          {requests.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b' }}>No pending requests at the moment.</p>
          ) : (
            requests.map(req => (
              <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{req.books?.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Requested on {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <span style={{ background: 'var(--yellow)', color: 'var(--maroon)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  PENDING APPROVAL
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}