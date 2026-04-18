import { memo, useEffect } from 'react';
import {
    X, User, Building2, MapPin, BookOpen, Globe,
    Calendar, CheckCircle, Clock, Shield, FileText,
    Download, AlertCircle,
} from 'lucide-react';
import { docKey } from '../config/parameterConfigs';
import './ActivityDetailsPopup.css';

// ─── Role constants ───────────────────────────────────────────────────────────

const ADMIN_ROLES = ['OIA_ADMIN', 'SUPER_ADMIN'];
const HOD_ROLES = ['HOD', 'COORDINATOR'];
const ELEVATED = [...HOD_ROLES, ...ADMIN_ROLES];

// ─── Small atoms ─────────────────────────────────────────────────────────────

const Field = ({ label, value, icon: Icon }) => (
    <div className="adp-field">
        <span className="adp-field__label">
            {Icon && <Icon size={12} className="adp-field__icon" />}
            {label}
        </span>
        <span className="adp-field__value">
            {value !== null && value !== undefined && value !== '' ? String(value) : '—'}
        </span>
    </div>
);

const Section = ({ title, icon: Icon, children, accent }) => (
    <div className={`adp-section adp-section--${accent ?? 'default'}`}>
        <div className={`adp-section__title adp-section__title--${accent ?? 'default'}`}>
            {Icon && <Icon size={14} />}
            <span>{title}</span>
        </div>
        <div className="adp-section__body">{children}</div>
    </div>
);

// ─── Document row ─────────────────────────────────────────────────────────────

