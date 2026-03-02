import { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
    rejectCollaborationActivity
} from '../services/metricsService';
import './Review.css';

const Review = () => {
    const { user } = useAuth();
    const userRole = user?.erp_users_type;
    const mappingId = user?.erp_campus_department_mapping_id;

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
    const [rejectModal, setRejectModal] = useState({ show: false, activityId: null });
    const [rejectRemarks, setRejectRemarks] = useState('');

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

            // If it's an HOD or Admin just looking for work, show SUBMITTED by default
            // unless they specifically filtered for something else.
            // But usually this page is for "Review", so we prioritize SUBMITTED.
            const allActivities = await getCollaborationActivities(queryParams);

            let data = allActivities;
            if (userRole === 'FACULTY') {
                // Faculty sees all their requests for tracking
                data = allActivities;
            } else if (userRole === 'HOD' || userRole === 'OIA_ADMIN') {
                // HOD sees items needing action or already approved
                // Admin sees everything that has been processed (SUBMITTED, APPROVED, REJECTED)
                if (userRole === 'OIA_ADMIN') {
                    data = allActivities.filter(a => a.status !== 'DRAFT');
                } else {
                    data = allActivities.filter(a => a.status === 'SUBMITTED' || a.status === 'APPROVED');
                }
            }

            setActivities(data);
            groupActivitiesByParameter(data);
        } catch (error) {
            setNotification({
                message: `Failed to fetch activities`,
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const groupActivitiesByParameter = (data) => {
        const grouped = data.reduce((acc, activity) => {
            const paramId = activity.parameter_id;
            if (!acc[paramId]) {
                acc[paramId] = [];
            }
            acc[paramId].push(activity);
            return acc;
        }, {});
        setGroupedActivities(grouped);
    };

    const toggleExpand = (paramId) => {
        setExpandedParams({
            ...expandedParams,
            [paramId]: !expandedParams[paramId],
        });
    };

    const handleApprove = async (activityId) => {
        try {
            await approveCollaborationActivity(activityId);
            setNotification({
                message: 'Activity approved successfully',
                type: 'success',
            });
            refreshData();
        } catch (error) {
            setNotification({
                message: 'Failed to approve activity',
                type: 'error',
            });
        }
    };

    const handleRequestApproval = async (activityId) => {
        try {
            await submitCollaborationActivity(activityId);
            setNotification({
                message: 'Request sent to HOD/Admin for approval',
                type: 'success',
            });
            refreshData();
        } catch (error) {
            setNotification({
                message: 'Failed to send request',
                type: 'error',
            });
        }
    };

    const handleRejectClick = (activityId) => {
        setRejectModal({ show: true, activityId });
        setRejectRemarks('');
    };

    const handleRejectSubmit = async () => {
        if (!rejectRemarks.trim()) {
            setNotification({
                message: 'Please enter rejection remarks',
                type: 'warning',
            });
            return;
        }

        try {
            await rejectCollaborationActivity(rejectModal.activityId, rejectRemarks);
            setNotification({
                message: 'Activity rejected',
                type: 'success',
            });
            setRejectModal({ show: false, activityId: null });
            setRejectRemarks('');
            refreshData();
        } catch (error) {
            setNotification({
                message: 'Failed to reject activity',
                type: 'error',
            });
        }
    };

    const getParameterName = (paramId) => {
        const param = masterData.parameters.find((p) => p.parameter_id === paramId);
        return param?.parameter_name || `Parameter ${paramId}`;
    };

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    return (
        <div className="review">
            <div className="review__header">
                <h1 className="review__title">
                    {userRole === 'FACULTY' ? 'Track My Requests' : 'Review & Approval'}
                </h1>
                <p className="review__subtitle">
                    {userRole === 'FACULTY'
                        ? 'Monitor the status of your submitted collaboration activities'
                        : 'Review and approve or reject incoming collaboration activities'}
                </p>
            </div>

            <FilterBar
                filters={filters}
                onChange={setFilters}
                masterData={masterData}
                loading={loading}
            />

            {loading ? (
                <div className="review__loader">
                    <Loader size="large" />
                </div>
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
                                        {paramActivities.map((activity) => (
                                            <div key={activity.activity_id} className="review__activity-card">
                                                <div className="review__activity-info">
                                                    <div className="review__activity-row">
                                                        <strong>Value:</strong> {activity.numeric_value || 'N/A'}
                                                    </div>
                                                    <div className="review__activity-row">
                                                        <strong>University:</strong>{' '}
                                                        {masterData.universities.find((u) => u.university_id === activity.university_id)
                                                            ?.university_name || 'N/A'}
                                                    </div>
                                                    <div className="review__activity-row">
                                                        <strong>Status:</strong>{' '}
                                                        <span className={`status-badge status-badge--${activity.status?.toLowerCase() || 'draft'}`}>
                                                            {activity.status || 'DRAFT'}
                                                        </span>
                                                    </div>
                                                    {activity.approved_user_id && (
                                                        <div className="review__activity-row">
                                                            <strong>Processed By:</strong> User ID {activity.approved_user_id}
                                                        </div>
                                                    )}
                                                    {activity.status === 'REJECTED' && activity.rejection_remarks && (
                                                        <div className="review__activity-remarks">
                                                            <AlertCircle size={14} />
                                                            <span><strong>Reason:</strong> {activity.rejection_remarks}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="review__activity-actions">
                                                    {(userRole === 'HOD' || userRole === 'OIA_ADMIN') && activity.status === 'SUBMITTED' ? (
                                                        <>
                                                            <ActionButton
                                                                variant="success"
                                                                onClick={() => handleApprove(activity.activity_id)}
                                                            >
                                                                <CheckCircle size={16} style={{ marginRight: '8px' }} />
                                                                Approve
                                                            </ActionButton>
                                                            <ActionButton
                                                                variant="danger"
                                                                onClick={() => handleRejectClick(activity.activity_id)}
                                                            >
                                                                <XCircle size={16} style={{ marginRight: '8px' }} />
                                                                Reject
                                                            </ActionButton>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {userRole === 'FACULTY' && activity.status === 'DRAFT' ? (
                                                                <ActionButton
                                                                    variant="success"
                                                                    onClick={() => handleRequestApproval(activity.activity_id)}
                                                                >
                                                                    <Send size={16} style={{ marginRight: '8px' }} />
                                                                    Request Approval
                                                                </ActionButton>
                                                            ) : (
                                                                <span className="action-label">
                                                                    {activity.status === 'APPROVED' ? 'Finalized' :
                                                                        activity.status === 'SUBMITTED' ? 'Awaiting Review' : 'Draft'}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Reject Modal */}
            {rejectModal.show && (
                <div className="review__modal-overlay" onClick={() => setRejectModal({ show: false, activityId: null })}>
                    <div className="review__modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="review__modal-title">Reject Activity</h3>
                        <textarea
                            className="review__modal-textarea"
                            placeholder="Enter rejection remarks..."
                            value={rejectRemarks}
                            onChange={(e) => setRejectRemarks(e.target.value)}
                            rows={5}
                        />
                        <div className="review__modal-actions">
                            <ActionButton variant="danger" onClick={handleRejectSubmit}>
                                Submit
                            </ActionButton>
                            <ActionButton
                                variant="secondary"
                                onClick={() => setRejectModal({ show: false, activityId: null })}
                            >
                                Cancel
                            </ActionButton>
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
