import { useState, useEffect, useCallback } from 'react';
import FilterBar from '../components/FilterBar';
import HeatMap from '../components/HeatMap';
import DepartmentPieChart from '../components/DepartmentPieChart';
import ParameterBarChart from '../components/ParameterBarChart';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getCollaborationActivities } from '../services/metricsService';
import './Reports.css';

const Reports = () => {
    const { user } = useAuth();
    const mappingId = user?.erp_campus_department_mapping_id;
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(user?.erp_users_type);

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
        parameter_id: '',
        university_id: '',
        status: 'APPROVED',
    });

    // All activities (no status filter) — used for bar chart counts
    const [allActivities, setAllActivities] = useState([]);
    // Status-filtered activities — used for tables/charts below
    const [activities, setActivities] = useState([]);

    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [reportData, setReportData] = useState({
        parameterTotals: [],
        departmentComparison: [],
        heatmapData: [],
        pieChartData: [],
    });
    const [pieChartTitle, setPieChartTitle] = useState('');

    // ── Helpers ────────────────────────────────────────────────────────────────

    const getParameterName = (paramId) => {
        const param = masterData.parameters.find((p) => p.parameter_id === paramId);
        return param?.parameter_name || `Parameter ${paramId}`;
    };

    const getDepartmentNameByMapping = (mapId) => {
        const mapping = masterData.mappings?.find(
            (m) => m.erp_campus_department_mapping_id === mapId
        );
        if (!mapping) return `Dept (ID: ${mapId})`;
        const dept   = masterData.departments?.find((d) => d.erp_department_id === mapping.dept_id);
        const campus = masterData.campuses?.find((c) => c.erp_campus_id === mapping.campus_id);
        return `${dept?.department_name || `Dept ${mapping.dept_id}`} (${campus?.campus_name || `Campus ${mapping.campus_id}`})`;
    };

    // ── Data fetch ─────────────────────────────────────────────────────────────

    const fetchActivities = useCallback(async () => {
        setLoading(true);
        try {
            const base = {
                academic_year_id: filters.academic_year_id || undefined,
                quarter_id:       filters.quarter_id       || undefined,
                campus_id:        filters.campus_id        || undefined,
                department_id:    filters.department_id    || undefined,
                parameter_id:     filters.parameter_id     || undefined,
                university_id:    filters.university_id    || undefined,
                // Non-admins always scoped to their mapping
                ...(!isAdmin && mappingId ? { erp_campus_department_mapping_id: mappingId } : {}),
            };

            // Fetch all statuses for the bar chart
            const all = await getCollaborationActivities(base);
            setAllActivities(all);

            // Filtered by status for the detail charts/tables
            const statusFiltered = filters.status
                ? all.filter((a) => a.status === filters.status)
                : all;
            setActivities(statusFiltered);
            generateReportData(statusFiltered);
        } catch {
            setNotification({ message: 'Failed to fetch activities', type: 'error' });
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, mappingId, isAdmin]);

    // ── Always fetch — even with no filters (bar chart shows all-campus totals) ──
    useEffect(() => { fetchActivities(); }, [fetchActivities]);

    // ── Report data builder ────────────────────────────────────────────────────

    const generateReportData = (data) => {
        const parameterTotals = Object.values(
            data.reduce((acc, activity) => {
                const paramId = activity.parameter_id;
                if (!acc[paramId]) acc[paramId] = { parameter_id: paramId, parameter_name: getParameterName(paramId), total: 0, count: 0 };
                acc[paramId].total += activity.numeric_value || 0;
                acc[paramId].count += 1;
                return acc;
            }, {})
        );

        const departmentComparison = Object.values(
            data.reduce((acc, activity) => {
                const mapId = activity.erp_campus_department_mapping_id;
                if (!acc[mapId]) acc[mapId] = { mapping_id: mapId, department_name: getDepartmentNameByMapping(mapId), total: 0, count: 0 };
                acc[mapId].total += activity.numeric_value || 0;
                acc[mapId].count += 1;
                return acc;
            }, {})
        );

        const heatmapData = data.map((a) => ({
            parameter_id: a.parameter_id,
            department_id: a.erp_campus_department_mapping_id,
            value: a.numeric_value || 0,
        }));

        const pieChartData = Object.values(
            data.reduce((acc, activity) => {
                const paramId   = activity.parameter_id;
                const paramName = getParameterName(paramId);
                if (!acc[paramId]) acc[paramId] = { name: paramName, count: 0, total: 0 };
                acc[paramId].count += 1;
                acc[paramId].total += activity.numeric_value || 0;
                return acc;
            }, {})
        ).filter((item) => item.count > 0);

        let title = '';
        if (filters.department_id) {
            const dept = masterData.departments?.find((d) => String(d.erp_department_id) === String(filters.department_id));
            title = dept?.department_name || 'Selected Department';
        } else if (filters.campus_id) {
            const campus = masterData.campuses?.find((c) => String(c.erp_campus_id) === String(filters.campus_id));
            title = campus?.campus_name || 'Selected Campus';
        } else {
            title = 'All Campuses';
        }
        setPieChartTitle(title);
        setReportData({ parameterTotals, departmentComparison, heatmapData, pieChartData });
    };

    // ── Extra filters beyond academic year ─────────────────────────────────────
    const hasExtraFilters = !!(
        filters.academic_year_id ||
        filters.quarter_id       ||
        filters.campus_id        ||
        filters.department_id    ||
        filters.parameter_id     ||
        filters.university_id
    );

    const academicYearLabel = filters.academic_year_id
        ? masterData.academicYears?.find(
              (y) => String(y.erp_academic_year_id) === String(filters.academic_year_id)
          )?.academic_year_name ?? null
        : null;

    // ── Download ───────────────────────────────────────────────────────────────

    const handleDownloadExcel = () => {
        let csv = 'Parameter,Total,Count\n';
        reportData.parameterTotals.forEach((item) => {
            csv += `"${item.parameter_name}",${item.total},${item.count}\n`;
        });
        csv += '\n\nDepartment Mapping,Total,Count\n';
        reportData.departmentComparison.forEach((item) => {
            csv += `"${item.department_name}",${item.total},${item.count}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = `oia_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        setNotification({ message: 'Report downloaded successfully', type: 'success' });
    };

    if (masterDataLoading) return <Loader fullscreen />;

    return (
        <div className="reports">
            {/* Header */}
            <div className="reports__header">
                <h1 className="reports__title">
                    {isAdmin ? 'OIA Analytics' : 'Departmental Activity Analytics'}
                </h1>
                <p className="reports__subtitle">
                    {isAdmin
                        ? 'Internationalisation activity breakdown across all campuses'
                        : 'Review and export activity data for your department'}
                </p>
            </div>

            {/* Filter bar */}
            <FilterBar
                filters={filters}
                onChange={setFilters}
                masterData={masterData}
                loading={loading}
            />

            {loading ? (
                <div className="reports__loader"><Loader size="large" /></div>
            ) : (
                <>
                    {/* ── Bar chart — always visible, showing all-campus totals ── */}
                    <ParameterBarChart
                        activities={allActivities}
                        parameters={masterData.parameters}
                        filtersApplied={hasExtraFilters}
                        academicYearLabel={academicYearLabel}
                    />

                    {/* ── Detail sections — only after filters applied ── */}
                    {hasExtraFilters && activities.length > 0 && (
                        <>
                            <div className="reports__actions">
                                <ActionButton variant="primary"   onClick={handleDownloadExcel}>📥 Download CSV</ActionButton>
                                <ActionButton variant="secondary" onClick={fetchActivities}>🔄 Refresh</ActionButton>
                                <span className="reports__status-info">
                                    Status: <strong style={{ color: 'var(--primary)' }}>{filters.status}</strong>
                                </span>
                            </div>

                            {/* Parameter performance table */}
                            <div className="reports__section">
                                <h3 className="reports__section-title">Parameter Performance</h3>
                                <div className="reports__table-container">
                                    <table className="reports__table">
                                        <thead><tr><th>Parameter</th><th>Cumulative Total</th><th>Total Entries</th></tr></thead>
                                        <tbody>
                                            {reportData.parameterTotals.map((item) => (
                                                <tr key={item.parameter_id}>
                                                    <td>{item.parameter_name}</td>
                                                    <td>{item.total.toLocaleString()}</td>
                                                    <td>{item.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Department comparison — admin only */}
                            {isAdmin && (
                                <div className="reports__section">
                                    <h3 className="reports__section-title">Department Comparison</h3>
                                    <div className="reports__table-container">
                                        <table className="reports__table">
                                            <thead><tr><th>Department/Mapping</th><th>Total Value</th><th>Activity Count</th></tr></thead>
                                            <tbody>
                                                {reportData.departmentComparison.map((item, i) => (
                                                    <tr key={i}>
                                                        <td>{item.department_name}</td>
                                                        <td>{item.total.toLocaleString()}</td>
                                                        <td>{item.count}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Pie chart */}
                            <div className="reports__section">
                                <h3 className="reports__section-title">Parameter Distribution</h3>
                                <DepartmentPieChart data={reportData.pieChartData} title={pieChartTitle} />
                            </div>

                            {/* Heat map */}
                            <div className="reports__section">
                                <h3 className="reports__section-title">Activity Distribution (Heatmap)</h3>
                                <HeatMap
                                    data={reportData.heatmapData}
                                    parameters={masterData.parameters}
                                    departments={masterData.departments}
                                />
                            </div>
                        </>
                    )}

                    {/* Hint when no filters applied */}
                    {!hasExtraFilters && (
                        <div className="reports__hint">
                            <span className="reports__hint-icon">🔍</span>
                            <span>Apply filters above to see detailed tables, department comparison, and distribution charts.</span>
                        </div>
                    )}
                </>
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

export default Reports;
