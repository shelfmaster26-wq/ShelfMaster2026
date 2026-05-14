import React from 'react';
import { FaCog } from "react-icons/fa";
import myLogo from './assets/logo.png';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

// Public Pages
import Home from './Home';
import Login from './Login';
import Signup from './Signup';
import VerifyEmail from './VerifyEmail';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

// Student Pages
import StudentRoute from './StudentRoute';
import StudentHome from './StudentHome';
import StudentCatalog from './StudentCatalog';
import StudentEbooks from './StudentEbooks';
import StudentBooks from './StudentBooks';
import StudentProfile from './StudentProfile'

// Librarian Pages
import LibrarianLayout from './LibrarianLayout';
import LibrarianDashboard from './LibrarianDashboard';
import Inventory from './Inventory';
import UserManagement from './UserManagement';
import PendingRequests from './PendingRequests';
import ProcessReturns from './ProcessReturns';
import Settings from './Settings';
import BorrowingHistory from './BorrowingHistory';
import WalkIn from './WalkIn';

export default function App() {
  return (
    <Router>
      <ConditionalNavbar />
      <Routes>
        {/* 1. PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* 2. STUDENT ROUTES — wrapped in StudentRoute to enforce role + cross-tab session safety */}
        <Route path="/student/home"      element={<StudentRoute><StudentHome /></StudentRoute>} />
        <Route path="/student/dashboard" element={<StudentRoute><StudentHome /></StudentRoute>} />
        <Route path="/student/catalog"   element={<StudentRoute><StudentCatalog /></StudentRoute>} />
        <Route path="/student/ebooks"    element={<StudentRoute><StudentEbooks /></StudentRoute>} />
        <Route path="/student/cart"      element={<Navigate to="/student/books" replace />} />
        <Route path="/student/books"     element={<StudentRoute><StudentBooks /></StudentRoute>} />
        <Route path="/student/profile"   element={<StudentRoute><StudentProfile /></StudentRoute>} />

        {/* 3. LIBRARIAN ROUTES (Nested inside LibrarianLayout) */}
        <Route path="/librarian" element={<LibrarianLayout />}>
          <Route path="dashboard" element={<LibrarianDashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="requests" element={<PendingRequests />} />
          <Route path="walkin" element={<WalkIn />} />
          <Route path="returns" element={<ProcessReturns />} />
          <Route path="settings" element={<Settings />} />
          <Route path="history" element={<BorrowingHistory />} />
        </Route>
      </Routes>
    </Router>
  );
}

/**
 * Helper component that hides the public Navbar on internal portal pages
 * and Auth pages (Login/Signup) to prevent "double navbars".
 */
function ConditionalNavbar() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // Hide the public navbar if on these specific paths or starting with these prefixes
  
  const isInternalPage = 
    path.startsWith('/librarian') || 
    path.startsWith('/student') || 
    path === '/login' || 
    path === '/signup' ||
    path === '/verify' ||
    path === '/forgot-password' ||
    path === '/reset-password';

  if (isInternalPage) return null;
  

  return (
    <nav className="navbar">
      <Link to="/" className="logo-container">
        <img src={myLogo} alt="Logo" className="logo-img" style={{height: '40px', width: '40px'}} />
        <span className="logo-text">ShelfMaster</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/login" className="btn-sign-in">Sign In</Link>
      </div>
    </nav>
  );
}