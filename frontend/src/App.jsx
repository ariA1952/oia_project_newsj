import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './modules/metrics/pages/Dashboard';
import DataEntry from './modules/metrics/pages/DataEntry';
import Review from './modules/metrics/pages/Review';
import Reports from './modules/metrics/pages/Reports';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="app__nav">
          <div className="app__nav-brand">
            <h2>Metrics Module</h2>
          </div>
          <div className="app__nav-links">
            <Link to="/dashboard" className="app__nav-link">
              Dashboard
            </Link>
            <Link to="/data-entry" className="app__nav-link">
              Data Entry
            </Link>
            <Link to="/review" className="app__nav-link">
              Review & Approval
            </Link>
            <Link to="/reports" className="app__nav-link">
              Reports
            </Link>
          </div>
        </nav>

        <main className="app__main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data-entry" element={<DataEntry />} />
            <Route path="/review" element={<Review />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
