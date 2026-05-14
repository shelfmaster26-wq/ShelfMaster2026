import React, { useEffect, useState } from 'react';
import { localDb } from './localDbClient';
import Toast from './Toast';
import { getServerNow } from './serverTime';
import BookLoader from './BookLoader';

export default function BookCatalog() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    const { data } = await localDb.from('books').select('*');
    setBooks(data || []);
    setLoading(false);
  }

  const handleBorrow = async (bookId, currentStock) => {
    if (currentStock <= 0) {
      showToast('Out of stock!', 'warning');
      return;
    }

    const { data: { user } } = await localDb.auth.getUser();
    if (!user) {
      showToast('Please login as a student first!', 'warning');
      return;
    }

    const serverNow = await getServerNow();
    const { error: transactionError } = await localDb
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          book_id: bookId,
          transaction_type: 'borrow',
          due_date: new Date(serverNow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ]);

    if (!transactionError) {
      const { error: updateError } = await localDb
        .from('books')
        .update({ available_stock: currentStock - 1 })
        .eq('id', bookId);

      if (updateError) showToast('Error updating stock.', 'error');
      else {
        showToast('Book borrowed successfully!', 'success');
        fetchBooks();
      }
    } else {
      showToast(transactionError.message, 'error');
    }
  };

  if (loading) return <BookLoader message="Loading books" />;

  return (
    <div style={{ padding: '2rem' }}>
      <Toast {...toast} onClose={() => setToast({ message: '' })} />
      <h2>Available Books</h2>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {books.map((book) => (
          <div key={book.id} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
            <h3>{book.title}</h3>
            <p>Author: {book.authors}</p>
            <p>Stock: {book.available_stock}</p>
            <button
              onClick={() => handleBorrow(book.id, book.available_stock)}
              disabled={book.available_stock <= 0}
              style={{
                backgroundColor: book.available_stock > 0 ? '#10b981' : '#d1d5db',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {book.available_stock > 0 ? 'Borrow' : 'Out of Stock'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
