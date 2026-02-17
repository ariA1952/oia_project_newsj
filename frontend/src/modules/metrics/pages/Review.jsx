import { useState, useEffect } from 'react';
import FilterBar from '../components/FilterBar';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getCollaborationActivities, updateCollaborationActivity } from '../services/metricsService';
import './Review.css';

const Review = () => {
    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        department_id: '',
    });
    const [activities, setActivities] = useState([]);
    const [groupedActivities, setGroupedActivities] = useState({});
    const [expandedParams, setExpandedParams] = useState({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [rejectModal, setRejectModal] = useState({ show: false, activityId: null });
    const [rejectRemarks, setRejectRemarks] = useState('');

    useEffect(() => {
        if (filters.academic_year_id && filters.quarter_id) {
            fetchActivities();
        }
    }, [filters]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const data = await getCollaborationActivities(filters);
            setActivities(data);
            groupActivitiesByParameter(data);
        } catch (error) {
            setNotification({
                message: 'Failed to fetch activities',
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
            await updateCollaborationActivity(activityId, { status: 'approved' });
            setNotification({
                message: 'Activity approved successfully',
                type: 'success',
            });
            fetchActivities();
        } catch (error) {
            setNotification({
                message: 'Failed to approve activity',
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
            await updateCollaborationActivity(rejectModal.activityId, {
                status: 'rejected',
                activity_data: { rejection_remarks: rejectRemarks },
            });
            setNotification({
                message: 'Activity rejected',
                type: 'success',
            });
            setRejectModal({ show: false, activityId: null });
            setRejectRemarks('');
            fetchActivities();
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
                <h1 className="review__title">Review & Approval</h1>
                <p className="review__subtitle">
                    Review and approve or reject collaboration activities
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
                            <p>No activities found for the selected filters</p>
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
                                                        <span className={`review__status review__status--${activity.status || 'draft'}`}>
                                                            {activity.status || 'draft'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="review__activity-actions">
                                                    <ActionButton
                                                        variant="success"
                                                        onClick={() => handleApprove(activity.activity_id)}
                                                        disabled={activity.status === 'approved'}
                                                    >
                                                        Approve
                                                    </ActionButton>
                                                    <ActionButton
                                                        variant="danger"
                                                        onClick={() => handleRejectClick(activity.activity_id)}
                                                        disabled={activity.status === 'rejected'}
                                                    >
                                                        Reject
                                                    </ActionButton>
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
