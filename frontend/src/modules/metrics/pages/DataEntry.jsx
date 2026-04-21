import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, ShieldOff } from 'lucide-react';
import ParameterRow from '../components/ParameterRow';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import useUserProfile from '../hooks/useUserProfile';
import { getParamConfig } from '../config/parameterConfigs';
import {
    getCollaborationActivities,
    createCollaborationActivity,
    updateCollaborationActivity,
    submitCollaborationActivity,
    deleteCollaborationActivity,
} from '../services/metricsService';
import './DataEntry.css';

const DataEntry = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const userRole = user?.erp_users_type;
    const isHOD = ['HOD', 'COORDINATOR'].includes(userRole);
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const { masterData, loading: masterDataLoading, error: masterDataError } = useMetricsMasterData();
    const { profile, loading: profileLoading } = useUserProfile();
    const [context, setContext] = useState({
        academic_year_id: searchParams.get('ay_id') || '',
        campus_id: searchParams.get('c_id') || '',
        department_id: searchParams.get('d_id') || '',
    });
    const [existingActivities, setExistingActivities] = useState({});
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedParameterId, setSelectedParameterId] = useState(searchParams.get('edit_p_id') || '');
    const [searchQuery, setSearchQuery] = useState('');

    // If faculty/HOD, lock the mapping to their own
    const mappingId = searchParams.get('m_id') || user?.erp_campus_department_mapping_id;

    // Auto-set context from backend profile once loaded
    useEffect(() => {
        if (profileLoading) return;
        setContext(prev => ({
            ...prev,
            academic_year_id: prev.academic_year_id || (profile.current_academic_year_id ? String(profile.current_academic_year_id) : ''),
            campus_id: prev.campus_id || (profile.campus_id ? String(profile.campus_id) : ''),
            department_id: prev.department_id || (profile.dept_id ? String(profile.dept_id) : ''),
        }));
    }, [profileLoading]);

    useEffect(() => {
        if (mappingId || (context.campus_id && context.department_id)) {
            fetchExistingActivities();
        }
        // If we have an edit_p_id in URL, make sure the dropdown reflects it
        const paramId = searchParams.get('edit_p_id');
        if (paramId && paramId !== selectedParameterId) {
            setSelectedParameterId(paramId);
        }
    }, [mappingId, context.academic_year_id, context.campus_id, context.department_id]);

    const fetchExistingActivities = async () => {
        if (!context.academic_year_id) {
            setExistingActivities({});
            return;
        }
        setLoading(true);
        try {
            const data = await getCollaborationActivities({
                academic_year_id: context.academic_year_id,
                erp_campus_department_mapping_id: mappingId || undefined,
                campus_id: context.campus_id || undefined,
                department_id: context.department_id || undefined,
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
            activity_title: activityData.activity_title || undefined,
            activity_data: activityData.activity_data || undefined,
            rowFiles: activityData.rowFiles || [],
            campus_id: context.campus_id ? parseInt(context.campus_id) : undefined,
            erp_academic_year_id: parseInt(context.academic_year_id),
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

    useEffect(() => {
        if (!loading && !masterDataLoading && !profileLoading && selectedParameterId && searchParams.get('edit_p_id')) {
            setTimeout(() => {
                const el = document.getElementById('active-parameter-row');
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, [loading, masterDataLoading, profileLoading, selectedParameterId]);

    const handleDeleteActivity = async (activityId) => {
        try {
            await deleteCollaborationActivity(activityId);
            setNotification({
                message: 'Activity deleted successfully',
                type: 'success',
            });
            fetchExistingActivities();
        } catch (error) {
            setNotification({
                message: error?.detail || 'Failed to delete activity',
                type: 'error',
            });
        }
    };

    const validateContext = () => {
        if (!isContextSelected) {
            setNotification({
                message: 'Please select Academic Year to proceed.',
                type: 'warning',
            });
            return false;
        }
        return true;
    };

    const isContextSelected =
        context.academic_year_id && (mappingId || (context.campus_id && context.department_id));

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    if (masterDataError) {
        return <div className="data-entry__error">Error loading data: {masterDataError}</div>;
    }

    // HOD cannot create/edit activities — show read-only view banner
    if (isHOD) {
        return (
            <div className="data-entry">
                <div className="data-entry__header">
                    <h1 className="data-entry__title">Data Entry Console</h1>
                    <p className="data-entry__subtitle">Collaboration activity metrics</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, color: '#c2410c', fontSize: '0.9rem', marginTop: 12 }}>
                    <ShieldOff size={18} />
                    <span>
                        <strong>Access Restricted</strong> — HODs cannot create or edit activities.
                        Please use the <strong>Review</strong> page to approve or reject submitted activities.
                    </span>
                </div>
            </div>
        );
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
                <div className="data-entry__parameter-selection">
                    <h3 className="data-entry__section-title">Select Collaboration Parameter</h3>
                    <div className="data-entry__selection-controls">
                        <select
                            className="data-entry__select data-entry__select--large"
                            value={selectedParameterId}
                            onChange={(e) => setSelectedParameterId(e.target.value)}
                            disabled={!isContextSelected}
                        >
                            <option value="">-- Choose a Parameter to enter data --</option>
                            {masterData.parameters
                                // Non-admins cannot see or select Exchange Students parameter
                                .filter((p) => {
                                    const name = p.parameter_name?.toLowerCase() ?? '';
                                    if (name.includes('exchange student') && !isAdmin) return false;
                                    return name.includes(searchQuery.toLowerCase());
                                })
                                .map((p) => {
                                    const cfg = getParamConfig(p);
                                    const adminTag = cfg?.adminOnly ? ' ★ OIA Admin only' : '';
                                    return (
                                        <option key={p.parameter_id} value={p.parameter_id}>
                                            {p.parameter_name}{adminTag}
                                        </option>
                                    );
                                })}
                        </select>
                        <input
                            type="text"
                            placeholder="Search parameters..."
                            className="data-entry__input-text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={!isContextSelected}
                        />
                    </div>
                </div>

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
                            <span>Activity Details</span>
                            <span>Status</span>
                            <span>Actions</span>
                        </div>

                        <div className="data-entry__parameter-list">
                            {selectedParameterId ? (
                                masterData.parameters
                                    .filter(p => p.parameter_id === parseInt(selectedParameterId))
                                    .map((parameter, idx) => {
                                        let activities = existingActivities[String(parameter.parameter_id)] || [null];

                                        // NEW: For Admin and Faculty, hide APPROVED rows in data entry view
                                        if (['OIA_ADMIN', 'SUPER_ADMIN', 'FACULTY'].includes(user?.erp_users_type)) {
                                            activities = activities.filter(a => !a || (a.status !== 'APPROVED' && a.status !== 'REJECTED'));
                                            // If we filtered everything out, show a blank row to allow new entries
                                            if (activities.length === 0) {
                                                activities = [null];
                                            }
                                        }

                                        // Ensure new entries (null) are always at the top
                                        activities.sort((a, b) => {
                                            if (a === null && b !== null) return -1;
                                            if (a !== null && b === null) return 1;
                                            return 0;
                                        });

                                        return activities.map((activity, index) => (
                                            <div
                                                key={activity?.activity_id || `new-${parameter.parameter_id}-${index}`}
                                                id={index === 0 ? "active-parameter-row" : undefined}
                                            >
                                                <ParameterRow
                                                    parameter={parameter}
                                                    existingData={activity}
                                                    universities={masterData.universities}
                                                    onSave={(data) => handleSaveActivity(data, activity?.activity_id)}
                                                    onDelete={handleDeleteActivity}
                                                    onSubmit={handleSubmitForApproval}
                                                    userRole={userRole}
                                                    autoEdit={!!searchParams.get('edit_p_id')}
                                                    onAdd={() => {
                                                        const freshMapping = { ...existingActivities };
                                                        const pid = String(parameter.parameter_id);
                                                        if (!freshMapping[pid]) {
                                                            freshMapping[pid] = [null];
                                                        } else {
                                                            freshMapping[pid] = [null, ...freshMapping[pid]];
                                                        }
                                                        setExistingActivities(freshMapping);
                                                    }}
                                                    disabled={(!mappingId && !isContextSelected) || (activity?.status && activity?.status !== 'DRAFT' && activity?.status !== 'REJECTED' && activity?.status !== 'CLARIFICATION_REQUESTED')}
                                                    isContextSelected={isContextSelected}
                                                />
                                            </div>
                                        ));
                                    })
                            ) : (
                                <div className="data-entry__empty-state">
                                    <Info size={48} className="data-entry__empty-icon" />
                                    <p>Select a parameter from the dropdown above to start entering data.</p>
                                </div>
                            )}
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
