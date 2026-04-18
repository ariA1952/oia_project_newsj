import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send, CheckCircle, XCircle, AlertCircle,
    HelpCircle, FileText, Globe, Calendar,
    ChevronDown, ChevronRight, Trash2, Edit2,
    Download, User,
} from 'lucide-react';
import FilterBar from '../components/FilterBar';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import ClarificationChat from '../components/ClarificationChat';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import useUserProfile from '../hooks/useUserProfile';
import {
    updateCollaborationActivity,
    getCollaborationActivities,
    submitCollaborationActivity,
    approveCollaborationActivity,
    rejectCollaborationActivity,
    requestClarification,
    sendClarificationReply,
    downloadActivityDocument,
    deleteCollaborationActivity,
    getPartnerUniversities,
} from '../services/metricsService';
import { getParamConfig, docKey } from '../config/parameterConfigs';
import ActivityDetailsPopup from '../components/ActivityDetailsPopup';
import './Review.css';

// ─── Helpers ────────────────────────────────────────────────────────────────────

const statusClass = (status) => (status ?? '').toLowerCase().replace(/_/g, '-');

const STATUS_ORDER = ['SUBMITTED', 'CLARIFICATION_REQUESTED', 'DRAFT', 'REJECTED', 'APPROVED'];
const sortByStatus = (a, b) =>
    (STATUS_ORDER.indexOf(a.status) ?? 99) - (STATUS_ORDER.indexOf(b.status) ?? 99);

