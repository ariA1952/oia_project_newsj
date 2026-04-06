import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Send, CheckCircle, XCircle, AlertCircle,
    HelpCircle, FileText, Globe, Calendar, ChevronDown, ChevronRight, Trash2, Edit2,
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
} from '../services/metricsService';
import { getParamConfig, docKey } from '../config/parameterConfigs';
import './Review.css';

// ─── Helper: render one activity row's fields using its parameter config ────────

const RowFieldSummary = ({ row, config, universities }) => {
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
        <div className="review__row-fields">
            {/* Universities */}
            {uniField && (
                <div className="review__row-field">
                    <Globe size={13} className="review__row-field-icon" />
                    <span className="review__row-field-label">{uniField.label}:</span>
                    <span>{getUniNames(row.partner_universities)}</span>
                </div>
            )}

            {/* Dates */}
            {dateFields.map((f) => {
                const val = f.id === 'start_date' ? row.start_date : row.end_date;
                if (!val) return null;
                return (
                    <div key={f.id} className="review__row-field">
                        <Calendar size={13} className="review__row-field-icon" />
                        <span className="review__row-field-label">{f.label}:</span>
                        <span>{val}</span>
                    </div>
                );
            })}

            {/* Parameter-specific fields */}
            {paramFields.map((f) => {
                const val = row.fields?.[f.id];
                if (!val && val !== 0) return null;
                return (
                    <div key={f.id} className="review__row-field">
                        <span className="review__row-field-label">{f.label}:</span>
                        <span>{String(val)}</span>
                    </div>
                );
            })}

            {/* Documents */}
            {Object.entries(row.documents ?? {}).some(([, v]) => Array.isArray(v) && v.length > 0) && (
                <div className="review__row-field review__row-field--docs">
                    <FileText size={13} className="review__row-field-icon" />
                    <span className="review__row-field-label">Docs:</span>
                    <span>
                        {config?.documents
                            .filter((d) => {
                                const k = docKey(d);
                                return Array.isArray(row.documents?.[k]) && row.documents[k].length > 0;
                            })
                            .join(', ') || 'Uploaded'}
                    </span>
                </div>
            )}
        </div>
    );
};

// ─── Main component ────────────────────────────────────────────────────────────

