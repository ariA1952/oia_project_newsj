import { useState, useEffect } from 'react';
import KPIWidget from '../components/KPIWidget';
import FilterBar from '../components/FilterBar';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getCollaborationActivities } from '../services/metricsService';
import './Dashboard.css';

const Dashboard = () => {
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
        totalActivities: 0,
        totalMOUs: 0,
        totalPublications: 0,
        studentMobility: 0,
        facultyMobility: 0,
    });

    useEffect(() => {
        fetchActivities();
    }, [filters]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const data = await getCollaborationActivities(filters);
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
        // Group activities by parameter to compute totals
        // Assuming parameter IDs for: MOUs, Publications, Student Mobility, Faculty Mobility
        // These should match actual parameter_ids from backend

        const parameterGroups = data.reduce((acc, activity) => {
            const paramId = activity.parameter_id;
            if (!acc[paramId]) {
                acc[paramId] = [];
            }
            acc[paramId].push(activity);
            return acc;
        }, {});

        // You'll need to match these IDs to actual parameter_ids from your backend
        // For now, using placeholders - replace with actual parameter codes/IDs
        const mouCount = (parameterGroups[1] || []).reduce((sum, a) => sum + (a.numeric_value || 0), 0);
        const publicationCount = (parameterGroups[2] || []).reduce((sum, a) => sum + (a.numeric_value || 0), 0);
        const studentMobilityCount = (parameterGroups[3] || []).reduce((sum, a) => sum + (a.numeric_value || 0), 0);
        const facultyMobilityCount = (parameterGroups[4] || []).reduce((sum, a) => sum + (a.numeric_value || 0), 0);

        setKpis({
            totalActivities: data.length,
            totalMOUs: mouCount,
            totalPublications: publicationCount,
            studentMobility: studentMobilityCount,
            facultyMobility: facultyMobilityCount,
        });
    };

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <h1 className="dashboard__title">Metrics Dashboard</h1>
                <p className="dashboard__subtitle">
                    Overview of collaboration activities and metrics
                </p>
            </div>

            <FilterBar
                filters={filters}
                onChange={setFilters}
                masterData={masterData}
                loading={loading}
            />

            {loading ? (
                <div className="dashboard__loader">
                    <Loader size="large" />
                </div>
            ) : (
                <div className="dashboard__kpis">
                    <KPIWidget
                        title="Total Activities"
                        value={kpis.totalActivities}
                        //icon="📊"
                        color="#2563eb"
                    />
                    <KPIWidget
                        title="Total MOUs"
                        value={kpis.totalMOUs}
                        //icon="📝"
                        color="#16a34a"
                    />
                    <KPIWidget
                        title="Publications"
                        value={kpis.totalPublications}
                        //icon="📚"
                        color="#7c3aed"
                    />
                    <KPIWidget
                        title="Student Mobility"
                        value={kpis.studentMobility}
                        //icon="🎓"
                        color="#ea580c"
                    />
                    <KPIWidget
                        title="Faculty Mobility"
                        value={kpis.facultyMobility}
                        //icon="👨‍🏫"
                        color="#0891b2"
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
