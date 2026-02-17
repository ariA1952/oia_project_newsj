import { useState, useEffect } from 'react';
import ParameterRow from '../components/ParameterRow';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import {
    getCollaborationActivities,
    createCollaborationActivity,
    updateCollaborationActivity,
} from '../services/metricsService';
import './DataEntry.css';

const DataEntry = () => {
    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [context, setContext] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
        erp_campus_department_mapping_id: '',
    });
    const [existingActivities, setExistingActivities] = useState({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (context.academic_year_id && context.quarter_id && context.erp_campus_department_mapping_id) {
            fetchExistingActivities();
        }
    }, [context.erp_campus_department_mapping_id, context.academic_year_id, context.quarter_id]);

    const fetchExistingActivities = async () => {
        setLoading(true);
        try {
            const data = await getCollaborationActivities({
                academic_year_id: context.academic_year_id,
                quarter_id: context.quarter_id,
                campus_id: context.campus_id,
                department_id: context.department_id,
            });

            // Map activities by parameter_id for easy lookup
            const mapped = {};
            data.forEach((activity) => {
                mapped[activity.parameter_id] = activity;
            });
            setExistingActivities(mapped);
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
        const newContext = { ...context, [key]: value };

        // When campus or department changes, find the mapping ID
        if (key === 'campus_id' || key === 'department_id') {
            // In real implementation, fetch the erp_campus_department_mapping_id
            // For now, using a placeholder
            if (newContext.campus_id && newContext.department_id) {
                newContext.erp_campus_department_mapping_id = 1; // Placeholder
            }
        }

        setContext(newContext);
    };

    const handleSaveActivity = async (activityData) => {
        if (!validateContext()) return;

        const existingActivity = existingActivities[activityData.parameter_id];

        const payload = {
            parameter_id: activityData.parameter_id,
            erp_campus_department_mapping_id: context.erp_campus_department_mapping_id,
            erp_academic_year_id: parseInt(context.academic_year_id),
            quarter_id: parseInt(context.quarter_id),
            university_id: activityData.university_id,
            numeric_value: activityData.numeric_value,
            activity_data: activityData.activity_data,
            status: 'draft',
        };

        try {
            if (existingActivity) {
                // Update existing
                await updateCollaborationActivity(existingActivity.activity_id, payload);
                setNotification({
                    message: 'Activity updated successfully',
                    type: 'success',
                });
            } else {
                // Create new
                await createCollaborationActivity(payload);
                setNotification({
                    message: 'Activity created successfully',
                    type: 'success',
                });
            }

            // Refresh activities
            fetchExistingActivities();
        } catch (error) {
            setNotification({
                message: error.detail || 'Failed to save activity',
                type: 'error',
            });
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
        if (!context.academic_year_id || !context.quarter_id || !context.campus_id || !context.department_id) {
            setNotification({
                message: 'Please select Academic Year, Quarter, Campus, and Department',
                type: 'warning',
            });
            return false;
        }
        return true;
    };

    const isContextSelected =
        context.academic_year_id && context.quarter_id && context.campus_id && context.department_id;

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    return (
        <div className="data-entry">
            <div className="data-entry__header">
                <h1 className="data-entry__title">Data Entry</h1>
                <p className="data-entry__subtitle">
                    Enter collaboration activity metrics for each parameter
                </p>
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
                </div>
            </div>

            {isContextSelected && (
                <div className="data-entry__parameters">
                    <h3 className="data-entry__section-title">Parameters</h3>

                    {loading ? (
                        <div className="data-entry__loader">
                            <Loader size="large" />
                        </div>
                    ) : (
                        <>
                            <div className="data-entry__grid-header">
                                <span>Parameter</span>
                                <span>Value</span>
                                <span>Partner University</span>
                                <span>Document</span>
                                <span>Actions</span>
                            </div>

                            <div className="data-entry__parameter-list">
                                {masterData.parameters.map((parameter) => (
                                    <ParameterRow
                                        key={parameter.parameter_id}
                                        parameter={parameter}
                                        existingData={existingActivities[parameter.parameter_id]}
                                        universities={masterData.universities}
                                        onSave={handleSaveActivity}
                                        onDelete={handleDeleteActivity}
                                        disabled={existingActivities[parameter.parameter_id]?.status === 'approved'}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {!isContextSelected && (
                <div className="data-entry__empty">
                    <p>Please select Academic Year, Quarter, Campus, and Department to begin</p>
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

export default DataEntry;