const DocItem = ({ label, paths, onViewDoc, activityId, rowIndex, dk }) => {
    const hasPaths = Array.isArray(paths) && paths.length > 0;
    if (!hasPaths) {
        return (
            <div className="adp-doc-item adp-doc-item--empty">
                <FileText size={13} className="adp-doc-item__icon" />
                <span className="adp-doc-item__label">{label}</span>
                <span className="adp-doc-item__none">No file uploaded</span>
            </div>
        );
    }

    // Render one button per uploaded file
    return (
        <div className="adp-doc-item">
            <FileText size={13} className="adp-doc-item__icon" />
            <span className="adp-doc-item__label">{label}</span>
            <div className="adp-doc-item__actions">
                {paths.map((p, fi) => (
                    <button
                        key={fi}
                        type="button"
                        onClick={() => onViewDoc(activityId, rowIndex, dk, fi)}
                        className="adp-doc-btn"
                        title={p.split('/').pop() || `File ${fi + 1}`}
                    >
                        <Download size={11} style={{ marginRight: 4 }} />
                        {paths.length > 1 ? `File ${fi + 1}` : 'Download'}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─── Activity rows (fully dynamic) ───────────────────────────────────────────

const ActivityRows = ({ activity, config, universities, onViewDoc }) => {
    const rows = activity.activity_data?.rows ?? [];

    const getUniNames = (ids) =>
        (Array.isArray(ids) ? ids : [])
            .map(
                (id) =>
                    universities.find((u) => String(u.university_id) === String(id))
                        ?.university_name ?? `University #${id}`
            )
            .join(', ') || '—';

    const allFields = config?.fields ?? [];
    const docSlots = config?.documents ?? [];

    if (rows.length === 0) {
        return (
            <div className="adp-empty">
                <AlertCircle size={16} />
                <span>No entry data available.</span>
            </div>
        );
    }

    return (
        <div className="adp-rows">
            {rows.map((row, ri) => {
                const fieldItems = allFields.map((f) => {
                    let value;
                    if (f.id === 'partner_universities') value = getUniNames(row.partner_universities);
                    else if (f.id === 'start_date') value = row.start_date || null;
                    else if (f.id === 'end_date') value = row.end_date || null;
                    else value = row.fields?.[f.id];
                    return { field: f, value };
                });

                const existingDocs = row.existingDocuments ?? row.documents ?? {};

                return (
                    <div key={ri} className="adp-row-card">
                        <div className="adp-row-card__label">Entry {ri + 1}</div>

                        {fieldItems.map(({ field, value }) => {
                            const iconMap = {
                                partner_universities: Globe,
                                start_date: Calendar,
                                end_date: Calendar,
                                country: MapPin,
                            };
                            return (
                                <Field
                                    key={field.id}
                                    label={field.label}
                                    value={value}
                                    icon={iconMap[field.id] ?? null}
                                />
                            );
                        })}

                        {/* Extra fields not in config */}
                        {Object.entries(row.fields ?? {}).map(([key, val]) => {
                            if (allFields.some((f) => f.id === key)) return null;
                            return (
                                <Field key={`extra-${key}`} label={key.replace(/_/g, ' ')} value={val} />
                            );
                        })}

                        {/* Document slots */}
                        {docSlots.length > 0 && (
                            <div className="adp-row-docs">
                                <div className="adp-row-docs__label">Documents</div>
                                {docSlots.map((slot) => {
                                    const dk = docKey(slot);
                                    const paths = existingDocs[dk];
                                    return (
                                        <DocItem
                                            key={slot}
                                            label={slot}
                                            paths={paths}
                                            onViewDoc={onViewDoc}
                                            activityId={activity.activity_id}
                                            rowIndex={ri}
                                            dk={dk}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ─── Main popup ───────────────────────────────────────────────────────────────

const ActivityDetailsPopup = memo(({
    activity,
    config,
    userRole,
    masterData,
    onClose,
    onViewDoc,
}) => {
    // Lock background scroll while popup is open, restore on unmount
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    if (!activity) return null;

    const { universities = [], campuses = [], departments = [], mappings = [] } = masterData;

    const isAdmin = ADMIN_ROLES.includes(userRole);
    const elevated = ELEVATED.includes(userRole);

    const mapping = mappings.find(
        (m) => String(m.erp_campus_department_mapping_id) === String(activity.erp_campus_department_mapping_id)
    );
    const campus = campuses.find((c) => c.erp_campus_id === mapping?.campus_id);
    const department = departments.find((d) => d.erp_department_id === mapping?.dept_id);

    const approvedById = activity.approved_user_id;
    const approvedAt = activity.approved_time
        ? new Date(activity.approved_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : null;

    const approverLabel = (() => {
        if (!approvedById) return null;
        return userRole === 'FACULTY' ? 'Approved by Admin' : `User #${approvedById}`;
    })();

    const statusCls = (activity.status ?? 'DRAFT').toLowerCase().replace(/_/g, '-');
    const statusLabel = (activity.status ?? 'DRAFT').replace(/_/g, ' ');

    return (
        <div className="adp-overlay" onClick={onClose}>
            <div
                className="adp-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Activity Details"
            >
                {/* Sticky header */}
                <div className="adp-header">
                    <div className="adp-header__info">
                        <h2 className="adp-title">
                            {activity.activity_title || '(Untitled Activity)'}
                        </h2>
                        <div className="adp-header__meta">
                            <span className={`adp-badge adp-badge--${statusCls}`}>{statusLabel}</span>
                            <span className="adp-header__id">Activity #{activity.activity_id}</span>
                        </div>
                    </div>
                    <button className="adp-close" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div
                    className="adp-body"
                    style={{ overflowY: 'scroll', maxHeight: 'calc(85vh - 100px)', display: 'block' }}
                >
                    {/* Basic Info */}
                    <Section title="Basic Information" icon={User} accent="blue">
                        <Field label="Faculty ID" value={`#${activity.created_user_id ?? '—'}`} icon={User} />
                        {elevated && (
                            <>
                                <Field label="Department" value={department?.department_name ?? (mapping?.dept_id ? `Dept #${mapping.dept_id}` : null)} icon={BookOpen} />
                                <Field label="Campus" value={campus?.campus_name ?? (mapping?.campus_id ? `Campus #${mapping.campus_id}` : null)} icon={MapPin} />
                            </>
                        )}
                        <Field label="Academic Year" value={activity.erp_academic_year_id ? `Year #${activity.erp_academic_year_id}` : null} icon={Calendar} />
                        <Field label="Parameter" value={`#${activity.parameter_id}`} icon={BookOpen} />
                    </Section>

                    {/* Activity Details */}
                    <Section title="Activity Details" icon={Globe} accent="indigo">
                        <ActivityRows activity={activity} config={config} universities={universities} onViewDoc={onViewDoc} />
                    </Section>

                    {/* Approval Info */}
                    {(activity.status === 'APPROVED' || approvedById) && (
                        <Section title="Approval Information" icon={CheckCircle} accent="green">
                            <Field label="Approved By" value={approverLabel} icon={Shield} />
                            <Field label="Approval Date" value={approvedAt} icon={Clock} />
                            {isAdmin && (
                                <Field label="Approval Campus" value={campus?.campus_name ?? (mapping?.campus_id ? `Campus #${mapping.campus_id}` : null)} icon={Building2} />
                            )}
                        </Section>
                    )}

                    {/* Rejection / Clarification Remarks */}
                    {activity.rejection_remarks && (
                        <Section
                            title={activity.status === 'CLARIFICATION_REQUESTED' ? 'Clarification Requested' : 'Rejection Remarks'}
                            icon={AlertCircle}
                            accent="red"
                        >
                            <p className="adp-remarks">
                                {activity.rejection_remarks.split('|||').pop().trim()}
                            </p>
                        </Section>
                    )}
                </div>
            </div>
        </div>
    );
});

ActivityDetailsPopup.displayName = 'ActivityDetailsPopup';
export default ActivityDetailsPopup;
