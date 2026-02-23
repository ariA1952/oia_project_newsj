import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  FileCheck,
  BarChart3,
  LogOut,
  User as UserIcon,
  Bell,
  Settings,
  Building2
} from 'lucide-react';
import Dashboard from './modules/metrics/pages/Dashboard';
import DataEntry from './modules/metrics/pages/DataEntry';
import Review from './modules/metrics/pages/Review';
import Reports from './modules/metrics/pages/Reports';
import Partners from './modules/metrics/pages/Partners';
import LoginPage from './modules/auth/pages/LoginPage';
import { AuthProvider, useAuth } from './common/AuthContext';
import ProtectedRoute from './common/ProtectedRoute';
import './App.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/data-entry', label: 'Data Entry', icon: <ClipboardList size={20} /> },
    { path: '/review', label: 'Review', icon: <FileCheck size={20} /> },
    { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
    { path: '/partners', label: 'Partners', icon: <Building2 size={20} /> },
  ];

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
        <div className="user-info">
          <div className="user-avatar">
            <UserIcon size={20} />
          </div>
          <div className="user-details">
            <span className="user-name">{user?.id || 'User'}</span>
            <span className="user-role">
              {user?.erp_users_type?.replace('_', ' ') || 'Guest'}
            </span>
          </div>
        </div>
        <button onClick={logout} className="logout-button">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <header className="content-header">
          <div className="header-search">
            {/* Search removed as requested */}
          </div>
          <div className="header-actions">
            <button className="icon-btn"><Bell size={20} /></button>
            <button className="icon-btn"><Settings size={20} /></button>
          </div>
        </header>
        <div className="content-inner">
          {children}
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

          <Route path="/" element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } />

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

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
