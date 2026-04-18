import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import './ParameterBarChart.css'; // use existing styles

const BAR_COLOR = '#10b981';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const { value } = payload[0];
    return (
        <div className="pbc-tooltip">
            <p className="pbc-tooltip__name">{label}</p>
            <p className="pbc-tooltip__value">{value} record{value !== 1 ? 's' : ''}</p>
        </div>
    );
};

const MonthlyTrendChart = ({ activities }) => {
    const chartData = useMemo(() => {
        const monthCounts = {};
        
        activities.forEach(activity => {
            if (activity.start_date && activity.status === 'APPROVED') {
                const parts = activity.start_date.split('-');
                if (parts.length >= 2) {
                    const year = parts[0];
                    const monthStr = parts[1];
                    const sortKey = `${year}-${monthStr}`;
                    
                    const d = new Date(parseInt(year, 10), parseInt(monthStr, 10) - 1, 1);
                    const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                    
                    if (!monthCounts[sortKey]) {
                        monthCounts[sortKey] = { label: monthName, value: 0 };
                    }
                    monthCounts[sortKey].value += 1;
                }
            }
        });

        // Sort chronologically
        return Object.keys(monthCounts)
            .sort()
            .map(key => ({
                name: monthCounts[key].label,
                value: monthCounts[key].value
            }));
    }, [activities]);

    const maxVal = Math.max(...chartData.map((d) => d.value), 1);
    
    if (chartData.length === 0) {
        return null;
    }

    return (
        <div className="pbc-card" style={{ marginTop: '24px' }}>
            <div className="pbc-header">
                <div className="pbc-header__left">
                    <h2 className="pbc-title">Monthly Trends</h2>
                    <p className="pbc-subtitle">Approved activities grouped by month (based on Start Date)</p>
                </div>
            </div>

            <div className="pbc-chart-wrap" style={{ height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, bottom: 40, left: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12, fill: '#6b7280' }} 
                            axisLine={false} 
                            tickLine={false} 
                            dy={10} 
                        />
                        <YAxis 
                            type="number" 
                            domain={[0, maxVal + Math.ceil(maxVal * 0.1)]}
                            tick={{ fontSize: 12, fill: '#6b7280' }} 
                            axisLine={false} 
                            tickLine={false} 
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                        <Bar dataKey="value" fill={BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={40}>
                            <LabelList
                                dataKey="value"
                                position="top"
                                style={{ fontSize: 12, fontWeight: 600, fill: BAR_COLOR }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MonthlyTrendChart;
