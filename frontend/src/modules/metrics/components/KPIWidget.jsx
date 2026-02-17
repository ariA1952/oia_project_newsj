import './KPIWidget.css';

const KPIWidget = ({ title, value, icon, color = '#2563eb' }) => {
    return (
        <div className="kpi-widget" style={{ borderTopColor: color }}>
            <div className="kpi-widget__header">
                {icon && <span className="kpi-widget__icon">{icon}</span>}
                <h3 className="kpi-widget__title">{title}</h3>
            </div>
            <div className="kpi-widget__value">{value}</div>
        </div>
    );
};

export default KPIWidget;