const Review = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const userRole = user?.erp_users_type;
    const mappingId = user?.erp_campus_department_mapping_id;
    const canAct = ['HOD', 'COORDINATOR', 'OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

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
    const [groupedActivities, setGroupedActivities] = useState({});
    const [expandedParams, setExpandedParams] = useState({});
    const [expandedRows, setExpandedRows]   = useState({});   // activityId → bool
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');

    const [rejectModal, setRejectModal] = useState({ show: false, activityId: null });
    const [rejectRemarks, setRejectRemarks] = useState('');
    const [clarifyModal, setClarifyModal] = useState({ show: false, activityId: null });
    const [clarifyRemarks, setClarifyRemarks] = useState('');
    const [chatModal, setChatModal] = useState({ show: false, activity: null });
    const [deleteModal, setDeleteModal] = useState({ show: false, activityId: null });

    // Auto-set default context from user profile
    useEffect(() => {
        if (profileLoading) return;
        setFilters((prev) => ({
            ...prev,
            academic_year_id: profile.current_academic_year_id
                ? String(profile.current_academic_year_id) : prev.academic_year_id,
            campus_id:    profile.campus_id  ? String(profile.campus_id)  : prev.campus_id,
            department_id: profile.dept_id   ? String(profile.dept_id)    : prev.department_id,
        }));
    }, [profileLoading]);

    useEffect(() => { refreshData(); }, [filters, mappingId]);

    const refreshData = async () => {
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
            const grouped = data.reduce((acc, a) => {
                const pid = a.parameter_id;
                if (!acc[pid]) acc[pid] = [];
                acc[pid].push(a);
                return acc;
            }, {});
            setGroupedActivities(grouped);
        } catch {
            setNotification({ message: 'Failed to fetch activities', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const getParam = (id) => masterData.parameters.find((p) => p.parameter_id === id);
    const getParamName = (id) => getParam(id)?.parameter_name ?? `Parameter ${id}`;

    const hasDocuments = (activity) =>
        activity.activity_data?.rows?.some((r) =>
            Object.values(r.documents ?? {}).some((v) => Array.isArray(v) && v.length > 0)
        ) || !!activity.document_path;

    const viewDoc = async (id) => {
        try {
            window.open(await downloadActivityDocument(id), '_blank');
        } catch {
            setNotification({ message: 'Failed to load document', type: 'error' });
        }
    };

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

    if (masterDataLoading) return <Loader fullscreen />;

    const TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'];

    return (
        <div className="review">
            <div className="review__header">
                <h1 className="review__title">
                    {userRole === 'FACULTY' ? 'My Activity Tracker' : 'Review & Approvals'}
                </h1>
                <p className="review__subtitle">
                    {userRole === 'FACULTY'
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

            {loading ? (
                <div className="review__loader"><Loader size="large" /></div>
            ) : (
                <div className="review__content">
                    {/* Status tabs (Faculty) */}
                    {userRole === 'FACULTY' && (
                        <div className="review__tabs">
                            {TABS.map((tab) => (
                                <button
                                    key={tab}
                                    className={`review__tab-button ${activeTab === tab ? 'review__tab-button--active' : ''}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                    )}

                    {Object.keys(groupedActivities).length === 0 ? (
                        <div className="review__empty">
                            <AlertCircle size={48} className="review__empty-icon" />
                            <p>No activities found.</p>
                        </div>
                    ) : (
                        Object.entries(groupedActivities).map(([paramId, paramActivities]) => {
                            const pid = parseInt(paramId);
                            const parameter = getParam(pid);
                            const config = getParamConfig(parameter);

                            const displayActivities =
                                userRole === 'FACULTY' && activeTab !== 'ALL'
                                    ? paramActivities.filter((a) => a.status === activeTab)
                                    : paramActivities;

                            if (displayActivities.length === 0) return null;

                            return (
                                <div key={paramId} className="review__parameter-group">
                                    {/* Group header */}
                                    <div
                                        className="review__parameter-header"
                                        onClick={() =>
                                            setExpandedParams((p) => ({ ...p, [paramId]: !p[paramId] }))
                                        }
                                    >
                                        <span className="review__parameter-name">{getParamName(pid)}</span>
                                        <span className="review__parameter-count">
                                            {paramActivities.length} {paramActivities.length === 1 ? 'entry' : 'entries'}
                                        </span>
                                        <span className="review__expand-icon">
                                            {expandedParams[paramId] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </span>
                                    </div>

                                    {expandedParams[paramId] && (
                                        <div className="review__activities">
                                            {/* ── FACULTY: card view ─────────────────────── */}
                                            {userRole === 'FACULTY' ? (
                                                displayActivities.map((activity) => {
                                                    const rows = activity.activity_data?.rows ?? [];
                                                    const isClarify = activity.status === 'CLARIFICATION_REQUESTED';
                                                    const isRejected = activity.status === 'REJECTED';
                                                    const isDraft = activity.status === 'DRAFT';
                                                    const isExpanded = expandedRows[activity.activity_id];

                                                    return (
                                                        <div key={activity.activity_id} className="review__activity-card">
                                                            <div className="review__activity-info">
                                                                {activity.activity_title && (
                                                                    <div className="review__activity-row review__activity-row--title">
                                                                        <strong>{activity.activity_title}</strong>
                                                                    </div>
                                                                )}

                                                                {/* Row summary / expandable */}
                                                                {rows.length > 0 && (
                                                                    <div className="review__rows-section">
                                                                        <button
                                                                            type="button"
                                                                            className="review__rows-toggle"
                                                                            onClick={() =>
                                                                                setExpandedRows((p) => ({
                                                                                    ...p,
                                                                                    [activity.activity_id]: !p[activity.activity_id],
                                                                                }))
                                                                            }
                                                                        >
                                                                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                                            {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                                                                        </button>

                                                                        {isExpanded && rows.map((row, ri) => (
                                                                            <div key={ri} className="review__row-card">
                                                                                <span className="review__row-card__label">
                                                                                    Entry {ri + 1}
                                                                                </span>
                                                                                <RowFieldSummary
                                                                                    row={row}
                                                                                    config={config}
                                                                                    universities={masterData.universities}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Status */}
                                                                <div className="review__activity-row review__activity-status">
                                                                    <strong>Status:</strong>
                                                                    <span className={`status-badge status-badge--${(activity.status ?? '').toLowerCase().replace(/_/g, '-')}`}>
                                                                        {activity.status ?? 'DRAFT'}
                                                                    </span>
                                                                </div>

                                                                {/* View docs button */}
                                                                {hasDocuments(activity) && (
                                                                    <button
                                                                        type="button"
                                                                        className="review__doc-link-btn"
                                                                        onClick={() => viewDoc(activity.activity_id)}
                                                                    >
                                                                        <FileText size={13} /> View Documents
                                                                    </button>
                                                                )}

                                                                {/* Rejection / clarify remarks */}
                                                                {(isRejected || isClarify) && activity.rejection_remarks && (
                                                                    <div className={`review__activity-remarks ${isClarify ? 'review__activity-remarks--clarify' : ''}`}>
                                                                        {isClarify ? <HelpCircle size={13} /> : <AlertCircle size={13} />}
                                                                        <span>
                                                                            <strong>
                                                                                {isClarify ? 'Clarification needed: ' : 'Rejected: '}
                                                                            </strong>
                                                                            {activity.rejection_remarks.split('|||').pop().trim()}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Yellow ? icon to view clarification chat (any status) */}
                                                                <button
                                                                    type="button"
                                                                    className="review__chat-trigger-btn"
                                                                    title="View clarification thread"
                                                                    onClick={() => setChatModal({ show: true, activity })}
                                                                >
                                                                    <HelpCircle size={14} />
                                                                    <span>Clarification Thread</span>
                                                                </button>
                                                            </div>

                                                            {/* Faculty actions */}
                                                            <div className="review__activity-actions">
                                                                {isDraft && (
                                                                    <ActionButton
                                                                        variant="success"
                                                                        onClick={() =>
                                                                            submitCollaborationActivity(activity.activity_id)
                                                                                .then(refreshData)
                                                                                .catch((e) =>
                                                                                    setNotification({ message: e?.detail ?? 'Failed', type: 'error' })
                                                                                )
                                                                        }
                                                                    >
                                                                        <Send size={14} /> Submit
                                                                    </ActionButton>
                                                                )}
                                                                {isClarify && (
                                                                    <>
                                                                        <ActionButton
                                                                            variant="secondary"
                                                                            onClick={() => handleEditRedirect(activity)}
                                                                            title="Modify Data in Data Entry"
                                                                        >
                                                                            <Edit2 size={14} /> Edit
                                                                        </ActionButton>
                                                                        <ActionButton
                                                                            variant="warning"
                                                                            onClick={() => handleResubmit(activity.activity_id)}
                                                                        >
                                                                            <Send size={14} /> Resubmit
                                                                        </ActionButton>
                                                                    </>
                                                                )}
                                                                {(activity.status === 'SUBMITTED' || activity.status === 'APPROVED') && (
                                                                    <span className="action-label">
                                                                        {activity.status === 'APPROVED' ? 'Approved ✓' : 'Awaiting Review'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })

                                            ) : (
                                                /* ── HOD / Admin: table view ─────────── */
                                                <div className="review__table-container">
                                                    <table className="review__table">
                                                        <thead>
                                                            <tr>
                                                                <th>Title</th>
                                                                <th>Entries</th>
                                                                <th>Status</th>
                                                                <th>Faculty ID</th>
                                                                <th style={{ textAlign: 'center' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {displayActivities.map((activity) => {
                                                                const rows = activity.activity_data?.rows ?? [];
                                                                const isExpanded = expandedRows[activity.activity_id];
                                                                const isSubmitted = activity.status === 'SUBMITTED';
                                                                const isClarify = activity.status === 'CLARIFICATION_REQUESTED';
                                                                const isApproved = activity.status === 'APPROVED';
                                                                const isRejected = activity.status === 'REJECTED';
                                                                const statusClass = (activity.status ?? '').toLowerCase().replace(/_/g, '-');

                                                                return (
                                                                    <Fragment key={activity.activity_id}>
                                                                        <tr>
                                                                            {/* Title */}
                                                                            <td>
                                                                                <div className="review__table-title">
                                                                                    {activity.activity_title || '—'}
                                                                                </div>
                                                                                {hasDocuments(activity) && (
                                                                                    <button
                                                                                        type="button"
                                                                                        className="review__table-doc-btn"
                                                                                        onClick={() => viewDoc(activity.activity_id)}
                                                                                    >
                                                                                        <FileText size={11} /> Docs
                                                                                    </button>
                                                                                )}
                                                                            </td>

                                                                            {/* Entries summary */}
                                                                            <td>
                                                                                <button
                                                                                    type="button"
                                                                                    className="review__rows-toggle"
                                                                                    onClick={() =>
                                                                                        setExpandedRows((p) => ({
                                                                                            ...p,
                                                                                            [activity.activity_id]: !p[activity.activity_id],
                                                                                        }))
                                                                                    }
                                                                                >
                                                                                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                                                    {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                                                                                </button>
                                                                            </td>

                                                                            {/* Status */}
                                                                            <td>
                                                                                <span className={`status-badge status-badge--${statusClass}`}>
                                                                                    {activity.status}
                                                                                </span>
                                                                            </td>

                                                                            {/* Faculty */}
                                                                            <td className="review__table-faculty">
                                                                                ID: {activity.erp_users_id}
                                                                            </td>

                                                                            {/* Actions */}
                                                                            <td>
                                                                                <div className="review__activity-actions">
                                                                                    {canAct && isSubmitted && (
                                                                                        <>
                                                                                            <ActionButton
                                                                                                variant="success"
                                                                                                onClick={() => handleApprove(activity.activity_id)}
                                                                                                title="Approve"
                                                                                            >
                                                                                                <CheckCircle size={15} />
                                                                                            </ActionButton>
                                                                                            <ActionButton
                                                                                                variant="danger"
                                                                                                onClick={() => {
                                                                                                    setRejectModal({ show: true, activityId: activity.activity_id });
                                                                                                    setRejectRemarks('');
                                                                                                }}
                                                                                                title="Reject"
                                                                                            >
                                                                                                <XCircle size={15} />
                                                                                            </ActionButton>
                                                                                            <ActionButton
                                                                                                variant="warning"
                                                                                                onClick={() => {
                                                                                                    setClarifyModal({ show: true, activityId: activity.activity_id });
                                                                                                    setClarifyRemarks('');
                                                                                                }}
                                                                                                title="Request Clarification"
                                                                                            >
                                                                                                <HelpCircle size={15} />
                                                                                            </ActionButton>
                                                                                        </>
                                                                                    )}
                                                                                    {canAct && !isSubmitted && (
                                                                                        <span className="action-label">
                                                                                            {isApproved
                                                                                                ? 'Approved'
                                                                                                : isRejected
                                                                                                    ? 'Rejected'
                                                                                                    : isClarify
                                                                                                        ? 'Clarif. Sent'
                                                                                                        : '—'}
                                                                                        </span>
                                                                                    )}
                                                                                    {/* Chat thread icon */}
                                                                                    <button
                                                                                        type="button"
                                                                                        className="review__chat-trigger-btn review__chat-trigger-btn--small"
                                                                                        title="View clarification thread"
                                                                                        onClick={() => setChatModal({ show: true, activity })}
                                                                                    >
                                                                                        <HelpCircle size={14} />
                                                                                    </button>
                                                                                    {isSuperAdmin && (
                                                                                        <ActionButton
                                                                                            variant="danger"
                                                                                            onClick={() => setDeleteModal({ show: true, activityId: activity.activity_id })}
                                                                                            title="Delete Activity"
                                                                                        >
                                                                                            <Trash2 size={15} />
                                                                                        </ActionButton>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                        </tr>

                                                                        {/* Expanded row detail */}
                                                                        {isExpanded && (
                                                                            <tr className="review__detail-row">
                                                                                <td colSpan={5}>
                                                                                    <div className="review__detail-body">
                                                                                        {rows.map((row, ri) => (
                                                                                            <div key={ri} className="review__row-card">
                                                                                                <span className="review__row-card__label">
                                                                                                    Entry {ri + 1}
                                                                                                </span>
                                                                                                <RowFieldSummary
                                                                                                    row={row}
                                                                                                    config={config}
                                                                                                    universities={masterData.universities}
                                                                                                />
                                                                                            </div>
                                                                                        ))}
                                                                                        {/* Chat trigger in expanded detail */}
                                                                                        <button
                                                                                            type="button"
                                                                                            className="review__chat-trigger-btn"
                                                                                            title="View clarification thread"
                                                                                            onClick={() => setChatModal({ show: true, activity })}
                                                                                        >
                                                                                            <HelpCircle size={14} />
                                                                                            <span>View Clarification Thread</span>
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </Fragment>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── Reject Modal ──────────────────────────────────────────── */}
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

            {/* ── Clarify Modal ─────────────────────────────────────────── */}
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

            {/* ── Chat Thread Modal ──────────────────────────────────── */}
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

            {/* ── Delete Confirmation Modal ───────────────────────────── */}
            {deleteModal.show && (
                <div className="review__modal-overlay" onClick={() => setDeleteModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Delete Activity</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '12px 0' }}>Are you sure you want to permanently delete this activity? This action cannot be undone.</p>
                        <div className="review__modal-actions">
                            <ActionButton variant="danger" onClick={handleDeleteConfirm}>Delete</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setDeleteModal({ show: false, activityId: null })}>Cancel</ActionButton>
                        </div>
                    </div>
                </div>
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
