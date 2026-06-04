import { useState, useEffect, useCallback } from 'react';
import { Plane, Plus, CheckCircle, XCircle, HelpCircle, Trash2, Edit2, Send, Eye, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../../common/AuthContext';
import ActionButton from '../../../common/ActionButton';
import Notification from '../../../common/Notification';
import TravelFormPanel from './TravelFormPanel';
import {
  listTravelSummaries, deleteTravelSummary,
  approveTravelSummary, rejectTravelSummary, requestTravelClarification,
} from '../services/outgoingFacultyService';
import './OutgoingFaculty.css';

const STATUS_LABEL = { DRAFT:'Draft', SUBMITTED:'Submitted', APPROVED:'Approved', REJECTED:'Rejected', CLARIFICATION_REQUESTED:'Clarification' };

// ── HOD Review Detail Modal ──────────────────────────────────────────────────
const ReviewModal = ({ summary, onClose, onAction }) => {
  const [remarks, setRemarks] = useState('');
  const [mode, setMode] = useState(null); // 'reject' | 'clarify'
  const [loading, setLoading] = useState(false);

  const act = async (fn) => {
    if ((mode === 'reject' || mode === 'clarify') && !remarks.trim()) return;
    setLoading(true);
    try { await fn(); onAction(); onClose(); }
    catch (e) { alert(e?.detail || 'Action failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="outfac__detail-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="outfac__detail-modal">
        <div className="outfac__detail-modal-header">
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{summary.faculty_name} — Travel Report #{summary.summary_id}</div>
            <span className={`status-badge status-badge--${summary.status.toLowerCase().replace(/_/g, '-')}`} style={{ marginTop: 4, display: 'inline-block' }}>
              {STATUS_LABEL[summary.status] || summary.status}
            </span>
          </div>
          <button className="outfac__panel-close" onClick={onClose}><XCircle size={16} /></button>
        </div>

        <div className="outfac__detail-modal-body">
          {/* Visit Details */}
          <div className="outfac__review-block">
            <h4>📋 Visit Details</h4>
            {[['Faculty', summary.faculty_name], ['Place', summary.place],
              ['Dates', `${summary.visit_start_date || '—'} → ${summary.visit_end_date || '—'}`],
              ['Purpose', summary.purpose]].map(([l, v]) => v ? (
              <div key={l} className="outfac__review-row">
                <span className="outfac__review-label">{l}:</span>
                <span className="outfac__review-val">{v}</span>
              </div>
            ) : null)}
          </div>

          {/* Universities */}
          <div className="outfac__review-block">
            <h4>🌐 Universities Visited ({(summary.universities_visited || []).length})</h4>
            {(summary.universities_visited || []).map((u, i) => (
              <div key={i} className="outfac__review-item">{i + 1}. {u.university_name}</div>
            ))}
          </div>

          {/* Contacts */}
          {(summary.contacts || []).length > 0 && (
            <div className="outfac__review-block">
              <h4>👥 Key Contacts ({summary.contacts.length})</h4>
              {summary.contacts.map((c, i) => (
                <div key={i} className="outfac__review-item">
                  <div className="outfac__review-item-title">{c.name}</div>
                  {(c.university_name || c.department) && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.university_name}{c.department ? ` — ${c.department}` : ''}</div>}
                  {c.email && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{c.email}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Action Items */}
          <div className="outfac__review-block">
            <h4>⚡ Action Items ({(summary.action_items || []).length})</h4>
            {(summary.action_items || []).map((ai, i) => {
              const statusKey = (ai.status || 'planned').toLowerCase().replace(' ', '_');
              return (
                <div key={i} className="outfac__review-item">
                  <div className="outfac__review-item-title" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {i + 1}. {ai.category}
                    <span className={`outfac__ai-status-chip outfac__ai-status-chip--${statusKey}`}>{ai.status}</span>
                  </div>
                  {ai.agenda && <div style={{ fontSize: '0.8rem', color: '#6366f1', margin: '3px 0' }}>{ai.agenda}</div>}
                  {ai.progress && <div style={{ fontSize: '0.82rem' }}>{ai.progress}</div>}
                  {(ai.planned_start_date || ai.planned_closure_date) && (
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 3 }}>{ai.planned_start_date} → {ai.planned_closure_date}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Remarks input */}
          {mode && (
            <div style={{ marginTop: 16 }}>
              <label className="outfac__label" style={{ marginBottom: 6, display: 'block' }}>
                {mode === 'reject' ? 'Rejection Remarks *' : 'Clarification Details *'}
              </label>
              <textarea className="outfac__textarea" rows={3} value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder={mode === 'reject' ? 'Enter reason for rejection...' : 'Describe what clarification is needed...'} />
            </div>
          )}
        </div>

        <div className="outfac__detail-modal-footer">
          {summary.status === 'SUBMITTED' && !mode && (
            <>
              <ActionButton variant="success" onClick={() => act(() => approveTravelSummary(summary.summary_id))} disabled={loading}>
                <CheckCircle size={14} /> Approve
              </ActionButton>
              <ActionButton variant="danger" onClick={() => setMode('reject')}>
                <XCircle size={14} /> Reject
              </ActionButton>
              <ActionButton variant="warning" onClick={() => setMode('clarify')}>
                <HelpCircle size={14} /> Clarification
              </ActionButton>
            </>
          )}
          {mode === 'reject' && (
            <>
              <ActionButton variant="secondary" onClick={() => setMode(null)}>Cancel</ActionButton>
              <ActionButton variant="danger" onClick={() => act(() => rejectTravelSummary(summary.summary_id, remarks))} disabled={loading || !remarks.trim()}>
                {loading ? 'Rejecting…' : 'Confirm Reject'}
              </ActionButton>
            </>
          )}
          {mode === 'clarify' && (
            <>
              <ActionButton variant="secondary" onClick={() => setMode(null)}>Cancel</ActionButton>
              <ActionButton variant="warning" onClick={() => act(() => requestTravelClarification(summary.summary_id, remarks))} disabled={loading || !remarks.trim()}>
                {loading ? 'Sending…' : 'Send Clarification Request'}
              </ActionButton>
            </>
          )}
          <ActionButton variant="secondary" onClick={onClose}>Close</ActionButton>
        </div>
      </div>
    </div>
  );
};

// ── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ s, userRole, onEdit, onView, onDelete, isSuperAdmin }) => {
  const st = s.status || 'DRAFT';
  const cardClass = `outfac__card outfac__card--${st.toLowerCase().replace(/_/g, '_')}`;
  const isFaculty = userRole === 'FACULTY';
  const isReviewer = ['HOD', 'COORDINATOR', 'OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const canEdit = isFaculty && ['DRAFT', 'CLARIFICATION_REQUESTED'].includes(st);
  const unis = s.universities_visited || [];
  const ais = s.action_items || [];

  return (
    <div className={cardClass}>
      <div className="outfac__card-top">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="outfac__card-title">
            {s.faculty_name} — {s.place || 'Travel Report'} #{s.summary_id}
          </div>
          <div className="outfac__card-meta">
            {(s.visit_start_date || s.visit_end_date) && (
              <span><Calendar size={12} /> {s.visit_start_date || '—'} → {s.visit_end_date || '—'}</span>
            )}
            {s.place && <span><MapPin size={12} /> {s.place}</span>}
            {!isFaculty && s.creator_name && <span>By: {s.creator_name}</span>}
            <span className={`status-badge status-badge--${st.toLowerCase().replace(/_/g, '-')}`}>
              {STATUS_LABEL[st] || st}
            </span>
          </div>
          {unis.length > 0 && (
            <div className="outfac__chip-row">
              {unis.slice(0, 3).map((u, i) => <span key={i} className="outfac__chip">🌐 {u.university_name}</span>)}
              {unis.length > 3 && <span className="outfac__chip">+{unis.length - 3} more</span>}
            </div>
          )}
          {(st === 'REJECTED' || st === 'CLARIFICATION_REQUESTED') && s.rejection_remarks && (
            <div className={`outfac__remarks outfac__remarks--${st === 'CLARIFICATION_REQUESTED' ? 'clarify' : 'reject'}`} style={{ marginTop: 8 }}>
              <strong>{st === 'CLARIFICATION_REQUESTED' ? 'Clarification: ' : 'Rejected: '}</strong>
              {s.rejection_remarks}
            </div>
          )}
        </div>
        <div className="outfac__card-actions">
          {canEdit && (
            <ActionButton variant="secondary" onClick={() => onEdit(s)}>
              <Edit2 size={13} /> Edit
            </ActionButton>
          )}
          {isReviewer && st === 'SUBMITTED' && (
            <ActionButton variant="primary" onClick={() => onView(s)}>
              <Eye size={13} /> Review
            </ActionButton>
          )}
          {(isReviewer && st !== 'SUBMITTED') && (
            <ActionButton variant="secondary" onClick={() => onView(s)}>
              <Eye size={13} /> View
            </ActionButton>
          )}
          {isFaculty && st === 'DRAFT' && (
            <ActionButton variant="danger" onClick={() => onDelete(s.summary_id)}>
              <Trash2 size={13} />
            </ActionButton>
          )}
          {isSuperAdmin && (
            <ActionButton variant="danger" onClick={() => onDelete(s.summary_id)}>
              <Trash2 size={13} />
            </ActionButton>
          )}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#94a3b8' }}>
        {ais.length} action item{ais.length !== 1 ? 's' : ''} · {(s.contacts || []).length} contact{(s.contacts || []).length !== 1 ? 's' : ''}
        {s.academic_year_name ? ` · ${s.academic_year_name}` : ''}
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const OutgoingFaculty = () => {
  const { user } = useAuth();
  const userRole = user?.erp_users_type;
  const isFaculty = userRole === 'FACULTY';
  const isReviewer = ['HOD', 'COORDINATOR', 'OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'review'
  const [showPanel, setShowPanel] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [reviewSummary, setReviewSummary] = useState(null);

  const facultyName = user?.erp_users_name || '';

  const notify = (message, type = 'success') => setNotification({ message, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTravelSummaries();
      setSummaries(data);
    } catch (e) {
      notify(e?.detail || 'Failed to load summaries', 'error');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this travel summary?')) return;
    try {
      await deleteTravelSummary(id);
      notify('Deleted successfully');
      fetchData();
    } catch (e) { notify(e?.detail || 'Failed to delete', 'error'); }
  };

  const handleSaved = (result, submitted) => {
    fetchData();
    if (submitted) { setShowPanel(false); setEditingSummary(null); }
    else {
      // update editing reference so panel knows the ID
      setEditingSummary(result);
    }
  };

  const openNew = () => { setEditingSummary(null); setShowPanel(true); };
  const openEdit = (s) => { setEditingSummary(s); setShowPanel(true); };
  const closePanel = () => { setShowPanel(false); setEditingSummary(null); fetchData(); };

  // Derived lists
  const mineSummaries = isFaculty
    ? summaries
    : summaries.filter(s => s.created_user_id === user?.erp_users_id);
  const reviewSummaries = summaries.filter(s => s.status === 'SUBMITTED');
  const pendingCount = reviewSummaries.length;

  const displayList = activeTab === 'review' ? reviewSummaries : (isReviewer ? summaries : mineSummaries);

  return (
    <div className="outfac">
      {/* Header */}
      <div className="outfac__header">
        <div>
          <h1 className="outfac__title"><Plane size={26} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />Outgoing Faculty</h1>
          <p className="outfac__subtitle">Staff Travel Summary — International Collaboration Reporting</p>
        </div>
        {(isFaculty || isSuperAdmin) && (
          <ActionButton variant="primary" onClick={openNew}>
            <Plus size={15} /> New Travel Report
          </ActionButton>
        )}
      </div>

      {/* Tabs */}
      <div className="outfac__tabs">
        {isFaculty && (
          <button className={`outfac__tab${activeTab === 'mine' ? ' outfac__tab--active' : ''}`} onClick={() => setActiveTab('mine')}>
            My Reports
            <span className="outfac__tab__badge">{mineSummaries.length}</span>
          </button>
        )}
        {isReviewer && (
          <>
            <button className={`outfac__tab${activeTab === 'mine' ? ' outfac__tab--active' : ''}`} onClick={() => setActiveTab('mine')}>
              All Reports
              <span className="outfac__tab__badge">{summaries.length}</span>
            </button>
            <button className={`outfac__tab${activeTab === 'review' ? ' outfac__tab--active' : ''}`} onClick={() => setActiveTab('review')}>
              Pending Review
              <span className={`outfac__tab__badge${pendingCount > 0 ? ' outfac__tab__badge--warn' : ''}`}>{pendingCount}</span>
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="outfac__loader"><div className="outfac__spinner" /></div>
      ) : displayList.length === 0 ? (
        <div className="outfac__empty">
          <AlertCircle size={48} />
          <p>{activeTab === 'review' ? 'No reports pending review.' : 'No travel reports yet. Click "New Travel Report" to get started.'}</p>
        </div>
      ) : (
        <div className="outfac__list">
          {displayList.map(s => (
            <SummaryCard
              key={s.summary_id}
              s={s}
              userRole={userRole}
              isSuperAdmin={isSuperAdmin}
              onEdit={openEdit}
              onView={setReviewSummary}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Panel */}
      {showPanel && (
        <TravelFormPanel
          initial={editingSummary}
          onClose={closePanel}
          onSaved={handleSaved}
          facultyName={facultyName}
        />
      )}

      {/* HOD Review Modal */}
      {reviewSummary && (
        <ReviewModal
          summary={reviewSummary}
          onClose={() => setReviewSummary(null)}
          onAction={() => { fetchData(); setReviewSummary(null); }}
        />
      )}

      {/* Notification */}
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </div>
  );
};

export default OutgoingFaculty;
