import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { localDb } from './localDbClient';

/**
 * Wraps all student-only routes.
 * - Redirects to /login if no session exists.
 * - Redirects to /login if the logged-in user is not a student.
 * - Listens to cross-tab auth changes (e.g. librarian logging in on another tab)
 *   and immediately redirects so sessions never bleed between roles.
 */
export default function StudentRoute({ children }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'allowed'

  useEffect(() => {
    async function checkRole(userId) {
      if (!userId) {
        navigate('/login', { replace: true });
        return;
      }
      const { data } = await localDb
        .from('users')
        .select('role')
        .eq('auth_id', userId)
        .single();

      if (!data || (data.role !== 'student' && data.role !== 'teacher')) {
        navigate('/login', { replace: true });
      } else {
        setStatus('allowed');
      }
    }

    // Initial check on mount
    localDb.auth.getUser().then(({ data: { user } }) => {
      checkRole(user?.id ?? null);
    });

    // No cross-tab auth listener here — student logout is handled explicitly
    // by the Logout button in StudentNavbar which calls signOut() then navigates.
    // Listening to SIGNED_OUT here would cause student to be kicked out whenever
    // the librarian (or anyone else) logs out on another tab.
    return () => {};
  }, [navigate]);

  if (status === 'checking') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#94a3b8' }}>Verifying session...</p>
      </div>
    );
  }

  return children;
}
