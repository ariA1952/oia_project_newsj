import { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import useUserProfile from '../hooks/useUserProfile';
import {
    getCollaborationActivities,
    getPendingActivities,
    getDraftActivities,
    submitCollaborationActivity,
    approveCollaborationActivity,
    rejectCollaborationActivity,
    clarifyCollaborationActivity,
    getActivityDocumentUrl,
} from '../services/metricsService';
import './Review.css';

const Review = () => {
    const { user } = useAuth();
    const userRole = user?.erp_users_type;
    const mappingId = user?.erp_campus_department_mapping_id;
    const canActOnActivities = userRole === 'HOD' || userRole === 'OIA_ADMIN';

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const { profile, loading: profileLoading } = useUserProfile();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
    });
    const [activities, setActivities] = useState([]);
    const [groupedActivities, setGroupedActivities] = useState({});
    const [expandedParams, setExpandedParams] = useState({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Reject modal
    const [rejectModal, setRejectModal] = useState({ show: false, activityId: null });
    const [rejectRemarks, setRejectRemarks] = useState('');

    // Clarification modal
    const [clarifyModal, setClarifyModal] = useState({ show: false, activityId: null });
    const [clarifyRemarks, setClarifyRemarks] = useState('');

    // Auto-set filters from backend profile once loaded
    useEffect(() => {
        if (profileLoading) return;
        setFilters(prev => ({
            ...prev,
            academic_year_id: profile.current_academic_year_id ? String(profile.current_academic_year_id) : prev.academic_year_id,
            campus_id: profile.campus_id ? String(profile.campus_id) : prev.campus_id,
            department_id: profile.dept_id ? String(profile.dept_id) : prev.department_id,
        }));
    }, [profileLoading]);

    useEffect(() => {
        refreshData();
    }, [filters, mappingId]);

    const refreshData = async () => {
        setLoading(true);
        try {
            const queryParams = {
                ...filters,
                erp_campus_department_mapping_id: mappingId || undefined,
            };

            const allActivities = await getCollaborationActivities(queryParams);

            let data = allActivities;
            if (userRole === 'FACULTY') {
                data = allActivities; // Faculty sees all their own activities for tracking
            } else if (userRole === 'HOD') {
                // HOD sees SUBMITTED + APPROVED + REJECTED + CLARIFICATION_REQUESTED
                data = allActivities.filter(a =>
                    ['SUBMITTED', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED'].includes(a.status)
                );
            } else if (userRole === 'OIA_ADMIN') {
                // Admin sees everything except DRAFT
                data = allActivities.filter(a => a.status !== 'DRAFT');
            }

            setActivities(data);
            groupActivitiesByParameter(data);
        } catch (error) {
            setNotification({ message: `Failed to fetch activities`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const groupActivitiesByParameter = (data) => {
        const grouped = data.reduce((acc, activity) => {
            const paramId = activity.parameter_id;
            if (!acc[paramId]) acc[paramId] = [];
            acc[paramId].push(activity);
            return acc;
        }, {});
        setGroupedActivities(grouped);
    };

    const toggleExpand = (paramId) => {
        setExpandedParams(prev => ({ ...prev, [paramId]: !prev[paramId] }));
    };

    // ── Approve ────────────────────────────────────────────────────────────────
    const handleApprove = async (activityId) => {
        try {
            await approveCollaborationActivity(activityId);
            setNotification({ message: 'Activity approved successfully', type: 'success' });
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to approve activity', type: 'error' });
        }
    };

    // ── Faculty: Request Approval ───────────────────────────────────────────────
    const handleRequestApproval = async (activityId) => {
        try {
            await submitCollaborationActivity(activityId);
            setNotification({ message: 'Request sent to HOD/Admin for approval', type: 'success' });
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to send request', type: 'error' });
        }
    };

    // ── Reject ─────────────────────────────────────────────────────────────────
    const handleRejectClick = (activityId) => {
        setRejectModal({ show: true, activityId });
        setRejectRemarks('');
    };

    const handleRejectSubmit = async () => {
        if (!rejectRemarks.trim()) {
            setNotification({ message: 'Please enter rejection remarks', type: 'warning' });
            return;
        }
        try {
            await rejectCollaborationActivity(rejectModal.activityId, rejectRemarks);
            setNotification({ message: 'Activity rejected', type: 'success' });
            setRejectModal({ show: false, activityId: null });
            setRejectRemarks('');
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to reject activity', type: 'error' });
        }
    };

    // ── Clarify ────────────────────────────────────────────────────────────────
    const handleClarifyClick = (activityId) => {
        setClarifyModal({ show: true, activityId });
        setClarifyRemarks('');
    };

    const handleClarifySubmit = async () => {
        if (!clarifyRemarks.trim()) {
            setNotification({ message: 'Please enter clarification remarks', type: 'warning' });
            return;
        }
        try {
            await clarifyCollaborationActivity(clarifyModal.activityId, clarifyRemarks);
            setNotification({ message: 'Clarification requested from faculty', type: 'success' });
            setClarifyModal({ show: false, activityId: null });
            setClarifyRemarks('');
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to request clarification', type: 'error' });
        }
    };

    // ── Faculty: Resubmit (after clarification) ─────────────────────────────────
    const handleResubmit = async (activityId) => {
        try {
            await submitCollaborationActivity(activityId);
            setNotification({ message: 'Activity resubmitted for review', type: 'success' });
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to resubmit', type: 'error' });
        }
    };

    const getParameterName = (paramId) => {
        const param = masterData.parameters.find(p => p.parameter_id === paramId);
        return param?.parameter_name || `Parameter ${paramId}`;
    };

    const getUniversityName = (id) =>
        masterData.universities.find(u => u.university_id === id)?.university_name || null;

    if (masterDataLoading) return <Loader fullscreen />;

    return (
        <div className="review">
            <div className="review__header">
                <h1 className="review__title">
                    {userRole === 'FACULTY' ? 'Track My Requests' : 'Review & Approval'}
                </h1>
                <p className="review__subtitle">
                    {userRole === 'FACULTY'
                        ? 'Monitor the status of your submitted collaboration activities'
                        : 'Review and approve, reject, or request clarification on collaboration activities'}
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
                    {Object.keys(groupedActivities).length === 0 ? (
                        <div className="review__empty">
                            <AlertCircle size={48} className="review__empty-icon" />
                            <p>
                                {userRole === 'FACULTY'
                                    ? 'No submitted activities found'
                                    : 'No pending activities found for review'}
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedActivities).map(([paramId, paramActivities]) => (
                            <div key={paramId} className="review__parameter-group">
                                <div
                                    className="review__parameter-header"
                                    onClick={() => toggleExpand(parseInt(paramId))}
                                >
                                    <span className="review__parameter-name">
                                        {getParameterName(parseInt(paramId))}
                                    </span>
                                    <span className="review__parameter-count">
                                        {paramActivities.length} {paramActivities.length === 1 ? 'activity' : 'activities'}
                                    </span>
                                    <span className="review__expand-icon">
                                        {expandedParams[paramId] ? '▼' : '▶'}
                                    </span>
                                </div>

                                {expandedParams[paramId] && (
                                    <div className="review__activities">
                                        {paramActivities.map((activity) => {
                                            const isClarificationRequested = activity.status === 'CLARIFICATION_REQUESTED';
                                            const isSubmitted = activity.status === 'SUBMITTED';
                                            const isApproved = activity.status === 'APPROVED';
                                            const isRejected = activity.status === 'REJECTED';
                                            const docUrl = activity.document_path
                                                ? getActivityDocumentUrl(activity.activity_id)
                                                : null;

                                            return (
                                                <div key={activity.activity_id} className="review__activity-card">
                                                    <div className="review__activity-info">
                                                        {/* Title */}
                                                        {activity.activity_title && (
                                                            <div className="review__activity-row">
                                                                <strong>Title:</strong> {activity.activity_title}
                                                            </div>
                                                        )}
                                                        {/* Value */}
                                                        <div className="review__activity-row">
                                                            <strong>Value:</strong> {activity.numeric_value ?? 'N/A'}
                                                        </div>
                                                        {/* University */}
                                                        {activity.university_id && (
                                                            <div className="review__activity-row">
                                                                <strong>University:</strong>{' '}
                                                                {getUniversityName(activity.university_id) || `ID #${activity.university_id}`}
                                                            </div>
                                                        )}
                                                        {/* Dates */}
                                                        {(activity.start_date || activity.end_date) && (
                                                            <div className="review__activity-row">
                                                                <strong>Duration:</strong>{' '}
                                                                {activity.start_date || '—'} → {activity.end_date || '—'}
                                                            </div>
                                                        )}
                                                        {/* Remarks */}
                                                        {activity.activity_data?.remarks && (
                                                            <div className="review__activity-row">
                                                                <strong>Notes:</strong> {activity.activity_data.remarks}
                                                            </div>
                                                        )}
                                                        {/* Document */}
                                                        {docUrl && (
                                                            <div className="review__activity-row">
                                                                <strong>Document:</strong>{' '}
                                                                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="review__doc-link">
                                                                    View / Download
                                                                </a>
                                                            </div>
                                                        )}
                                                        {/* Status */}
                                                        <div className="review__activity-row">
                                                            <strong>Status:</strong>{' '}
                                                            <span className={`status-badge status-badge--${activity.status?.toLowerCase().replace('_', '-') || 'draft'}`}>
                                                                {activity.status || 'DRAFT'}
                                                            </span>
                                                        </div>
                                                        {/* Processor info */}
                                                        {activity.approved_user_id && (
                                                            <div className="review__activity-row">
                                                                <strong>Processed By:</strong> User ID {activity.approved_user_id}
                                                            </div>
                                                        )}
                                                        {/* Rejection / Clarification remarks */}
                                                        {(isRejected || isClarificationRequested) && activity.rejection_remarks && (
                                                            <div className={`review__activity-remarks ${isClarificationRequested ? 'review__activity-remarks--clarify' : ''}`}>
                                                                <AlertCircle size={14} />
                                                                <span>
                                                                    <strong>
                                                                        {isClarificationRequested ? 'Clarification Needed:' : 'Reason:'}
                                                                    </strong>{' '}
                                                                    {activity.rejection_remarks}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="review__activity-actions">
                                                        {/* HOD / Admin actions for SUBMITTED */}
                                                        {canActOnActivities && isSubmitted && (
                                                            <>
                                                                <ActionButton
                                                                    variant="success"
                                                                    onClick={() => handleApprove(activity.activity_id)}
                                                                >
                                                                    <CheckCircle size={16} style={{ marginRight: '6px' }} />
                                                                    Approve
                                                                </ActionButton>
                                                                <ActionButton
                                                                    variant="warning"
                                                                    onClick={() => handleClarifyClick(activity.activity_id)}
                                                                >
                                                                    <HelpCircle size={16} style={{ marginRight: '6px' }} />
                                                                    Clarify
                                                                </ActionButton>
                                                                <ActionButton
                                                                    variant="danger"
                                                                    onClick={() => handleRejectClick(activity.activity_id)}
                                                                >
                                                                    <XCircle size={16} style={{ marginRight: '6px' }} />
                                                                    Reject
                                                                </ActionButton>
                                                            </>
                                                        )}

                                                        {/* Faculty actions */}
                                                        {userRole === 'FACULTY' && (
                                                            <>
                                                                {activity.status === 'DRAFT' && (
                                                                    <ActionButton
                                                                        variant="success"
                                                                        onClick={() => handleRequestApproval(activity.activity_id)}
                                                                    >
                                                                        <Send size={16} style={{ marginRight: '6px' }} />
                                                                        Request Approval
                                                                    </ActionButton>
                                                                )}
                                                                {isClarificationRequested && (
                                                                    <ActionButton
                                                                        variant="warning"
                                                                        onClick={() => handleResubmit(activity.activity_id)}
                                                                    >
                                                                        <Send size={16} style={{ marginRight: '6px' }} />
                                                                        Resubmit after Clarification
                                                                    </ActionButton>
                                                                )}
                                                                {(isSubmitted || isApproved) && (
                                                                    <span className="action-label">
                                                                        {isApproved ? 'Approved ✓' : 'Awaiting Review'}
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}

                                                        {/* Non-action states for HOD/Admin */}
                                                        {canActOnActivities && !isSubmitted && (
                                                            <span className="action-label">
                                                                {isApproved ? 'Approved' : isRejected ? 'Rejected' : isClarificationRequested ? 'Clarification Sent' : '—'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── Reject Modal ───────────────────────────────────── */}
            {rejectModal.show && (
                <div className="review__modal-overlay" onClick={() => setRejectModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="review__modal-title">
                            <XCircle size={20} style={{ color: '#dc2626', marginRight: 8 }} />
                            Reject Activity
                        </h3>
                        <p className="review__modal-desc">Please provide a reason for rejection. The faculty will be notified.</p>
                        <textarea
                            className="review__modal-textarea"
                            placeholder="Enter rejection remarks..."
                            value={rejectRemarks}
                            onChange={(e) => setRejectRemarks(e.target.value)}
                            rows={5}
                            maxLength={2000}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="danger" onClick={handleRejectSubmit}>Submit Rejection</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setRejectModal({ show: false, activityId: null })}>Cancel</ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Clarify Modal ──────────────────────────────────── */}
            {clarifyModal.show && (
                <div className="review__modal-overlay" onClick={() => setClarifyModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="review__modal-title">
                            <HelpCircle size={20} style={{ color: '#d97706', marginRight: 8 }} />
                            Request Clarification
                        </h3>
                        <p className="review__modal-desc">
                            Describe what information or changes are needed. The faculty will be able to edit and resubmit.
                        </p>
                        <textarea
                            className="review__modal-textarea"
                            placeholder="Enter clarification request..."
                            value={clarifyRemarks}
                            onChange={(e) => setClarifyRemarks(e.target.value)}
                            rows={5}
                            maxLength={2000}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="warning" onClick={handleClarifySubmit}>Send Clarification Request</ActionButton>
                            <ActionButton variant="secondary" onClick={() => setClarifyModal({ show: false, activityId: null })}>Cancel</ActionButton>
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
