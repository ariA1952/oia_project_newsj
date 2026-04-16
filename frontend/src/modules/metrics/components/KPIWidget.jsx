import { ChevronRight } from 'lucide-react';
import './KPIWidget.css';

const KPIWidget = ({ title, value, icon, color = '#2563eb', onClick, subtitle }) => {
    return (
        <div
            className={`kpi-widget ${onClick ? 'kpi-widget--clickable' : ''}`}
            style={{ '--kpi-accent': color }}
            onClick={onClick}
        >
            <div className="kpi-widget__header">
                <span className="kpi-widget__icon">{icon}</span>
                {onClick && (
                    <span className="kpi-widget__chevron">
                        <ChevronRight size={16} />
                    </span>
                )}
            </div>
            <div className="kpi-widget__body">
                <span className="kpi-widget__value">{value}</span>
                <span className="kpi-widget__title">{title}</span>
                {subtitle && (
                    <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{subtitle}</span>
                )}
            </div>
        </div>
    );
};

export default KPIWidget;

