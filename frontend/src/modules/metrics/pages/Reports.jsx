import { useState, useEffect } from 'react';
import FilterBar from '../components/FilterBar';
import HeatMap from '../components/HeatMap';
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
    const isAdmin = user?.erp_users_type === 'OIA_ADMIN';

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [filters, setFilters] = useState({
        academic_year_id: '',
        quarter_id: '',
        campus_id: '',
        department_id: '',
        status: 'APPROVED' // Default to approved for official reports
    });
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [reportData, setReportData] = useState({
        parameterTotals: [],
        departmentComparison: [],
        heatmapData: [],
    });

    useEffect(() => {
        if (filters.academic_year_id && filters.quarter_id) {
            fetchActivities();
        }
    }, [filters, mappingId]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const queryParams = {
                ...filters,
                erp_campus_department_mapping_id: mappingId || undefined,
            };
            const data = await getCollaborationActivities(queryParams);

            // Filter by selected status (default APPROVED)
            const filteredData = filters.status
                ? data.filter(a => a.status === filters.status)
                : data;

            setActivities(filteredData);
            generateReportData(filteredData);
        } catch (error) {
            setNotification({
                message: 'Failed to fetch activities',
                type: 'error',
            });
        } finally {
            setLoading(false);
        }
    };

    const generateReportData = (data) => {
        // Parameter-wise totals
        const parameterTotals = Object.values(
            data.reduce((acc, activity) => {
                const paramId = activity.parameter_id;
                if (!acc[paramId]) {
                    acc[paramId] = {
                        parameter_id: paramId,
                        parameter_name: getParameterName(paramId),
                        total: 0,
                        count: 0,
                    };
                }
                acc[paramId].total += activity.numeric_value || 0;
                acc[paramId].count += 1;
                return acc;
            }, {})
        );

        // Department comparison
        const departmentComparison = Object.values(
            data.reduce((acc, activity) => {
                const mapId = activity.erp_campus_department_mapping_id;
                if (!acc[mapId]) {
                    acc[mapId] = {
                        mapping_id: mapId,
                        department_name: getDepartmentNameByMapping(mapId),
                        total: 0,
                        count: 0,
                    };
                }
                acc[mapId].total += activity.numeric_value || 0;
                acc[mapId].count += 1;
                return acc;
            }, {})
        );

        // Heatmap data
        const heatmapData = data.map((activity) => ({
            parameter_id: activity.parameter_id,
            department_id: activity.erp_campus_department_mapping_id,
            value: activity.numeric_value || 0,
        }));

        setReportData({
            parameterTotals,
            departmentComparison,
            heatmapData,
        });
    };

    const getParameterName = (paramId) => {
        const param = masterData.parameters.find((p) => p.parameter_id === paramId);
        return param?.parameter_name || `Parameter ${paramId}`;
    };

    const getDepartmentNameByMapping = (mapId) => {
        // If the mapping exists in masterData, we can resolve it.
        // For now, if masterData only has departments, we might need to show the ID or 
        // find the department linked to this mapping.
        // Assuming masterData has a way to resolve mappings to readable names.
        return `Department (ID: ${mapId})`;
    };

    const handleDownloadExcel = () => {
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `oia_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        setNotification({
            message: 'Report downloaded successfully',
            type: 'success',
        });
    };

    const generateCSV = () => {
        let csv = 'Parameter,Total,Count\n';
        reportData.parameterTotals.forEach((item) => {
            csv += `"${item.parameter_name}",${item.total},${item.count}\n`;
        });
        csv += '\n\nDepartment Mapping,Total,Count\n';
        reportData.departmentComparison.forEach((item) => {
            csv += `"${item.department_name}",${item.total},${item.count}\n`;
        });
        return csv;
    };

    if (masterDataLoading) {
        return <Loader fullscreen />;
    }

    return (
        <div className="reports">
            <div className="reports__header">
                <h1 className="reports__title">
                    {isAdmin ? 'OIA Strategic Reports' : 'Departmental Activity Report'}
                </h1>
                <p className="reports__subtitle">
                    {isAdmin
                        ? 'Generate institutional reports on collaboration and research metrics'
                        : 'Review and export activity data for your department'}
                </p>
            </div>

            <FilterBar
                filters={filters}
                onChange={setFilters}
                masterData={masterData}
                loading={loading}
            />

            {loading ? (
                <div className="reports__loader">
                    <Loader size="large" />
                </div>
            ) : activities.length > 0 ? (
                <>
                    <div className="reports__actions">
                        <ActionButton variant="primary" onClick={handleDownloadExcel}>
                            📥 Download CSV
                        </ActionButton>
                        <ActionButton variant="secondary" onClick={fetchActivities}>
                            🔄 Refresh Data
                        </ActionButton>
                        <span className="reports__status-info">
                            Status: <strong style={{ color: 'var(--primary)' }}>{filters.status}</strong>
                        </span>
                    </div>

                    <div className="reports__section">
                        <h3 className="reports__section-title">Parameter Performance</h3>
                        <div className="reports__table-container">
                            <table className="reports__table">
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Cumulative Total</th>
                                        <th>Total Entries</th>
                                    </tr>
                                </thead>
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

                    {isAdmin && (
                        <div className="reports__section">
                            <h3 className="reports__section-title">Department Comparison</h3>
                            <div className="reports__table-container">
                                <table className="reports__table">
                                    <thead>
                                        <tr>
                                            <th>Department/Mapping</th>
                                            <th>Total Value</th>
                                            <th>Activity Count</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.departmentComparison.map((item, index) => (
                                            <tr key={index}>
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

                    <div className="reports__section">
                        <h3 className="reports__section-title">Activity Distribution</h3>
                        <HeatMap
                            data={reportData.heatmapData}
                            parameters={masterData.parameters}
                            departments={masterData.departments}
                        />
                    </div>
                </>
            ) : (
                <div className="reports__empty">
                    <p>No activity found for the selected criteria. Try adjusting the filters or selecting a different status.</p>
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

export default Reports;
