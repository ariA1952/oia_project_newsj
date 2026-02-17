import './HeatMap.css';

const HeatMap = ({ data = [], parameters = [], departments = [] }) => {
    // data format: [{ parameter_id, department_id, value }]

    const getIntensity = (value, max) => {
        if (!value || !max) return 0;
        return Math.min((value / max) * 100, 100);
    };

    const maxValue = Math.max(...data.map((d) => d.value || 0), 1);

    const getCellValue = (paramId, deptId) => {
        const cell = data.find(
            (d) => d.parameter_id === paramId && d.department_id === deptId
        );
        return cell?.value || 0;
    };

    const getColor = (value) => {
        const intensity = getIntensity(value, maxValue);
        if (intensity === 0) return '#f3f4f6';
        if (intensity < 25) return '#dbeafe';
        if (intensity < 50) return '#93c5fd';
        if (intensity < 75) return '#3b82f6';
        return '#1d4ed8';
    };

    return (
        <div className="heatmap">
            <div className="heatmap__container">
                <table className="heatmap__table">
                    <thead>
                        <tr>
                            <th className="heatmap__header">Parameter</th>
                            {departments.map((dept) => (
                                <th key={dept.erp_department_id} className="heatmap__header">
                                    {dept.department_name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.map((param) => (
                            <tr key={param.parameter_id}>
                                <td className="heatmap__label">{param.parameter_name}</td>
                                {departments.map((dept) => {
                                    const value = getCellValue(param.parameter_id, dept.erp_department_id);
                                    return (
                                        <td
                                            key={`${param.parameter_id}-${dept.erp_department_id}`}
                                            className="heatmap__cell"
                                            style={{ backgroundColor: getColor(value) }}
                                        >
                                            {value}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="heatmap__legend">
                <span className="heatmap__legend-label">Low</span>
                <div className="heatmap__legend-gradient"></div>
                <span className="heatmap__legend-label">High</span>
            </div>
        </div>
    );
};

export default HeatMap;
