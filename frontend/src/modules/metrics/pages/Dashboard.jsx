import { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    FileText,
    BookOpen,
    GraduationCap,
    Users,
    ChevronLeft,
    AlertCircle
} from 'lucide-react';
import KPIWidget from '../components/KPIWidget';
import FilterBar from '../components/FilterBar';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getCollaborationActivities, getMOUs } from '../services/metricsService';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const mappingId = user?.erp_campus_department_mapping_id;
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(user?.erp_users_type);

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
        university_id: '',
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
    // Resolved parameter IDs from master data (populated after masterData loads)
    const [paramIds, setParamIds] = useState({});

    // Resolve parameter IDs once masterData is available
    useEffect(() => {
        if (!masterData.parameters?.length) return;
        const find = (keyword) =>
            masterData.parameters.find(p =>
                p.parameter_name?.toLowerCase().includes(keyword.toLowerCase())
            )?.parameter_id ?? null;
        setParamIds({
            studentExchange: find('Student Exchange'),
            facultyExchange: find('Faculty Exchange'),
            conference:      find('Conference'),
            publications:    find('Joint Publication'),
        });
    }, [masterData.parameters]);

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = {
                ...filters,
                // Admins see all departments; non-admins are restricted to their mapping
                ...(!isAdmin && mappingId ? { erp_campus_department_mapping_id: mappingId } : {}),
            };

            // Fetch activities and MOUs in parallel
            const [data, mous] = await Promise.all([
                getCollaborationActivities(queryParams),
                getMOUs().catch(() => []),
            ]);

            setActivities(data);
            computeKPIs(data, mous);
        } catch (error) {
            setNotification({ message: 'Failed to fetch activities', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filters, mappingId, isAdmin, paramIds]);

    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    const computeKPIs = (data, mous = []) => {
        // Only count APPROVED activities
        const approved = data.filter(a => a.status === 'APPROVED');
        const rejected = data.filter(a => a.status === 'REJECTED');

        // Helper: count approved records for a given parameter_id
        const countByParam = (pid) =>
            pid != null ? approved.filter(a => a.parameter_id === pid).length : 0;

        // Publications: sum numeric_value of all approved Joint Publication records
        const pubRecords = paramIds.publications != null
            ? approved.filter(a => a.parameter_id === paramIds.publications)
            : [];
        const totalPublications = pubRecords.reduce((sum, a) => sum + (Number(a.numeric_value) || 0), 0)
            || pubRecords.length;

        setKpis({
            totalMOUs:        mous.length,
            totalApproved:    approved.length,
            totalPublications,
            facultyExchange:  countByParam(paramIds.facultyExchange),
            studentExchange:  countByParam(paramIds.studentExchange),
            totalConference:  countByParam(paramIds.conference),
            totalJointResearch: pubRecords.length,   // count of joint publication records
            totalRejected:    rejected.length,
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
                        onClick={() => setSelectedKPI({ id: 'MOUS', title: 'Total MOUs' })}
                    />
                    <KPIWidget
                        title="Total Approved"
                        value={kpis.totalApproved}
                        icon={<Activity size={20} />}
                        color="#2563eb"
                        onClick={() => setSelectedKPI({ id: 'APPROVED', title: 'All Approved Activities' })}
                    />
                    <KPIWidget
                        title="Total Publication"
                        value={kpis.totalPublications}
                        icon={<BookOpen size={20} />}
                        color="#7c3aed"
                        onClick={() => setSelectedKPI({ id: paramIds.publications, title: 'Joint Publications' })}
                    />
                    <KPIWidget
                        title="Total Faculty Exchange"
                        value={kpis.facultyExchange}
                        icon={<Users size={20} />}
                        color="#0891b2"
                        onClick={() => setSelectedKPI({ id: paramIds.facultyExchange, title: 'Faculty Exchange' })}
                    />
                    <KPIWidget
                        title="Total Student Exchange"
                        value={kpis.studentExchange}
                        icon={<GraduationCap size={20} />}
                        color="#ea580c"
                        onClick={() => setSelectedKPI({ id: paramIds.studentExchange, title: 'Student Exchange Programs' })}
                    />
                    <KPIWidget
                        title="Total Conference"
                        value={kpis.totalConference}
                        icon={<Users size={20} />}
                        color="#d97706"
                        onClick={() => setSelectedKPI({ id: paramIds.conference, title: 'Conferences' })}
                    />
                    <KPIWidget
                        title="Total Joint Research"
                        value={kpis.totalJointResearch}
                        icon={<Activity size={20} />}
                        color="#4f46e5"
                        onClick={() => setSelectedKPI({ id: paramIds.publications, title: 'Joint Research Records' })}
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
