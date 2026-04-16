import { useState, useEffect, useCallback } from 'react';
import {
    Activity, FileText, BookOpen, GraduationCap,
    Users, ChevronLeft, AlertCircle, Globe, Mic,
    MonitorPlay, UserCheck, UserPlus, ArrowUpRight,
    ArrowDownLeft, Briefcase, Layers
} from 'lucide-react';
import KPIWidget from '../components/KPIWidget';
import FilterBar from '../components/FilterBar';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getDashboardSummary, getCollaborationActivities } from '../services/metricsService';
import './Dashboard.css';

// ─── Icon & colour config per parameter code ────────────────────────────────
// Falls back to a default if a parameter code is not listed here.
const PARAM_STYLE = {
    CONF:   { icon: <Users size={20} />,          color: '#d97706' },
    CURR:   { icon: <BookOpen size={20} />,       color: '#7c3aed' },
    SDG:    { icon: <Globe size={20} />,          color: '#059669' },
    PROF:   { icon: <Briefcase size={20} />,      color: '#0369a1' },
    WEB:    { icon: <MonitorPlay size={20} />,    color: '#0891b2' },
    OTC:    { icon: <Mic size={20} />,            color: '#6d28d9' },
    OTF:    { icon: <UserCheck size={20} />,      color: '#b45309' },
    INFAC:  { icon: <ArrowDownLeft size={20} />,  color: '#0f766e' },
    OUTFAC: { icon: <ArrowUpRight size={20} />,   color: '#ea580c' },
    PUB:    { icon: <FileText size={20} />,       color: '#2563eb' },
    RES:    { icon: <Activity size={20} />,       color: '#4f46e5' },
    INSTU:  { icon: <GraduationCap size={20} />,  color: '#16a34a' },
    OUTSTU: { icon: <GraduationCap size={20} />,  color: '#dc2626' },
    EXCH:   { icon: <UserPlus size={20} />,       color: '#9333ea' },
};

const DEFAULT_STYLE = { icon: <Layers size={20} />, color: '#6b7280' };

// Status filter applied in the detail drill-down view
const DASHBOARD_STATUSES = ['APPROVED', 'SUBMITTED', 'CLARIFICATION_REQUESTED'];

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
    const [summaryData, setSummaryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [selectedKPI, setSelectedKPI] = useState(null);
    const [detailActivities, setDetailActivities] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // ── Build param code lookup from master data ────────────────────────
    const paramCodeMap = {};
    if (masterData.parameters?.length) {
        masterData.parameters.forEach((p) => {
            paramCodeMap[p.parameter_id] = p.parameter_code;
        });
    }

    // ── Fetch aggregated dashboard summary from API ─────────────────────
    const fetchSummary = useCallback(async () => {
        setLoading(true);
        try {
            const apiFilters = { ...filters };
            // Remove university_id — dashboard summary doesn't use it
            delete apiFilters.university_id;
            if (!isAdmin && mappingId) {
                apiFilters.erp_campus_department_mapping_id = mappingId;
            }
            const data = await getDashboardSummary(apiFilters);
            setSummaryData(data.parameters || []);
        } catch {
            setNotification({ message: 'Failed to fetch dashboard summary', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [filters, mappingId, isAdmin]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    // ── Detail drill-down: fetch filtered activities for a parameter ────
    const handleKPIClick = async (param) => {
        setSelectedKPI(param);
        setDetailLoading(true);
        try {
            const queryParams = {
                ...filters,
                parameter_id: param.parameter_id,
                ...(!isAdmin && mappingId ? { erp_campus_department_mapping_id: mappingId } : {}),
            };
            const data = await getCollaborationActivities(queryParams);
            // Apply dashboard status filter client-side
            const filtered = data.filter((a) => DASHBOARD_STATUSES.includes(a.status));
            setDetailActivities(filtered);
        } catch {
            setNotification({ message: 'Failed to fetch details', type: 'error' });
            setDetailActivities([]);
        } finally {
            setDetailLoading(false);
        }
    };

    if (masterDataLoading) return <Loader fullscreen />;

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
                <FilterBar filters={filters} onChange={setFilters} masterData={masterData} loading={loading} />
            )}

            {loading ? (
                <div className="dashboard__loader"><Loader size="large" /></div>
            ) : selectedKPI ? (
                <div className="dashboard__detail-view">
                    <div className="dashboard__detail-header">
                        <ActionButton variant="secondary" onClick={() => setSelectedKPI(null)}>
                            <ChevronLeft size={16} /> Back to Dashboard
                        </ActionButton>
                        <h2 className="dashboard__detail-title">Detail: {selectedKPI.parameter_name}</h2>
                    </div>
                    {detailLoading ? (
                        <div className="dashboard__loader"><Loader size="large" /></div>
                    ) : (
                        <div className="dashboard__table-container">
                            <table className="dashboard__table">
                                <thead><tr><th>Parameter</th><th>Partner University</th><th>Value</th><th>Status</th><th>Entered By</th></tr></thead>
                                <tbody>
                                    {detailActivities.length > 0
                                        ? detailActivities.map((activity) => (
                                            <tr key={activity.activity_id}>
                                                <td>{masterData.parameters.find(p => p.parameter_id === activity.parameter_id)?.parameter_name || 'N/A'}</td>
                                                <td>{masterData.universities.find(u => u.university_id === activity.university_id)?.university_name || 'N/A'}</td>
                                                <td>{activity.numeric_value}</td>
                                                <td><span className={`status-badge status-badge--${activity.status.toLowerCase()}`}>{activity.status}</span></td>
                                                <td>{activity.created_user_id ?? '—'}</td>
                                            </tr>
                                        ))
                                        : <tr><td colSpan="5" className="dashboard__table-empty">No records found for this metric</td></tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="dashboard__kpis">
                    {summaryData.map((param) => {
                        const code = paramCodeMap[param.parameter_id] || '';
                        const style = PARAM_STYLE[code] || DEFAULT_STYLE;
                        const contributorCount = param.faculty_ids?.length || 0;
                        const subtitle = contributorCount > 0
                            ? `${contributorCount} contributor${contributorCount > 1 ? 's' : ''}`
                            : null;
                        return (
                            <KPIWidget
                                key={param.parameter_id}
                                title={param.parameter_name}
                                value={param.count}
                                icon={style.icon}
                                color={style.color}
                                subtitle={subtitle}
                                onClick={() => handleKPIClick(param)}
                            />
                        );
                    })}
                </div>
            )}

            {notification && (
                <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
            )}
        </div>
    );
};

export default Dashboard;
