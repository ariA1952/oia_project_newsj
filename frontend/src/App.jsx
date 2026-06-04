import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  FileCheck,
  BarChart3,
  LogOut,
  Building2,
  FileText,
  Plane
}
  from 'lucide-react';
import Dashboard from './modules/metrics/pages/Dashboard';
import DataEntry from './modules/metrics/pages/DataEntry';
import Review from './modules/metrics/pages/Review';
import Reports from './modules/metrics/pages/Reports';
import Partners from './modules/metrics/pages/Partners';
import MOU from './modules/metrics/pages/MOU';
import OutgoingFaculty from './modules/metrics/pages/OutgoingFaculty';
import LoginPage from './modules/auth/pages/LoginPage';
import { AuthProvider, useAuth } from './common/AuthContext';
import ProtectedRoute from './common/ProtectedRoute';
import ErrorBoundary from './common/ErrorBoundary';
import './App.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    {
      path: '/data-entry',
      label: 'Data Entry',
      icon: <ClipboardList size={20} />,
      roles: ['OIA_ADMIN', 'SUPER_ADMIN', 'FACULTY'],   // HOD cannot enter data
    },
    { path: '/review', label: 'Review', icon: <FileCheck size={20} /> },
    { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
    { path: '/partners', label: 'Partners', icon: <Building2 size={20} /> },
    {
      path: '/mou',
      label: 'MOU',
      icon: <FileText size={20} />,
      // All roles can access (RBAC enforced inside the page)
    },
    {
      path: '/outgoing-faculty',
      label: 'Outgoing Faculty',
      icon: <Plane size={20} />,
    },
  ].filter(item => !item.roles || item.roles.includes(user?.erp_users_type));

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">OIA</div>
        <h2>International Affairs</h2>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer__row">
          <div className="user-avatar">
            {String(user?.erp_users_name || user?.id || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.erp_users_name || user?.id || 'User'}</span>
            <span className="user-role">
              {user?.erp_users_type?.replace('_', ' ') || 'Guest'}
            </span>
          </div>
          <button onClick={logout} className="logout-button" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="content-inner">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/data-entry" element={
            <ProtectedRoute>
              <Layout><DataEntry /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/review" element={
            <ProtectedRoute>
              <Layout><Review /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/partners" element={
            <ProtectedRoute>
              <Layout><Partners /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/mou" element={
            <ProtectedRoute>
              <Layout><MOU /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/outgoing-faculty" element={
            <ProtectedRoute>
              <Layout><OutgoingFaculty /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
