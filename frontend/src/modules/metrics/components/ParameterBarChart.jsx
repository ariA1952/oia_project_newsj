import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import './ParameterBarChart.css';

const BAR_COLOR = '#2563eb';

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0].payload;
    return (
        <div className="pbc-tooltip">
            <p className="pbc-tooltip__name">{name}</p>
            <p className="pbc-tooltip__value">{value} record{value !== 1 ? 's' : ''}</p>
        </div>
    );
};

const CustomYTick = ({ x, y, payload }) => {
    const words   = String(payload.value).split(' ');
    const lines   = [];
    let current   = '';
    const maxChar = 26;
    words.forEach((w) => {
        if ((current + ' ' + w).trim().length > maxChar) {
            lines.push(current.trim());
            current = w;
        } else {
            current = (current + ' ' + w).trim();
        }
    });
    if (current) lines.push(current.trim());

    const lineH  = 14;
    const totalH = lines.length * lineH;
    return (
        <g transform={`translate(${x},${y})`}>
            {lines.map((line, i) => (
                <text
                    key={i}
                    x={0}
                    y={-(totalH / 2) + i * lineH + lineH / 2}
                    textAnchor="end"
                    fill="#374151"
                    fontSize={12}
                    fontFamily="Inter, system-ui, sans-serif"
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

const ParameterBarChart = ({ activities, parameters, filtersApplied, academicYearLabel }) => {
    const chartData = useMemo(() => {
        return parameters
            .map((param) => ({
                id:    param.parameter_id,
                name:  param.parameter_name,
                value: activities.filter(
                    (a) => a.parameter_id === param.parameter_id && a.status === 'APPROVED'
                ).length,
            }))
            .sort((a, b) => b.value - a.value);
    }, [activities, parameters]);

    const maxVal      = Math.max(...chartData.map((d) => d.value), 1);
    const rowHeight   = 52;
    const chartHeight = Math.max(chartData.length * rowHeight, 300);
    const yAxisWidth  = 210;

    return (
        <div className="pbc-card">
            <div className="pbc-header">
                <div className="pbc-header__left">
                    <h2 className="pbc-title">Areas of Internationalisation</h2>
                    <p className="pbc-subtitle">
                        {filtersApplied
                            ? 'Filtered view — approved activities per parameter'
                            : academicYearLabel
                                ? `Academic Year: ${academicYearLabel} · All Campuses Combined`
                                : 'All campuses combined — apply filters to drill down'}
                    </p>
                </div>
                <div className="pbc-header__badges">
                    <span className="pbc-badge pbc-badge--approved">Approved records</span>
                    {!filtersApplied && (
                        <span className="pbc-badge pbc-badge--hint">Use filters to drill down</span>
                    )}
                </div>
            </div>

            <div className="pbc-chart-wrap" style={{ height: chartHeight + 60 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 8, right: 60, bottom: 32, left: yAxisWidth }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis
                            type="number"
                            domain={[0, maxVal + Math.ceil(maxVal * 0.1) + 1]}
                            tick={{ fontSize: 12, fill: '#6b7280' }}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'Number of Records', position: 'insideBottom', offset: -20, fontSize: 12, fill: '#9ca3af' }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={yAxisWidth}
                            tick={<CustomYTick />}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#eff6ff' }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                            {chartData.map((entry) => (
                                <Cell key={entry.id} fill={entry.value > 0 ? BAR_COLOR : '#e5e7eb'} />
                            ))}
                            <LabelList
                                dataKey="value"
                                position="right"
                                formatter={(v) => (v > 0 ? v : '')}
                                style={{ fontSize: 12, fontWeight: 700, fill: '#2563eb' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="pbc-footer">
                <span className="pbc-footer__dot" style={{ background: BAR_COLOR }} />
                Approved activities per parameter
                {!filtersApplied && (
                    <span className="pbc-footer__tip">
                        · Use the filters above to break down by campus, department, or quarter
                    </span>
                )}
            </div>
        </div>
    );
};

export default ParameterBarChart;
