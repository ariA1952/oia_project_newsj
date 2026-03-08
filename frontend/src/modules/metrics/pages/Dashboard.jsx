import { useState, useEffect } from 'react';
import {
    Activity,
    FileText,
    BookOpen,
    GraduationCap,
    Users,
    ChevronLeft,
    Search,
    AlertCircle
} from 'lucide-react';
import KPIWidget from '../components/KPIWidget';
import FilterBar from '../components/FilterBar';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getCollaborationActivities } from '../services/metricsService';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const mappingId = user?.erp_campus_department_mapping_id;
    const isAdmin = user?.erp_users_type === 'OIA_ADMIN';

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
    });
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [kpis, setKpis] = useState({
        totalMOUs: 0,
        totalApproved: 0,
        totalPublications: 0,
        facultyExchange: 0,
        studentExchange: 0,
        totalConference: 0,
        totalJointResearch: 0,
        totalRejected: 0,
    });

    const [selectedKPI, setSelectedKPI] = useState(null);

    useEffect(() => {
        fetchActivities();
    }, [filters, mappingId]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const queryParams = {
                ...filters,
                erp_campus_department_mapping_id: mappingId || undefined,
            };
            const data = await getCollaborationActivities(queryParams);

            setActivities(data);
            computeKPIs(data);
        } catch (error) {
            setNotification({
                message: 'Failed to fetch activities',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const computeKPIs = (data) => {
        const approvedData = data.filter(a => a.status === 'APPROVED');
        const rejectedData = data.filter(a => a.status === 'REJECTED');

        const parameterGroups = approvedData.reduce((acc, activity) => {
            const paramId = activity.parameter_id;
            if (!acc[paramId]) {
                acc[paramId] = [];
            }
            acc[paramId].push(activity);
            return acc;
        }, {});

        // Mapping standard parameters based on schema:
        // Note: Assumed mapping IDs.
        setKpis({
            totalMOUs: (parameterGroups[1] || []).length,
            totalApproved: approvedData.length,
            totalPublications: (parameterGroups[2] || []).reduce((sum, a) => sum + (a.numeric_value || 0), 0) || (parameterGroups[2] || []).length,
            facultyExchange: (parameterGroups[4] || []).length,
            studentExchange: (parameterGroups[3] || []).length,
            totalConference: (parameterGroups[5] || []).length, // Assumed ID 5 for conference
            totalJointResearch: (parameterGroups[6] || []).length, // Assumed ID 6 for joint research
            totalRejected: rejectedData.length,
        });
    };

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    const filteredActivitiesForKPI = selectedKPI
        ? (selectedKPI.id === 'APPROVED'
            ? activities.filter(a => a.status === 'APPROVED')
            : selectedKPI.id === 'REJECTED'
                ? activities.filter(a => a.status === 'REJECTED')
                : activities.filter(a => a.parameter_id === selectedKPI.id && a.status === 'APPROVED'))
        : [];

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <h1 className="dashboard__title">
                    {isAdmin ? 'OIA Global Dashboard' : 'Departmental Performance'}
                </h1>
                <p className="dashboard__subtitle">
                    {isAdmin
                        ? 'Consolidated overview of all international collaboration activities'
                        : 'Review progress and metrics for your assigned department'}
                </p>
            </div>

            {!selectedKPI && (
                <FilterBar
                    filters={filters}
                    onChange={setFilters}
                    masterData={masterData}
                    loading={loading}
                />
            )}

            {loading ? (
                <div className="dashboard__loader">
                    <Loader size="large" />
                </div>
            ) : selectedKPI ? (
                <div className="dashboard__detail-view">
                    <div className="dashboard__detail-header">
                        <ActionButton variant="secondary" onClick={() => setSelectedKPI(null)}>
                            <ChevronLeft size={16} /> Back to Dashboard
                        </ActionButton>
                        <h2 className="dashboard__detail-title">Detail: {selectedKPI.title}</h2>
                    </div>

                    <div className="dashboard__table-container">
                        <table className="dashboard__table">
                            <thead>
                                <tr>
                                    <th>Parameter</th>
                                    <th>Partner University</th>
                                    <th>Value</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActivitiesForKPI.length > 0 ? (
                                    filteredActivitiesForKPI.map((activity) => (
                                        <tr key={activity.activity_id}>
                                            <td>{masterData.parameters.find(p => p.parameter_id === activity.parameter_id)?.parameter_name || 'N/A'}</td>
                                            <td>{masterData.universities.find(u => u.university_id === activity.university_id)?.university_name || 'N/A'}</td>
                                            <td>{activity.numeric_value}</td>
                                            <td>
                                                <span className={`status-badge status-badge--${activity.status.toLowerCase()}`}>
                                                    {activity.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="dashboard__table-empty">No records found for this metric</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="dashboard__kpis">
                    <KPIWidget
                        title="Total MOUs"
                        value={kpis.totalMOUs}
                        icon={<FileText size={20} />}
                        color="#16a34a"
                        onClick={() => setSelectedKPI({ id: 1, title: 'Total MOUs' })}
                    />
                    <KPIWidget
                        title="Total Approved"
                        value={kpis.totalApproved}
                        icon={<Activity size={20} />}
                        color="#2563eb"
                        onClick={() => setSelectedKPI({ id: 'APPROVED', title: 'Total Approved Overview' })}
                    />
                    <KPIWidget
                        title="Total Publication"
                        value={kpis.totalPublications}
                        icon={<BookOpen size={20} />}
                        color="#7c3aed"
                        onClick={() => setSelectedKPI({ id: 2, title: 'Publications' })}
                    />
                    <KPIWidget
                        title="Total Faculty Exchange"
                        value={kpis.facultyExchange}
                        icon={<Users size={20} />}
                        color="#0891b2"
                        onClick={() => setSelectedKPI({ id: 4, title: 'Faculty Exchange' })}
                    />
                    <KPIWidget
                        title="Total Student Exchange"
                        value={kpis.studentExchange}
                        icon={<GraduationCap size={20} />}
                        color="#ea580c"
                        onClick={() => setSelectedKPI({ id: 3, title: 'Student Exchange' })}
                    />
                    <KPIWidget
                        title="Total Conference"
                        value={kpis.totalConference}
                        icon={<Users size={20} />} // Reusing icon for demonstration
                        color="#d97706"
                        onClick={() => setSelectedKPI({ id: 5, title: 'Conferences' })}
                    />
                    <KPIWidget
                        title="Total Joint Research"
                        value={kpis.totalJointResearch}
                        icon={<Activity size={20} />}
                        color="#4f46e5"
                        onClick={() => setSelectedKPI({ id: 6, title: 'Joint Research' })}
                    />
                    <KPIWidget
                        title="Total Rejected"
                        value={kpis.totalRejected}
                        icon={<AlertCircle size={20} />}
                        color="#dc2626"
                        onClick={() => setSelectedKPI({ id: 'REJECTED', title: 'Rejected Activities' })}
                    />
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

export default Dashboard;
