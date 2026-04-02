import { useState, useEffect, Fragment } from 'react';
import { Send, CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
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
    getClarifications,
    downloadActivityDocument,
} from '../services/metricsService';
import './Review.css';

const Review = () => {
    const { user } = useAuth();
    const userRole = user?.erp_users_type;
    const mappingId = user?.erp_campus_department_mapping_id;
    const canActOnActivities = ['HOD', 'COORDINATOR', 'OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const { profile, loading: profileLoading } = useUserProfile();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
        parameter_id: '',
    });
    const [activities, setActivities] = useState([]);
    const [groupedActivities, setGroupedActivities] = useState({});
    const [expandedParams, setExpandedParams] = useState({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL'); // NEW: For Faculty Tabs

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
            } else if (['HOD', 'COORDINATOR'].includes(userRole)) {
                // HOD sees SUBMITTED + APPROVED + REJECTED + CLARIFICATION_REQUESTED
                data = allActivities.filter(a =>
                    ['SUBMITTED', 'APPROVED', 'REJECTED', 'CLARIFICATION_REQUESTED'].includes(a.status)
                );
            } else if (['OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
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
            // requestClarification sets status to CLARIFICATION_REQUESTED and saves the message
            // in the ActivityClarification table (and sets rejection_remarks on the activity)
            await requestClarification(clarifyModal.activityId, clarifyRemarks.trim());

            setNotification({ message: 'Clarification requested from faculty', type: 'success' });
            setClarifyModal({ show: false, activityId: null });
            setClarifyRemarks('');
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to request clarification', type: 'error' });
        }
    };

    const handleChatReply = async (activityId, message) => {
        try {
            await sendClarificationReply(activityId, message);
            setNotification({ message: 'Reply sent', type: 'success' });
            // refreshData is actually called inside ClarificationChat usually, 
            // but we can trigger it here to refresh status badges if needed.
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to send reply', type: 'error' });
        }
    };

    // ── Faculty: Resubmit (after clarification) ─────────────────────────────────
    const handleResubmit = async (activityId) => {
        try {
            // Clear the remarks once resubmitted
            await updateCollaborationActivity(activityId, { rejection_remarks: '' });

            await submitCollaborationActivity(activityId);
            setNotification({ message: 'Activity resubmitted for approval', type: 'success' });
            refreshData();
        } catch (error) {
            setNotification({ message: error?.detail || 'Failed to resubmit', type: 'error' });
        }
    };

    // Open activity document using auth header (blob URL)
    const handleViewDocument = async (activityId) => {
        try {
            const blobUrl = await downloadActivityDocument(activityId);
            window.open(blobUrl, '_blank');
        } catch {
            setNotification({ message: 'Failed to load document', type: 'error' });
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
                                    ? 'No activities found in this tab'
                                    : 'No pending activities found for review'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {userRole === 'FACULTY' && (
                                <div className="review__tabs">
                                    {['ALL', 'SUBMITTED', 'CLARIFICATION_REQUESTED', 'APPROVED', 'REJECTED'].map(tab => (
                                        <button
                                            key={tab}
                                            className={`review__tab-button ${activeTab === tab ? 'review__tab-button--active' : ''}`}
                                            onClick={() => setActiveTab(tab)}
                                        >
                                            {tab.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {Object.entries(groupedActivities).map(([paramId, paramActivities]) => {
                                // Filter activities for faculty based on selected tab
                                const displayActivities = userRole === 'FACULTY' && activeTab !== 'ALL'
                                    ? paramActivities.filter(a => a.status === activeTab)
                                    : paramActivities;

                                if (displayActivities.length === 0) return null;

                                return (
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
                                                {userRole === 'FACULTY' ? (
                                                    displayActivities.map((activity) => {
                                                        const isClarificationRequested = activity.status === 'CLARIFICATION_REQUESTED';
                                                        const isSubmitted = activity.status === 'SUBMITTED';
                                                        const isApproved = activity.status === 'APPROVED';
                                                        const isRejected = activity.status === 'REJECTED';
                                                        const docUrl = !!activity.document_path;

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
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleViewDocument(activity.activity_id)}
                                                                                className="review__doc-link"
                                                                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                                                            >
                                                                                View / Download
                                                                            </button>
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
                                                                            {isClarificationRequested ? <HelpCircle size={14} /> : <AlertCircle size={14} />}
                                                                            <span>
                                                                                <strong>{isClarificationRequested ? 'Clarification Note:' : 'Reason for Rejection:'}</strong>{' '}
                                                                                {activity.rejection_remarks.split('|||').pop().replace('[REVIEWER]:', '').replace('[FACULTY]:', '').trim()}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {isClarificationRequested && (
                                                                        <ClarificationChat
                                                                            activity={activity}
                                                                            onReply={(newRemarks) => handleChatReply(activity.activity_id, newRemarks)}
                                                                        />
                                                                    )}
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="review__activity-actions">
                                                                    {/* Faculty actions */}
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
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="review__table-container">
                                                        <table className="review__table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Title / Detail</th>
                                                                    <th>Value</th>
                                                                    <th>University</th>
                                                                    <th>Duration</th>
                                                                    <th>Status</th>
                                                                    <th>Processed By</th>
                                                                    <th>Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {displayActivities.map((activity) => {
                                                                    const isClarificationRequested = activity.status === 'CLARIFICATION_REQUESTED';
                                                                    const isSubmitted = activity.status === 'SUBMITTED';
                                                                    const isApproved = activity.status === 'APPROVED';
                                                                    const isRejected = activity.status === 'REJECTED';
                                                                    const docUrl = !!activity.document_path;

                                                                    return (
                                                                        <Fragment key={activity.activity_id}>
                                                                            <tr className={isClarificationRequested ? 'review__table-row--has-chat' : ''}>
                                                                                <td>
                                                                                    <div className="review__table-title">{activity.activity_title || 'N/A'}</div>
                                                                                    {activity.activity_data?.remarks && <div className="review__table-remarks">{activity.activity_data.remarks}</div>}
                                                                                    {docUrl && <button type="button" onClick={() => handleViewDocument(activity.activity_id)} className="review__doc-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>View Doc</button>}

                                                                                    {(isRejected || isClarificationRequested) && activity.rejection_remarks && (
                                                                                        <div className={`review__activity-remarks ${isClarificationRequested ? 'review__activity-remarks--clarify' : ''}`} style={{ marginTop: '8px' }}>
                                                                                            {isClarificationRequested ? <HelpCircle size={14} /> : <AlertCircle size={14} />}
                                                                                            <span>
                                                                                                <strong>{isClarificationRequested ? 'Note:' : 'Reason:'}</strong> {activity.rejection_remarks.split('|||').pop().replace('[REVIEWER]:', '').replace('[FACULTY]:', '').trim()}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </td>
                                                                                <td>{activity.numeric_value ?? 'N/A'}</td>
                                                                                <td>{getUniversityName(activity.university_id) || `ID #${activity.university_id}`}</td>
                                                                                <td>
                                                                                    {(activity.start_date || activity.end_date) ? `${activity.start_date || '—'} → ${activity.end_date || '—'}` : '—'}
                                                                                </td>
                                                                                <td>
                                                                                    <span className={`status-badge status-badge--${activity.status?.toLowerCase().replace('_', '-') || 'draft'}`}>
                                                                                        {activity.status || 'DRAFT'}
                                                                                    </span>
                                                                                </td>
                                                                                <td>{activity.approved_user_id ? `User ID ${activity.approved_user_id}` : '—'}</td>
                                                                                <td>
                                                                                    <div className="review__activity-actions">
                                                                                        {canActOnActivities && isSubmitted && (
                                                                                            <>
                                                                                                <ActionButton variant="success" onClick={() => handleApprove(activity.activity_id)}>
                                                                                                    <CheckCircle size={16} /> Approve
                                                                                                </ActionButton>
                                                                                                <ActionButton variant="danger" onClick={() => handleRejectClick(activity.activity_id)}>
                                                                                                    <XCircle size={16} /> Reject
                                                                                                </ActionButton>
                                                                                                <ActionButton variant="warning" onClick={() => handleClarifyClick(activity.activity_id)}>
                                                                                                    <HelpCircle size={16} /> Clarify
                                                                                                </ActionButton>
                                                                                            </>
                                                                                        )}
                                                                                        {canActOnActivities && !isSubmitted && (
                                                                                            <span className="action-label">
                                                                                                {isApproved ? 'Approved' : isRejected ? 'Rejected' : isClarificationRequested ? 'Clarification Sent' : '—'}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                            {isClarificationRequested && (
                                                                                <tr className="review__chat-row">
                                                                                    <td colSpan="7" style={{ padding: '0 16px 16px 16px', borderTop: 'none', borderBottom: '1px solid #e5e7eb' }}>
                                                                                        <ClarificationChat
                                                                                            activity={activity}
                                                                                            onReply={(newRemarks) => handleChatReply(activity.activity_id, newRemarks)}
                                                                                        />
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
                            })}
                        </>
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
