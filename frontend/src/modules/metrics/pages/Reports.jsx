import { useState, useEffect } from 'react';
import FilterBar from '../components/FilterBar';
import HeatMap from '../components/HeatMap';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import { getCollaborationActivities } from '../services/metricsService';
import './Reports.css';

const Reports = () => {
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
    const [reportData, setReportData] = useState({
        parameterTotals: [],
        departmentComparison: [],
        heatmapData: [],
    });

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
            generateReportData(data);
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
                const deptId = activity.erp_campus_department_mapping_id; // Simplified
                if (!acc[deptId]) {
                    acc[deptId] = {
                        department_id: deptId,
                        department_name: getDepartmentName(deptId),
                        total: 0,
                        count: 0,
                    };
                }
                acc[deptId].total += activity.numeric_value || 0;
                acc[deptId].count += 1;
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

    const getDepartmentName = (deptId) => {
        const dept = masterData.departments.find((d) => d.erp_department_id === deptId);
        return dept?.department_name || `Department ${deptId}`;
    };

    const handleDownloadExcel = () => {
        // Basic CSV export (in production, use a library like xlsx)
        const csvContent = generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `metrics_report_${new Date().toISOString().split('T')[0]}.csv`;
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
        csv += '\n\nDepartment,Total,Count\n';
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
                <h1 className="reports__title">Reports</h1>
                <p className="reports__subtitle">
                    Visualize and export collaboration activity metrics
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
                            📥 Download Excel
                        </ActionButton>
                        <ActionButton variant="secondary" onClick={fetchActivities}>
                            🔄 Generate
                        </ActionButton>
                    </div>

                    {/* Parameter-wise Totals */}
                    <div className="reports__section">
                        <h3 className="reports__section-title">Parameter-wise Totals</h3>
                        <div className="reports__table-container">
                            <table className="reports__table">
                                <thead>
                                    <tr>
                                        <th>Parameter</th>
                                        <th>Total Value</th>
                                        <th>Activity Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.parameterTotals.map((item) => (
                                        <tr key={item.parameter_id}>
                                            <td>{item.parameter_name}</td>
                                            <td>{item.total.toFixed(2)}</td>
                                            <td>{item.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Department Comparison */}
                    <div className="reports__section">
                        <h3 className="reports__section-title">Department Comparison</h3>
                        <div className="reports__table-container">
                            <table className="reports__table">
                                <thead>
                                    <tr>
                                        <th>Department</th>
                                        <th>Total Value</th>
                                        <th>Activity Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.departmentComparison.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.department_name}</td>
                                            <td>{item.total.toFixed(2)}</td>
                                            <td>{item.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Heatmap */}
                    <div className="reports__section">
                        <h3 className="reports__section-title">Activity Heatmap</h3>
                        <HeatMap
                            data={reportData.heatmapData}
                            parameters={masterData.parameters}
                            departments={masterData.departments}
                        />
                    </div>
                </>
            ) : (
                <div className="reports__empty">
                    <p>No data available. Please select filters and click Generate.</p>
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