const countByStatus = (activities) => {
    const counts = {};
    activities.forEach((a) => {
        const s = a.status ?? 'DRAFT';
        counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
};

// ─── Level 3: Row Field Summary ──────────────────────────────────────────────

const RowFieldSummary = memo(({ row, config, universities }) => {
    const getUniNames = (ids) =>
        (ids ?? [])
            .map((id) =>
                universities.find((u) => String(u.university_id) === String(id))?.university_name ?? `ID:${id}`
            )
            .join(', ') || '—';

    const paramFields = (config?.fields ?? []).filter(
        (f) => !['partner_universities', 'start_date', 'end_date'].includes(f.id)
    );
    const uniField = config?.fields?.find((f) => f.id === 'partner_universities');
    const dateFields = (config?.fields ?? []).filter((f) =>
        ['start_date', 'end_date'].includes(f.id)
    );

    return (
        <div className="rv-row-fields">
            {uniField && (
                <div className="rv-row-field">
                    <Globe size={13} className="rv-row-field__icon" />
                    <span className="rv-row-field__label">{uniField.label}:</span>
                    <span>{getUniNames(row.partner_universities)}</span>
                </div>
            )}

            {dateFields.map((f) => {
                const val = f.id === 'start_date' ? row.start_date : row.end_date;
                if (!val) return null;
                return (
                    <div key={f.id} className="rv-row-field">
                        <Calendar size={13} className="rv-row-field__icon" />
                        <span className="rv-row-field__label">{f.label}:</span>
                        <span>{val}</span>
                    </div>
                );
            })}

            {paramFields.map((f) => {
                const val = row.fields?.[f.id];
                if (!val && val !== 0) return null;
                return (
                    <div key={f.id} className="rv-row-field">
                        <span className="rv-row-field__label">{f.label}:</span>
                        <span>{String(val)}</span>
                    </div>
                );
            })}

            {/* Document badges per row */}
            {Object.entries(row.documents ?? {}).some(([, v]) => Array.isArray(v) && v.length > 0) && (
                <div className="rv-row-docs">
                    {config?.documents
                        .filter((d) => {
                            const k = docKey(d);
                            return Array.isArray(row.documents?.[k]) && row.documents[k].length > 0;
                        })
                        .map((d) => (
                            <span key={d} className="rv-doc-btn" title={d}>
                                <FileText size={11} /> {d}
                            </span>
                        ))}
                </div>
            )}
        </div>
    );
});
RowFieldSummary.displayName = 'RowFieldSummary';

// ─── Level 3: Row Detail Panel (lazy rendered) ──────────────────────────────

const RowDetailPanel = memo(({ activity, config, universities, onViewDoc }) => {
    const rows = activity.activity_data?.rows ?? [];
    if (rows.length === 0) return <div className="rv-rows-panel" style={{ color: '#9ca3af', fontSize: 13 }}>No row data.</div>;

    return (
        <div className="rv-rows-panel">
            {rows.map((row, ri) => (
                <div key={ri} className="rv-row-card">
                    <span className="rv-row-card__label">Entry {ri + 1}</span>
                    <RowFieldSummary row={row} config={config} universities={universities} />

                    {/* Per-row document downloads */}
                    {Object.entries(row.documents ?? {}).some(([, v]) => Array.isArray(v) && v.length > 0) && (
                        <div className="rv-row-docs" style={{ marginTop: 4 }}>
                            <button
                                type="button"
                                className="rv-doc-btn"
                                onClick={() => onViewDoc(activity.activity_id)}
                            >
                                <Download size={11} /> Download Documents
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
});
RowDetailPanel.displayName = 'RowDetailPanel';

// ─── Level 2: Activity Card ─────────────────────────────────────────────────

const ActivityCard = memo(({
    activity, config, universities, userRole,
    canAct, isSuperAdmin,
    onApprove, onRejectOpen, onClarifyOpen, onChatOpen,
    onSubmit, onResubmit, onEditRedirect, onDeleteOpen,
    onViewDoc, onDetailsOpen,
}) => {
    const [expanded, setExpanded] = useState(false);
    const rows = activity.activity_data?.rows ?? [];
    const st = activity.status ?? 'DRAFT';
    const isClarify = st === 'CLARIFICATION_REQUESTED';
    const isRejected = st === 'REJECTED';
    const isDraft = st === 'DRAFT';
    const isSubmitted = st === 'SUBMITTED';
    const isApproved = st === 'APPROVED';
    const isFaculty = userRole === 'FACULTY';

    const cardClass = [
        'rv-activity-card',
        isSubmitted && 'rv-activity-card--pending',
        isRejected && 'rv-activity-card--rejected',
        isClarify && 'rv-activity-card--clarification',
        isApproved && 'rv-activity-card--approved',
    ].filter(Boolean).join(' ');

    return (
        <div className={cardClass}>
            <div className="rv-activity-top">
                <div className="rv-activity-info">
                    <div className="rv-activity-title">
                        {activity.activity_title || '(Untitled Activity)'}
                    </div>
                    <div className="rv-activity-meta">
                        <span className="rv-activity-meta__item">
                            <FileText size={12} />
                            {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                        </span>
                        <span className={`rv-badge rv-badge--${statusClass(st)}`}>
                            {st.replace(/_/g, ' ')}
                        </span>
                        {!isFaculty && (
                            <span className="rv-activity-meta__item">
                                <User size={12} />
                                Faculty #{activity.created_user_id}
                            </span>
                        )}
                    </div>

                    {/* Rejection / clarification remarks */}
                    {(isRejected || isClarify) && activity.rejection_remarks && (
                        <div className={`rv-remarks ${isClarify ? 'rv-remarks--clarify' : 'rv-remarks--rejection'}`}>
                            {isClarify ? <HelpCircle size={13} /> : <AlertCircle size={13} />}
                            <span>
                                <strong>{isClarify ? 'Clarification needed: ' : 'Rejected: '}</strong>
                                {activity.rejection_remarks.split('|||').pop().trim()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="rv-actions">
                    {/* Faculty actions */}
                    {isFaculty && isDraft && (
                        <ActionButton variant="success" onClick={() => onSubmit(activity.activity_id)}>
                            <Send size={14} /> Submit
                        </ActionButton>
                    )}
                    {isFaculty && isClarify && (
                        <>
                            <ActionButton variant="secondary" onClick={() => onEditRedirect(activity)} title="Modify Data">
                                <Edit2 size={14} /> Edit
                            </ActionButton>
                            <ActionButton variant="warning" onClick={() => onResubmit(activity.activity_id)}>
                                <Send size={14} /> Resubmit
                            </ActionButton>
                        </>
                    )}
                    {isFaculty && (isSubmitted || isApproved) && (
                        <span className="rv-action-label">
                            {isApproved ? 'Approved ✓' : 'Awaiting Review'}
                        </span>
                    )}

                    {/* Reviewer actions (HOD / Admin) */}
                    {canAct && !isFaculty && isSubmitted && (
                        <>
                            <ActionButton variant="success" onClick={() => onApprove(activity.activity_id)} title="Approve">
                                <CheckCircle size={15} />
                            </ActionButton>
                            <ActionButton variant="danger" onClick={() => onRejectOpen(activity.activity_id)} title="Reject">
                                <XCircle size={15} />
                            </ActionButton>
                            <ActionButton variant="warning" onClick={() => onClarifyOpen(activity.activity_id)} title="Request Clarification">
                                <HelpCircle size={15} />
                            </ActionButton>
                        </>
                    )}
                    {canAct && !isFaculty && !isSubmitted && (
                        <span className="rv-action-label">
                            {isApproved ? 'Approved' : isRejected ? 'Rejected' : isClarify ? 'Clarif. Sent' : isDraft ? 'Draft' : '—'}
                        </span>
                    )}

                    {/* Chat trigger */}
                    <button
                        type="button"
                        className="rv-chat-btn"
                        title="View clarification thread"
                        onClick={() => onChatOpen(activity)}
                    >
                        <HelpCircle size={14} />
                    </button>

                    {/* Super Admin delete */}
                    {isSuperAdmin && (
                        <ActionButton variant="danger" onClick={() => onDeleteOpen(activity.activity_id)} title="Delete">
                            <Trash2 size={14} />
                        </ActionButton>
                    )}
                </div>
            </div>

            {/* View Details → opens modal popup */}
            <button
                type="button"
                className="rv-detail-toggle"
                onClick={() => onDetailsOpen(activity)}
            >
                <ChevronRight size={13} />
                View Details
                <span style={{ fontWeight: 400, color: '#9ca3af' }}>({rows.length})</span>
            </button>
        </div>
    );
});
ActivityCard.displayName = 'ActivityCard';

// ─── Level 1: Parameter Summary Card ────────────────────────────────────────

const ParameterSummaryCard = memo(({
    paramId, paramName, activities, config, universities, userRole,
    canAct, isSuperAdmin,
    onApprove, onRejectOpen, onClarifyOpen, onChatOpen,
    onSubmit, onResubmit, onEditRedirect, onDeleteOpen,
    onViewDoc, onBulkApprove, onBulkRejectOpen, onDetailsOpen,
}) => {
    const [expanded, setExpanded] = useState(false);
    const counts = countByStatus(activities);
    const pendingCount = counts['SUBMITTED'] || 0;
    const isFaculty = userRole === 'FACULTY';

    const hasPending = pendingCount > 0;
    const cardClass = `rv-param-card ${hasPending ? 'rv-param-card--has-pending' : ''}`;

    return (
        <div className={cardClass}>
            <div className="rv-param-header" onClick={() => setExpanded((p) => !p)}>
                <div className="rv-param-header__left">
                    <div className="rv-param-name">{paramName}</div>
                    <div className="rv-param-meta">
                        <span className="rv-param-total">
                            {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
                        </span>
                        <div className="rv-stat-badges">
                            {Object.entries(counts)
                                .sort(([a], [b]) => (STATUS_ORDER.indexOf(a) ?? 99) - (STATUS_ORDER.indexOf(b) ?? 99))
                                .map(([status, count]) => (
                                    <span key={status} className={`rv-stat-badge rv-stat-badge--${statusClass(status)}`}>
                                        {count} {status.replace(/_/g, ' ')}
                                    </span>
                                ))}
                        </div>
                    </div>
                </div>
                <div className="rv-param-header__right">
                    <span className="rv-param-expand-icon">
                        {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                </div>
            </div>

            {expanded && (
                <>
                    {/* Bulk actions bar — only for reviewers with pending activities */}
                    {canAct && !isFaculty && pendingCount > 0 && (
                        <div className="rv-bulk-bar">
                            <div className="rv-bulk-bar__info">
                                <strong>{pendingCount}</strong> {pendingCount === 1 ? 'activity' : 'activities'} awaiting review
                            </div>
                            <div className="rv-bulk-bar__actions">
                                <button
                                    type="button"
                                    className="rv-bulk-btn rv-bulk-btn--approve"
                                    onClick={(e) => { e.stopPropagation(); onBulkApprove(paramId); }}
                                >
                                    <CheckCircle size={13} /> Approve All
                                </button>
                                <button
                                    type="button"
                                    className="rv-bulk-btn rv-bulk-btn--reject"
                                    onClick={(e) => { e.stopPropagation(); onBulkRejectOpen(paramId); }}
                                >
                                    <XCircle size={13} /> Reject All
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="rv-activities">
                        {[...activities].sort(sortByStatus).map((activity) => (
                            <ActivityCard
                                key={activity.activity_id}
                                activity={activity}
                                config={config}
                                universities={universities}
                                userRole={userRole}
                                canAct={canAct}
                                isSuperAdmin={isSuperAdmin}
                                onApprove={onApprove}
                                onRejectOpen={onRejectOpen}
                                onClarifyOpen={onClarifyOpen}
                                onChatOpen={onChatOpen}
                                onSubmit={onSubmit}
                                onResubmit={onResubmit}
                                onEditRedirect={onEditRedirect}
                                onDeleteOpen={onDeleteOpen}
                                onViewDoc={onViewDoc}
                                onDetailsOpen={onDetailsOpen}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
});
ParameterSummaryCard.displayName = 'ParameterSummaryCard';

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const Review = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userRole = user?.erp_users_type;
    const mappingId = user?.erp_campus_department_mapping_id;
    const canAct = ['HOD', 'COORDINATOR', 'OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    const isFaculty = userRole === 'FACULTY';

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const { profile, loading: profileLoading } = useUserProfile();

    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
        parameter_id: '',
        university_id: '',
    });

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');

    // Modals
    const [rejectModal, setRejectModal] = useState({ show: false, activityId: null });
    const [rejectRemarks, setRejectRemarks] = useState('');
    const [clarifyModal, setClarifyModal] = useState({ show: false, activityId: null });
    const [clarifyRemarks, setClarifyRemarks] = useState('');
    const [chatModal, setChatModal] = useState({ show: false, activity: null });
    const [deleteModal, setDeleteModal] = useState({ show: false, activityId: null });
    const [bulkRejectModal, setBulkRejectModal] = useState({ show: false, paramId: null });
    const [bulkRejectRemarks, setBulkRejectRemarks] = useState('');
    const [detailsModal, setDetailsModal] = useState({ show: false, activity: null, config: null });

    // Fetch all universities independently so NO_MOU and pending ones aren't obscured
    const [allUniversities, setAllUniversities] = useState([]);
    useEffect(() => {
        getPartnerUniversities({ skip: 0, limit: 1000 }).then(setAllUniversities).catch(() => { });
    }, []);

    // ─── Profile auto-fill ──────────────────────────────────────────────────
    useEffect(() => {
        if (profileLoading) return;
        setFilters((prev) => ({
            ...prev,
            academic_year_id: profile.current_academic_year_id
                ? String(profile.current_academic_year_id) : prev.academic_year_id,
            campus_id: profile.campus_id ? String(profile.campus_id) : prev.campus_id,
            department_id: profile.dept_id ? String(profile.dept_id) : prev.department_id,
        }));
    }, [profileLoading]);

    // ─── Data fetching ──────────────────────────────────────────────────────
    useEffect(() => { refreshData(); }, [filters, mappingId]);

    const refreshData = useCallback(async () => {
        setLoading(true);
        try {
            const q = { ...filters, erp_campus_department_mapping_id: mappingId || undefined };
            let data = await getCollaborationActivities(q);

            if (['HOD', 'COORDINATOR'].includes(userRole)) {
                data = data.filter((a) =>
                    ['SUBMITTED', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED'].includes(a.status)
                );
            } else if (['OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
                data = data.filter((a) => a.status !== 'DRAFT');
            }

            setActivities(data);
        } catch {
            setNotification({ message: 'Failed to fetch activities', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filters, mappingId, userRole]);

    // ─── Derived data ───────────────────────────────────────────────────────
    const filteredActivities = activeTab === 'ALL'
        ? activities
        : activities.filter((a) => a.status === activeTab);

    const groupedActivities = filteredActivities.reduce((acc, a) => {
        const pid = a.parameter_id;
        if (!acc[pid]) acc[pid] = [];
        acc[pid].push(a);
        return acc;
    }, {});

    // Status counts for tabs (from ALL activities, before tab filter)
    const allCounts = countByStatus(activities);
    const TABS = isFaculty
        ? ['ALL', 'DRAFT', 'SUBMITTED', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED']
        : ['ALL', 'SUBMITTED', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'];

    // ─── Helpers ────────────────────────────────────────────────────────────
    const getParam = (id) => masterData.parameters.find((p) => p.parameter_id === id);
    const getParamName = (id) => getParam(id)?.parameter_name ?? `Parameter ${id}`;

    const viewDoc = async (id, rowIndex, docType, fileIndex) => {
        try {
            window.open(await downloadActivityDocument(id, rowIndex, docType, fileIndex), '_blank');
        } catch {
            setNotification({ message: 'Failed to load document', type: 'error' });
        }
    };

    // ─── Action handlers ────────────────────────────────────────────────────
    const handleApprove = async (id) => {
        try { await approveCollaborationActivity(id); setNotification({ message: 'Approved', type: 'success' }); refreshData(); }
        catch (e) { setNotification({ message: e?.detail ?? 'Failed', type: 'error' }); }
    };

    const handleRejectSubmit = async () => {
        if (!rejectRemarks.trim()) { setNotification({ message: 'Enter rejection remarks', type: 'warning' }); return; }
        try {
            await rejectCollaborationActivity(rejectModal.activityId, rejectRemarks);
            setNotification({ message: 'Rejected', type: 'success' });
            setRejectModal({ show: false, activityId: null });
            setRejectRemarks('');
            refreshData();
        } catch (e) { setNotification({ message: e?.detail ?? 'Failed', type: 'error' }); }
    };

    const handleClarifySubmit = async () => {
        if (!clarifyRemarks.trim()) { setNotification({ message: 'Enter clarification details', type: 'warning' }); return; }
        try {
            await requestClarification(clarifyModal.activityId, clarifyRemarks.trim());
            setNotification({ message: 'Clarification requested', type: 'success' });
            setClarifyModal({ show: false, activityId: null });
            setClarifyRemarks('');
            refreshData();
        } catch (e) { setNotification({ message: e?.detail ?? 'Failed', type: 'error' }); }
    };

    const handleResubmit = async (id) => {
        try {
            await updateCollaborationActivity(id, { rejection_remarks: '' });
            await submitCollaborationActivity(id);
            setNotification({ message: 'Resubmitted', type: 'success' });
            refreshData();
        } catch (e) { setNotification({ message: e?.detail ?? 'Failed', type: 'error' }); }
    };

    const handleSubmit = async (id) => {
        try {
            await submitCollaborationActivity(id);
            setNotification({ message: 'Submitted', type: 'success' });
            refreshData();
        } catch (e) { setNotification({ message: e?.detail ?? 'Failed', type: 'error' }); }
    };

    const handleChatReply = async (id, msg) => {
        try { await sendClarificationReply(id, msg); setNotification({ message: 'Reply sent', type: 'success' }); refreshData(); }
        catch (e) { setNotification({ message: e?.detail ?? 'Failed', type: 'error' }); }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.activityId) return;
        try {
            await deleteCollaborationActivity(deleteModal.activityId);
            setNotification({ message: 'Activity deleted', type: 'success' });
            setDeleteModal({ show: false, activityId: null });
            refreshData();
        } catch (e) { setNotification({ message: e?.detail ?? 'Failed to delete', type: 'error' }); }
    };

    const handleEditRedirect = (activity) => {
        const params = new URLSearchParams({
            edit_p_id: activity.parameter_id || '',
            ay_id: activity.erp_academic_year_id || '',
            q_id: activity.quarter_id || '',
            c_id: activity.campus_id || '',
            d_id: activity.department_id || '',
            m_id: activity.erp_campus_department_mapping_id || '',
        });
        navigate(`/data-entry?${params.toString()}`);
    };

    // ─── Bulk actions ───────────────────────────────────────────────────────
    const handleBulkApprove = async (paramId) => {
        const submitted = activities.filter(
            (a) => a.parameter_id === paramId && a.status === 'SUBMITTED'
        );
        if (submitted.length === 0) return;

        if (!window.confirm(`Approve all ${submitted.length} submitted activities for "${getParamName(paramId)}"?`)) return;

        let successCount = 0;
        for (const a of submitted) {
            try { await approveCollaborationActivity(a.activity_id); successCount++; }
            catch { /* continue with others */ }
        }
        setNotification({ message: `Approved ${successCount} of ${submitted.length} activities`, type: 'success' });
        refreshData();
    };

    const handleBulkRejectOpen = (paramId) => {
        setBulkRejectModal({ show: true, paramId });
        setBulkRejectRemarks('');
    };

    const handleBulkRejectSubmit = async () => {
        if (!bulkRejectRemarks.trim()) {
            setNotification({ message: 'Enter rejection remarks', type: 'warning' });
            return;
        }
        const submitted = activities.filter(
            (a) => a.parameter_id === bulkRejectModal.paramId && a.status === 'SUBMITTED'
        );
        if (submitted.length === 0) return;

        let successCount = 0;
        for (const a of submitted) {
            try { await rejectCollaborationActivity(a.activity_id, bulkRejectRemarks); successCount++; }
            catch { /* continue */ }
        }
        setNotification({ message: `Rejected ${successCount} of ${submitted.length} activities`, type: 'success' });
        setBulkRejectModal({ show: false, paramId: null });
        setBulkRejectRemarks('');
        refreshData();
    };

    // ─── Loading ────────────────────────────────────────────────────────────
    if (masterDataLoading) return <Loader fullscreen />;

    // ═════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════════════════════
    return (
        <div className="review">
            <div className="review__header">
                <h1 className="review__title">
                    {isFaculty ? 'My Activity Tracker' : 'Review & Approvals'}
                </h1>
                <p className="review__subtitle">
                    {isFaculty
                        ? 'Track the status of your submitted collaboration activities'
                        : 'Review, approve or request clarification on submitted activities'}
                </p>
            </div>

            <FilterBar
                filters={filters}
                onChange={setFilters}
                masterData={masterData}
                loading={loading}
            />

            {/* ── Status Tabs (all roles) ─────────────────────────────────── */}
            <div className="rv-tabs">
                {TABS.map((tab) => {
                    const count = tab === 'ALL' ? activities.length : (allCounts[tab] || 0);
                    return (
                        <button
                            key={tab}
                            className={`rv-tab ${activeTab === tab ? 'rv-tab--active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.replace(/_/g, ' ')}
                            <span className="rv-tab__count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="review__loader"><Loader size="large" /></div>
            ) : (
                <div className="review__content">
                    {Object.keys(groupedActivities).length === 0 ? (
                        <div className="review__empty">
                            <AlertCircle size={48} className="review__empty-icon" />
                            <p>No activities found for the selected filters.</p>
                        </div>
                    ) : (
                        Object.entries(groupedActivities).map(([paramId, paramActivities]) => {
                            const pid = parseInt(paramId);
                            const parameter = getParam(pid);
                            const config = getParamConfig(parameter);

                            return (
                                <ParameterSummaryCard
                                    key={paramId}
                                    paramId={pid}
                                    paramName={getParamName(pid)}
                                    activities={paramActivities}
                                    config={config}
                                    universities={allUniversities.length > 0 ? allUniversities : masterData.universities}
                                    userRole={userRole}
                                    canAct={canAct}
                                    isSuperAdmin={isSuperAdmin}
                                    onApprove={handleApprove}
                                    onRejectOpen={(id) => { setRejectModal({ show: true, activityId: id }); setRejectRemarks(''); }}
                                    onClarifyOpen={(id) => { setClarifyModal({ show: true, activityId: id }); setClarifyRemarks(''); }}
                                    onChatOpen={(activity) => setChatModal({ show: true, activity })}
                                    onSubmit={handleSubmit}
                                    onResubmit={handleResubmit}
                                    onEditRedirect={handleEditRedirect}
                                    onDeleteOpen={(id) => setDeleteModal({ show: true, activityId: id })}
                                    onViewDoc={viewDoc}
                                    onDetailsOpen={(activity) => {
                                        const param = getParam(activity.parameter_id);
                                        setDetailsModal({ show: true, activity, config: getParamConfig(param) });
                                    }}
                                    onBulkApprove={handleBulkApprove}
                                    onBulkRejectOpen={handleBulkRejectOpen}
                                />
                            );
                        })
                    )}
                </div>
            )}

            {/* ── Reject Modal ────────────────────────────────────────────── */}
            {rejectModal.show && (
                <div className="review__modal-overlay" onClick={() => setRejectModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Reject Activity</h3>
                        <textarea
                            className="review__modal-textarea"
                            placeholder="Provide rejection remarks…"
                            value={rejectRemarks}
                            onChange={(e) => setRejectRemarks(e.target.value)}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="danger" onClick={handleRejectSubmit}>Submit Rejection</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setRejectModal({ show: false, activityId: null })}>Cancel</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Clarify Modal ───────────────────────────────────────────── */}
            {clarifyModal.show && (
                <div className="review__modal-overlay" onClick={() => setClarifyModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Request Clarification</h3>
                        <textarea
                            className="review__modal-textarea"
                            placeholder="Describe what information is missing or unclear…"
                            value={clarifyRemarks}
                            onChange={(e) => setClarifyRemarks(e.target.value)}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="warning" onClick={handleClarifySubmit}>Send Request</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setClarifyModal({ show: false, activityId: null })}>Cancel</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Chat Thread Modal ───────────────────────────────────────── */}
            {chatModal.show && chatModal.activity && (
                <div className="review__modal-overlay" onClick={() => setChatModal({ show: false, activity: null })}>
                    <div className="review__modal review__modal--chat" onClick={(e) => e.stopPropagation()}>
                        <h3>Clarification Thread</h3>
                        <ClarificationChat
                            activity={chatModal.activity}
                            onReply={(msg) => handleChatReply(chatModal.activity.activity_id, msg)}
                            readOnly={chatModal.activity.status !== 'CLARIFICATION_REQUESTED'}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="secondary" onClick={() => setChatModal({ show: false, activity: null })}>Close</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ────────────────────────────────── */}
            {deleteModal.show && (
                <div className="review__modal-overlay" onClick={() => setDeleteModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Activity</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '12px 0' }}>
                            Are you sure you want to permanently delete this activity? This action cannot be undone.
                        </p>
                        <div className="review__modal-actions">
                            <ActionButton variant="danger" onClick={handleDeleteConfirm}>Delete</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setDeleteModal({ show: false, activityId: null })}>Cancel</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Reject Modal ────────────────────────────────────────── */}
            {bulkRejectModal.show && (
                <div className="review__modal-overlay" onClick={() => setBulkRejectModal({ show: false, paramId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Reject All Submitted — {getParamName(bulkRejectModal.paramId)}</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 12px 0' }}>
                            This will reject all <strong>SUBMITTED</strong> activities for this parameter.
                        </p>
                        <textarea
                            className="review__modal-textarea"
                            placeholder="Provide rejection remarks (applies to all)…"
                            value={bulkRejectRemarks}
                            onChange={(e) => setBulkRejectRemarks(e.target.value)}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="danger" onClick={handleBulkRejectSubmit}>Reject All</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setBulkRejectModal({ show: false, paramId: null })}>Cancel</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Activity Details Popup ───────────────────────────────────── */}
            {detailsModal.show && (
                <ActivityDetailsPopup
                    activity={detailsModal.activity}
                    config={detailsModal.config}
                    userRole={userRole}
                    masterData={{
                        ...masterData,
                        universities: allUniversities.length > 0 ? allUniversities : masterData.universities
                    }}
                    onClose={() => setDetailsModal({ show: false, activity: null, config: null })}
                    onViewDoc={viewDoc}
                />
            )}

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default Review;
