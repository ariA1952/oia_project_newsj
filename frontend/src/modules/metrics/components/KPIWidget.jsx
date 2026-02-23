import './KPIWidget.css';

const KPIWidget = ({ title, value, icon, color = '#2563eb', onClick }) => {
    return (
        <div
            className={`kpi-widget ${onClick ? 'kpi-widget--clickable' : ''}`}
            style={{ borderTopColor: color }}
            onClick={onClick}
        >
            <div className="kpi-widget__header">
                {icon && <span className="kpi-widget__icon">{icon}</span>}
                <h3 className="kpi-widget__title">{title}</h3>
            </div>
            <div className="kpi-widget__value">{value}</div>
            {onClick && <div className="kpi-widget__footer">Click to view details →</div>}
        </div>
    );
};

export default KPIWidget;
