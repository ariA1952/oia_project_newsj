import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import ParameterRow from '../components/ParameterRow';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import useUserProfile from '../hooks/useUserProfile';
import {
    getCollaborationActivities,
    createCollaborationActivity,
    updateCollaborationActivity,
    submitCollaborationActivity,
} from '../services/metricsService';
import './DataEntry.css';

const DataEntry = () => {
    const { user } = useAuth();
    const { masterData, loading: masterDataLoading, error: masterDataError } = useMetricsMasterData();
    const { profile, loading: profileLoading } = useUserProfile();
    console.log('DataEntry: masterDataLoading:', masterDataLoading, 'masterData:', masterData);
    const [context, setContext] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
    });
    const [existingActivities, setExistingActivities] = useState({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // If faculty/HOD, lock the mapping to their own
    const mappingId = user?.erp_campus_department_mapping_id;

    // Auto-set context from backend profile once loaded
    useEffect(() => {
        if (profileLoading) return;
        setContext(prev => ({
            ...prev,
            academic_year_id: profile.current_academic_year_id ? String(profile.current_academic_year_id) : prev.academic_year_id,
            campus_id: profile.campus_id ? String(profile.campus_id) : prev.campus_id,
            department_id: profile.dept_id ? String(profile.dept_id) : prev.department_id,
        }));
    }, [profileLoading]);

    useEffect(() => {
        if (mappingId || (context.campus_id && context.department_id)) {
            fetchExistingActivities();
        }
    }, [mappingId, context.academic_year_id, context.quarter_id, context.campus_id, context.department_id]);

    const fetchExistingActivities = async () => {
        if (!context.academic_year_id || !context.quarter_id) {
            setExistingActivities({});
            return;
        }
        setLoading(true);
        try {
            const data = await getCollaborationActivities({
                academic_year_id: context.academic_year_id,
                quarter_id: context.quarter_id,
                erp_campus_department_mapping_id: mappingId || undefined,
            });

            // Group activities by parameter_id (Normalize keys to strings for safe lookup)
            const grouped = {};
            console.log('DataEntry: Fetched activities:', data.length);
            data.forEach((activity) => {
                const pid = String(activity.parameter_id);
                if (!grouped[pid]) {
                    grouped[pid] = [];
                }
                grouped[pid].push(activity);
            });
            console.log('DataEntry: Grouped activities:', Object.keys(grouped));
            setExistingActivities(grouped);
        } catch (error) {
            setNotification({
                message: 'Failed to fetch existing activities',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleContextChange = (key, value) => {
        setContext({ ...context, [key]: value });
    };

    const handleSaveActivity = async (activityData, activityId = null) => {
        if (!validateContext()) return;

        const payload = {
            parameter_id: activityData.parameter_id,
            campus_id: context.campus_id ? parseInt(context.campus_id) : undefined,
            department_id: context.department_id ? parseInt(context.department_id) : undefined,
            erp_academic_year_id: parseInt(context.academic_year_id),
            quarter_id: parseInt(context.quarter_id),
            university_id: activityData.university_id,
            numeric_value: activityData.numeric_value,
            activity_data: activityData.activity_data,
        };

        try {
            if (activityId) {
                await updateCollaborationActivity(activityId, payload);
                setNotification({ message: 'Entry updated successfully', type: 'success' });
            } else {
                await createCollaborationActivity(payload);
                setNotification({ message: 'Entry created successfully', type: 'success' });
            }
            fetchExistingActivities();
        } catch (error) {
            setNotification({
                message: error.detail || 'Failed to save activity',
                type: 'error',
            });
        }
    };

    const handleSubmitForApproval = async (activityId) => {
        try {
            setLoading(true);
            await submitCollaborationActivity(activityId);
            setNotification({
                message: 'Activity submitted for approval successfully',
                type: 'success',
            });
            fetchExistingActivities();
        } catch (error) {
            setNotification({
                message: error.detail || 'Failed to submit activity',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteActivity = async (activityId) => {
        // Note: DELETE endpoint not in requirements, using PUT with status='deleted'
        try {
            await updateCollaborationActivity(activityId, { status: 'deleted' });
            setNotification({
                message: 'Activity deleted successfully',
                type: 'success',
            });
            fetchExistingActivities();
        } catch (error) {
            setNotification({
                message: 'Failed to delete activity',
                type: 'error',
            });
        }
    };

    const validateContext = () => {
        if (!isContextSelected) {
            setNotification({
                message: 'Please select Academic Year and Quarter to proceed.',
                type: 'warning',
            });
            return false;
        }
        return true;
    };

    const isContextSelected =
        context.academic_year_id && context.quarter_id && (mappingId || (context.campus_id && context.department_id));

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    if (masterDataError) {
        return <div className="data-entry__error">Error loading data: {masterDataError}</div>;
    }

    if (!masterData.parameters || masterData.parameters.length === 0) {
        console.warn('DataEntry: No parameters found in masterData');
    }

    return (
        <div className="data-entry">
            <div className="data-entry__header">
                <h1 className="data-entry__title">Data Entry Console</h1>
                <p className="data-entry__subtitle">
                    Enter collaboration activity metrics for each parameter
                </p>
                {/* Visibility marker */}
                <div style={{ height: '2px', background: '#2563eb', margin: '10px 0' }}></div>
            </div>

            <div className="data-entry__context">
                <h3 className="data-entry__section-title">Select Context</h3>
                <div className="data-entry__context-grid">
                    <div className="data-entry__field">
                        <label className="data-entry__label">Academic Year *</label>
                        <select
                            className="data-entry__select"
                            value={context.academic_year_id}
                            onChange={(e) => handleContextChange('academic_year_id', e.target.value)}
                        >
                            <option value="">Select Academic Year</option>
                            {masterData.academicYears.map((year) => (
                                <option key={year.erp_academic_year_id} value={year.erp_academic_year_id}>
                                    {year.academic_year_name || year.academic_year}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="data-entry__field">
                        <label className="data-entry__label">Quarter *</label>
                        <select
                            className="data-entry__select"
                            value={context.quarter_id}
                            onChange={(e) => handleContextChange('quarter_id', e.target.value)}
                        >
                            <option value="">Select Quarter</option>
                            {masterData.quarters.map((quarter) => (
                                <option key={quarter.quarter_id} value={quarter.quarter_id}>
                                    Q{quarter.quarter_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!mappingId && (
                        <>
                            <div className="data-entry__field">
                                <label className="data-entry__label">Campus *</label>
                                <select
                                    className="data-entry__select"
                                    value={context.campus_id}
                                    onChange={(e) => handleContextChange('campus_id', e.target.value)}
                                >
                                    <option value="">Select Campus</option>
                                    {masterData.campuses.map((campus) => (
                                        <option key={campus.erp_campus_id} value={campus.erp_campus_id}>
                                            {campus.campus_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="data-entry__field">
                                <label className="data-entry__label">Department *</label>
                                <select
                                    className="data-entry__select"
                                    value={context.department_id}
                                    onChange={(e) => handleContextChange('department_id', e.target.value)}
                                >
                                    <option value="">Select Department</option>
                                    {masterData.departments.map((dept) => (
                                        <option key={dept.erp_department_id} value={dept.erp_department_id}>
                                            {dept.department_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="data-entry__parameters">
                <h3 className="data-entry__section-title">Collaboration Parameters</h3>

                {loading ? (
                    <div className="data-entry__loader">
                        <Loader size="large" />
                    </div>
                ) : (
                    <>
                        {(!mappingId && !isContextSelected) && (
                            <div className="data-entry__info-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: '#e3f2fd', color: '#0d47a1', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
                                <Info size={16} />
                                Please select all context fields above to see and enter data.
                            </div>
                        )}
                        <div className="data-entry__grid-header">
                            <span>Parameter</span>
                            <span>Value</span>
                            <span>Partner University</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>

                        <div className="data-entry__parameter-list">
                            {masterData.parameters.map((parameter, idx) => {
                                let activities = existingActivities[String(parameter.parameter_id)] || [null];

                                // NEW: For Admin and Faculty, hide APPROVED rows
                                if (user?.erp_users_type === 'OIA_ADMIN' || user?.erp_users_type === 'FACULTY') {
                                    activities = activities.filter(a => !a || a.status !== 'APPROVED');
                                    // If we filtered everything out, show a blank row to allow new entries
                                    if (activities.length === 0) {
                                        activities = [null];
                                    }
                                }

                                if (idx === 0) console.log('DataEntry: Param 1 activities:', activities);
                                return activities.map((activity, index) => (
                                    <ParameterRow
                                        key={activity?.activity_id || `new-${parameter.parameter_id}-${index}`}
                                        parameter={parameter}
                                        existingData={activity}
                                        universities={masterData.universities}
                                        onSave={(data) => handleSaveActivity(data, activity?.activity_id)}
                                        onDelete={handleDeleteActivity}
                                        onSubmit={handleSubmitForApproval}
                                        onAdd={() => {
                                            const freshMapping = { ...existingActivities };
                                            if (!freshMapping[parameter.parameter_id]) {
                                                freshMapping[parameter.parameter_id] = [null];
                                            }
                                            freshMapping[parameter.parameter_id].push(null);
                                            setExistingActivities(freshMapping);
                                        }}
                                        disabled={(!mappingId && !isContextSelected) || (activity?.status && activity?.status !== 'DRAFT' && activity?.status !== 'REJECTED')}
                                        isContextSelected={isContextSelected}
                                    />
                                ));
                            })}
                        </div>
                    </>
                )}
            </div>

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

export default DataEntry;
