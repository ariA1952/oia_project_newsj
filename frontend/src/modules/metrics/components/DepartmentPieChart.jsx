import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import './DepartmentPieChart.css';

const COLORS = [
    '#2d3a8c', // deep indigo
    '#3b82f6', // blue
    '#a78bfa', // violet
    '#f87171', // red-pink
    '#fb923c', // orange
    '#34d399', // emerald
    '#f472b6', // pink
    '#60a5fa', // light blue
    '#facc15', // yellow
    '#4ade80', // green
];

const RADIAN = Math.PI / 180;

const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
}) => {
    if (percent < 0.04) return null; // Skip tiny slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={12}
            fontWeight={600}
        >
            {`${(percent * 100).toFixed(1)}%`}
        </text>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const { name, value, payload: data } = payload[0];
        const total = data.total;
        return (
            <div className="dept-pie__tooltip">
                <p className="dept-pie__tooltip-name">{name}</p>
                <p className="dept-pie__tooltip-value">
                    Count: <strong>{value}</strong>
                </p>
                {total !== undefined && (
                    <p className="dept-pie__tooltip-value">
                        Total Value: <strong>{total.toLocaleString()}</strong>
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const DepartmentPieChart = ({ data = [], title = '' }) => {
    if (!data || data.length === 0) {
        return (
            <div className="dept-pie__empty">
                <p>No data available for the pie chart.</p>
            </div>
        );
    }

    return (
        <div className="dept-pie">
            {title && <h2 className="dept-pie__title">{title}</h2>}
            <ResponsiveContainer width="100%" height={420}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        outerRadius={170}
                        dataKey="count"
                        nameKey="name"
                        labelLine={false}
                        label={renderCustomLabel}
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {data.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="rgba(255,255,255,0.15)"
                                strokeWidth={2}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        formatter={(value) => (
                            <span className="dept-pie__legend-label">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DepartmentPieChart;
