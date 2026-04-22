import { useState, useEffect, useRef } from 'react';
import {
    AlertCircle, HelpCircle, Plus, Trash2, Upload, X,
    FileText, ChevronDown, ShieldOff, Info,
} from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import { downloadActivityDocument, checkDuplicateActivity } from '../services/metricsService';
import SuggestUniversityModal from './SuggestUniversityModal';
import {
    getParamConfig,
    docKey,
    makeEmptyRowForConfig,
    rowsFromActivityData,
    getRowFieldValue,
    setRowFieldValue,
} from '../config/parameterConfigs';
import './ParameterRow.css';

// ─── Fallback config for parameters not yet in the config file ────────────────
const FALLBACK_CONFIG = {
    label: 'General Activity',
    multiRow: true,
    adminOnly: false,
    fields: [
        { id: 'partner_universities', label: 'Partner Universities / Org.', type: 'multi-uni' },
        { id: 'start_date', label: 'Start Date', type: 'date' },
        { id: 'end_date', label: 'End Date', type: 'date' },
        { id: 'remarks', label: 'Remarks / Notes', type: 'textarea' },
    ],
    documents: ['Report', 'Other'],
};

// ─── MultiUniversitySelect ─────────────────────────────────────────────────────

const MultiUniversitySelect = ({ value = [], onChange, universities = [], disabled }) => {
    const { user } = useAuth();
    const isFaculty = user?.erp_users_type === 'FACULTY';
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    // Track universities added in this session so they can be selected
    const [localUniversities, setLocalUniversities] = useState([]);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const ids = Array.isArray(value) ? value.map(String) : [];

    const toggle = (id) => {
        const str = String(id);
        onChange(ids.includes(str) ? ids.filter((v) => v !== str) : [...ids, str]);
    };

    // Combine prop universities with local universities
    const combinedUniversities = [...universities, ...localUniversities.filter(lu => !universities.some(u => u.university_id === lu.university_id))];

    const filtered = combinedUniversities.filter((u) =>
        u.university_name?.toLowerCase().includes(search.toLowerCase())
    );
    const selected = combinedUniversities.filter((u) => ids.includes(String(u.university_id)));
    const label = selected.length === 0
        ? '— Select —'
        : selected.length === 1
            ? selected[0].university_name
            : `${selected.length} selected`;

    // Names for duplicate detection in the modal
    const existingNames = universities.map((u) => u.university_name).filter(Boolean);

    return (
        <>
            <div className="multi-uni-wrapper" ref={ref}>
                <button
                    type="button"
                    className={`multi-uni-trigger ${disabled ? 'multi-uni-trigger--disabled' : ''}`}
                    onClick={() => !disabled && setOpen((o) => !o)}
                    disabled={disabled}
                >
                    <span className="multi-uni-trigger__label">{label}</span>
                    <ChevronDown
                        size={14}
                        className={`multi-uni-trigger__icon ${open ? 'multi-uni-trigger__icon--open' : ''}`}
                    />
                </button>

                {open && (
                    <div className="multi-uni-dropdown">
                        <div className="multi-uni-dropdown__search-row">
                            <input
                                className="multi-uni-search"
                                type="text"
                                placeholder="Search universities..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                            {/* Faculty can add universities during data entry */}
                            {isFaculty && !disabled && (
                                <button
                                    type="button"
                                    className="multi-uni-suggest-btn"
                                    title="Add a new university"
                                    onClick={() => { setOpen(false); setShowSuggestModal(true); }}
                                >
                                    <Plus size={13} /> Add University
                                </button>
                            )}
                        </div>
                        {filtered.length === 0 && (
                            <div className="multi-uni-empty">
                                {search
                                    ? 'No universities match your search.'
                                    : 'No universities found.'}
                                {isFaculty && !disabled && !search && (
                                    <button
                                        type="button"
                                        className="multi-uni-suggest-btn multi-uni-suggest-btn--inline"
                                        onClick={() => { setOpen(false); setShowSuggestModal(true); }}
                                    >
                                        <Plus size={12} /> Add University
                                    </button>
                                )}
                            </div>
                        )}
                        {filtered.map((u) => {
                            const id = String(u.university_id);
                            return (
                                <label key={id} className="multi-uni-option">
                                    <input
                                        type="checkbox"
                                        checked={ids.includes(id)}
                                        onChange={() => toggle(id)}
                                        className="multi-uni-option__check"
                                    />
                                    <span className="multi-uni-option__name">{u.university_name}</span>
                                    {u.country && (
                                        <span className="multi-uni-option__country">{u.country}</span>
                                    )}
                                </label>
                            );
                        })}
                    </div>
                )}

                {selected.length > 0 && (
                    <div className="multi-uni-tags">
                        {selected.map((u) => (
                            <span key={u.university_id} className="multi-uni-tag">
                                {u.university_name}
                                {!disabled && (
                                    <button
                                        type="button"
                                        className="multi-uni-tag__remove"
                                        onClick={() => toggle(u.university_id)}
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add University Modal (Faculty only) ──────────────────── */}
            {showSuggestModal && (
                <SuggestUniversityModal
                    onClose={() => setShowSuggestModal(false)}
                    onSuccess={(newUni) => {
                        if (newUni && newUni.university_id) {
                            // Immediately add the new university to local options
                            setLocalUniversities(prev => {
                                const exists = prev.find(u => u.university_id === newUni.university_id);
                                if (exists) return prev;
                                return [...prev, newUni];
                            });
                            // Auto-select the newly added university
                            const currentIds = Array.isArray(value) ? value.map(String) : [];
                            if (!currentIds.includes(String(newUni.university_id))) {
                                onChange([...currentIds, String(newUni.university_id)]);
                            }
                        }
                        if (newUni && newUni.status === 'NO_MOU') {
                            setShowSuggestModal(false); // fast close for NO_MOU
                        }
                    }}
                    existingNames={existingNames}
                />
            )}
        </>
    );
};

// ─── Single field renderer ─────────────────────────────────────────────────────

const renderField = (field, value, onChange, disabled) => {
    const baseProps = { disabled };

    switch (field.type) {
        case 'text':
        case 'country':
            return (
                <input
                    {...baseProps}
                    type="text"
                    className="parameter-row__input-text"
                    placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case 'textarea':
            return (
                <textarea
                    {...baseProps}
                    className="parameter-row__textarea"
                    placeholder={field.placeholder ?? '…'}
                    rows={2}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case 'date':
            return (
                <input
                    {...baseProps}
                    type="date"
                    className="parameter-row__input-date"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case 'month':
            return (
                <input
                    {...baseProps}
                    type="month"
                    className="parameter-row__input-date"
                    value={value ? value.substring(0, 7) : ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                            onChange('');
                        } else {
                            onChange(`${val}-01`);
                        }
                    }}
                />
            );

        case 'number':
            return (
                <input
                    {...baseProps}
                    type="number"
                    className="parameter-row__input-number"
                    placeholder={field.placeholder ?? '0'}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            );

        case 'select': {
            const opts = field.options ?? [];
            return (
                <select
                    {...baseProps}
                    className="parameter-row__select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">— Select —</option>
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
            );
        }

        case 'yesno':
            return (
                <select
                    {...baseProps}
                    className="parameter-row__select"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">— Select —</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                </select>
            );

        default:
            return null;
    }
};

// ─── RowCard ──────────────────────────────────────────────────────────────────

const RowCard = ({
    row, rowIndex, totalRows,
    config, universities,
    onChange, onRemove,
    isEditable, disabled,
}) => {
    const fileInputRefs = useRef({});

    // Split fields into groups for layout
    const uniFields = config.fields.filter((f) => f.type === 'multi-uni');
    const dateFields = config.fields.filter((f) => f.type === 'date' || f.type === 'month');
    const otherFields = config.fields.filter(
        (f) => f.type !== 'multi-uni' && f.type !== 'date' && f.type !== 'month'
    );

    const updateField = (fieldId, value) => onChange(setRowFieldValue(row, fieldId, value));

    // File handlers
    const addFiles = (docType, e) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        const prev = row.documents[docType] ?? [];
        onChange({ ...row, documents: { ...row.documents, [docType]: [...prev, ...files] } });
        if (fileInputRefs.current[docType]) fileInputRefs.current[docType].value = '';
    };

    const removeFile = (docType, idx) => {
        const updated = [...(row.documents[docType] ?? [])];
        updated.splice(idx, 1);
        onChange({ ...row, documents: { ...row.documents, [docType]: updated } });
    };

    const canRemove = isEditable && !disabled && totalRows > 1;

    return (
        <div className="activity-row-card">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="activity-row-card__header">
                <span className="activity-row-card__number">Entry {rowIndex + 1}</span>
                {canRemove && (
                    <button
                        type="button"
                        className="activity-row-card__remove"
                        onClick={onRemove}
                        title="Remove this entry"
                    >
                        <Trash2 size={13} /> Remove
                    </button>
                )}
            </div>

            <div className="param-row-card__body">
                {/* ── Section A: Universities ─────────────────────────── */}
                {uniFields.length > 0 && (
                    <div className="param-row-section">
                        <div className="param-row-section__title">Partner Institution(s)</div>
                        {uniFields.map((f) => (
                            <div key={f.id} className="activity-row-card__field activity-row-card__field--wide">
                                <label className="parameter-row__label">
                                    {f.label} <span className="param-required">*</span>
                                </label>
                                <MultiUniversitySelect
                                    value={getRowFieldValue(row, f.id)}
                                    onChange={(val) => updateField(f.id, val)}
                                    universities={universities}
                                    disabled={!isEditable || disabled}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Section B: Dates ────────────────────────────────── */}
                {dateFields.length > 0 && (
                    <div className="param-row-section">
                        <div className="param-row-section__title">Date(s)</div>
                        <div className="activity-row-card__fields">
                            {dateFields.map((f) => {
                                const val = getRowFieldValue(row, f.id);
                                const isEndDate = f.id === 'end_date';
                                const startVal = getRowFieldValue(row, 'start_date');
                                const dateError = isEndDate && startVal && val && val < startVal;
                                return (
                                    <div key={f.id} className="activity-row-card__field">
                                        <label className="parameter-row__label">
                                            {f.label} <span className="param-required">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className={`parameter-row__input-date ${dateError ? 'input-error' : ''}`}
                                            value={val}
                                            onChange={(e) => updateField(f.id, e.target.value)}
                                            disabled={!isEditable || disabled}
                                        />
                                        {dateError && (
                                            <span className="parameter-row__error">Must be after start date</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Section C: Parameter-Specific Fields ────────────── */}
                {otherFields.length > 0 && (
                    <div className="param-row-section">
                        <div className="param-row-section__title">Activity Details</div>
                        <div className="activity-row-card__fields">
                            {otherFields.map((f) => {
                                const val = getRowFieldValue(row, f.id);
                                const isWide = f.type === 'textarea';
                                return (
                                    <div
                                        key={f.id}
                                        className={`activity-row-card__field ${isWide ? 'activity-row-card__field--wide' : ''}`}
                                    >
                                        <label className="parameter-row__label">
                                            {f.label} <span className="param-required">*</span>
                                        </label>
                                        {renderField(
                                            f,
                                            val,
                                            (v) => updateField(f.id, v),
                                            !isEditable || disabled
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Section D: Documents ────────────────────────────── */}
                <div className="param-row-section">
                    <div className="param-row-section__title">
                        Documents
                        {config.documentNote && (
                            <span className="param-row-section__note">
                                <Info size={12} /> {config.documentNote}
                            </span>
                        )}
                    </div>

                    {/* Upload area (edit mode only) */}
                    {isEditable && !disabled && (
                        <div className="activity-row-card__doc-grid">
                            {config.documents.map((docLabel) => {
                                const key = docKey(docLabel);
                                const files = row.documents[key] ?? [];
                                const inputId = `file-${row.id}-${key}`;
                                return (
                                    <div key={key} className="activity-row-card__doc-type">
                                        <span className="activity-row-card__doc-type-label">{docLabel}</span>
                                        <div className="parameter-row__file-area">
                                            <input
                                                ref={(el) => { fileInputRefs.current[key] = el; }}
                                                type="file"
                                                id={inputId}
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                multiple
                                                onChange={(e) => addFiles(key, e)}
                                                className="parameter-row__file-input"
                                            />
                                            <label htmlFor={inputId} className="parameter-row__file-label">
                                                <Upload size={13} /> Add file
                                            </label>
                                        </div>
                                        {files.length > 0 && (
                                            <ul className="activity-row-card__file-list">
                                                {files.map((f, fi) => (
                                                    <li key={fi} className="activity-row-card__file-item">
                                                        <FileText size={12} />
                                                        <span title={f.name}>{f.name}</span>
                                                        <button
                                                            type="button"
                                                            className="parameter-row__file-remove"
                                                            onClick={() => removeFile(key, fi)}
                                                        >
                                                            <X size={11} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Already-uploaded server documents */}
                    {Object.entries(row.existingDocuments ?? {}).some(
                        ([, v]) => Array.isArray(v) && v.length > 0
                    ) && (
                            <div className="activity-row-card__existing-docs">
                                {Object.entries(row.existingDocuments).map(([docType, paths]) =>
                                    Array.isArray(paths) &&
                                    paths.map((p, pi) => (
                                        <span key={`${docType}-${pi}`} className="activity-row-card__existing-doc-tag">
                                            <FileText size={12} />
                                            {config.documents.find(
                                                (d) => docKey(d) === docType
                                            ) ?? docType}: {p.split('/').pop() || p}
                                        </span>
                                    ))
                                )}
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
};

// ─── ParameterRow (main export) ───────────────────────────────────────────────

const ParameterRow = ({
    parameter,
    existingData = null,
    universities = [],
    onSave,
    onDelete,
    onSubmit,
    onAdd,
    disabled = false,
    isContextSelected = false,
    userRole: userRoleProp,
    autoEdit = false,
}) => {
    const { user } = useAuth();
    const userRole = userRoleProp || user?.erp_users_type;
    const isHOD = ['HOD', 'COORDINATOR'].includes(userRole);
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    // Resolve config (or fallback)
    const config = getParamConfig(parameter) ?? FALLBACK_CONFIG;
    const isAdminLocked = config.adminOnly && !isAdmin;

    const [isEditing, setIsEditing] = useState(autoEdit || !existingData);
    const [activityTitle, setActivityTitle] = useState(existingData?.activity_title ?? '');
    const [rows, setRows] = useState(() =>
        rowsFromActivityData(existingData?.activity_data, config)
    );
    const [errors, setErrors] = useState([]);
    const [duplicateWarnings, setDuplicateWarnings] = useState([]);

    const rowsJson = JSON.stringify(rows);

    // Debounced check for duplicates
    useEffect(() => {
        if (isHOD || isAdminLocked || !parameter?.parameter_id) {
            setDuplicateWarnings([]);
            return;
        }

        const timer = setTimeout(async () => {
            const seenActivityIds = new Set();
            const activityId = existingData?.activity_id || null;

            // Collect all valid API calls to run concurrently
            const promises = [];

            for (const row of rows) {
                const unis = row.partner_universities ?? [];
                const sd = row.start_date;
                const ed = row.end_date;

                if (unis.length > 0 && sd && ed && sd <= ed) {
                    for (const uid of unis) {
                        if (!parameter.parameter_id || !uid || !sd || !ed) continue;

                        promises.push(
                            checkDuplicateActivity(parameter.parameter_id, uid, sd, ed, activityId)
                                .then(res => ({ res, uid }))
                                .catch(() => ({ res: null, uid }))
                        );
                    }
                }
            }

            if (promises.length === 0) {
                setDuplicateWarnings([]);
                return;
            }

            const results = await Promise.all(promises);
            const warnings = [];

            results.forEach(({ res, uid }) => {
                if (res?.is_duplicate) {
                    res.matches.forEach(m => {
                        if (!seenActivityIds.has(m.activity_id)) {
                            seenActivityIds.add(m.activity_id);
                            const uniObj = universities.find(u => String(u.university_id) === String(uid));
                            warnings.push({
                                ...m,
                                uniName: uniObj?.university_name || `University #${uid}`
                            });
                        }
                    });
                }
            });

            setDuplicateWarnings(warnings.slice(0, 5));
        }, 500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rowsJson, parameter?.parameter_id, isEditing, isHOD, isAdminLocked, existingData?.activity_id, universities]);

    // Sync state when existingData or config changes
    useEffect(() => {
        setActivityTitle(existingData?.activity_title ?? '');
        setRows(rowsFromActivityData(existingData?.activity_data, config));
        setIsEditing(!existingData);
        setErrors([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingData]);

    const isSubmitted = existingData?.status === 'SUBMITTED';
    const isApproved = existingData?.status === 'APPROVED';
    const isRejected = existingData?.status === 'REJECTED';
    const isClarificationRequested = existingData?.status === 'CLARIFICATION_REQUESTED';
    const isDraft = existingData?.status === 'DRAFT' || !existingData;
    const isEditable = (isDraft || isRejected || isClarificationRequested)
        && !isHOD && !isAdminLocked;

    // Validation
    const validate = () => {
        const errs = [];

        if (!activityTitle || !activityTitle.trim()) {
            errs.push('Activity Title is required');
        }

        rows.forEach((row, i) => {
            const label = rows.length > 1 ? `Entry ${i + 1}: ` : '';
            // All data entry fields are compulsory
            config.fields.forEach((f) => {
                const val = getRowFieldValue(row, f.id);
                const empty = Array.isArray(val) ? val.length === 0 : !val;
                if (empty) errs.push(`${label}${f.label} is required`);
            });
            // Date ordering
            const s = getRowFieldValue(row, 'start_date');
            const e = getRowFieldValue(row, 'end_date');
            if (s && e && e < s) errs.push(`${label}End date must be after start date`);
        });
        setErrors(errs);
        return errs.length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;

        const rowFiles = [];
        rows.forEach((row, rowIndex) => {
            Object.entries(row.documents ?? {}).forEach(([docType, files]) => {
                files.forEach((file) => rowFiles.push({ rowIndex, docType, file }));
            });
        });

        const payload = {
            parameter_id: parameter.parameter_id,
            activity_title: activityTitle || null,
            activity_data: {
                rows: rows.map((row) => ({
                    partner_universities: (row.partner_universities ?? []).map(Number),
                    start_date: row.start_date || null,
                    end_date: row.end_date || null,
                    fields: row.fields ?? {},
                    ...(row.existingDocuments && Object.keys(row.existingDocuments).length > 0
                        ? { documents: row.existingDocuments }
                        : {}),
                })),
            },
            rowFiles,
        };

        onSave(payload);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (existingData) {
            setActivityTitle(existingData.activity_title ?? '');
            setRows(rowsFromActivityData(existingData?.activity_data, config));
            setIsEditing(false);
        }
        setErrors([]);
    };

    const addRow = () => setRows((prev) => [...prev, makeEmptyRowForConfig(config)]);
    const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));
    const updateRow = (idx, updated) => setRows((prev) =>
        prev.map((r, i) => (i === idx ? updated : r))
    );

    const handleViewDocument = async () => {
        if (!existingData?.activity_id) return;
        try {
            const url = await downloadActivityDocument(existingData.activity_id);
            window.open(url, '_blank');
        } catch {
            alert('Failed to load document. Please try again.');
        }
    };

    const statusClass = existingData?.status?.toLowerCase().replace(/_/g, '-') ?? 'none';

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className={`parameter-row ${disabled && !isEditing ? 'parameter-row--disabled' : ''}`}>

            {/* Parameter name + code */}
            <div className="parameter-row__name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div>
                    {parameter.parameter_name ?? parameter.parameter_code}
                    {parameter.parameter_code && (
                        <span className="parameter-row__code">{parameter.parameter_code}</span>
                    )}
                </div>
                {isContextSelected && !isHOD && existingData && (
                    <ActionButton
                        variant="primary"
                        onClick={onAdd}
                        title="Add another entry for this parameter"
                    >
                        <Plus size={14} style={{ marginRight: 4 }} /> Add another entry
                    </ActionButton>
                )}
            </div>

            {/* Admin-only lock banner */}
            {isAdminLocked && (
                <div className="param-admin-lock">
                    <ShieldOff size={15} />
                    <span>This parameter is managed exclusively by OIA Admin.</span>
                </div>
            )}

            {!isAdminLocked && (
                <>
                    {/* Activity-level title */}
                    <div className="parameter-row__field">
                        <label className="parameter-row__label">Activity Title <span className="param-required">*</span></label>
                        <input
                            type="text"
                            className="parameter-row__input-text"
                            placeholder="Overall activity title…"
                            value={activityTitle}
                            onChange={(e) => setActivityTitle(e.target.value)}
                            disabled={!isEditing || !isEditable || disabled}
                        />
                    </div>

                    {/* Duplicate warnings non-blocking alert */}
                    {duplicateWarnings.length > 0 && (
                        <div className="param-admin-lock" style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', marginBottom: 15, alignItems: 'flex-start' }}>
                            <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                            <div>
                                <strong style={{ display: 'block', marginBottom: 4 }}>⚠️ Similar activities found:</strong>
                                <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.85rem' }}>
                                    {duplicateWarnings.map(w => (
                                        <li key={w.activity_id}>
                                            {w.title} — {w.uniName} ({w.start_date} → {w.end_date})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Row cards */}
                    <div className="parameter-row__rows">
                        {/* Add Row was moved to bottom */}

                        {rows.map((row, idx) => (
                            <RowCard
                                key={row.id}
                                row={row}
                                rowIndex={idx}
                                totalRows={rows.length}
                                config={config}
                                universities={universities}
                                onChange={(updated) => updateRow(idx, updated)}
                                onRemove={() => removeRow(idx)}
                                isEditable={isEditing && isEditable}
                                disabled={disabled}
                            />
                        ))}

                        {/* Add Row at bottom */}
                        {isEditing && isEditable && !disabled && config.multiRow !== false && (
                            <button
                                type="button"
                                className="activity-row-card__add-row"
                                onClick={addRow}
                                style={{ marginTop: '8px' }}
                            >
                                <Plus size={14} /> Add another entry
                            </button>
                        )}
                    </div>

                    {/* Validation errors */}
                    {errors.length > 0 && (
                        <div className="param-errors">
                            {errors.map((e, i) => (
                                <div key={i} className="parameter-row__error">
                                    <AlertCircle size={13} /> {e}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Status badge */}
            <div className="parameter-row__status">
                {existingData ? (
                    <span className={`status-badge status-badge--${statusClass}`}>
                        {existingData.status}
                    </span>
                ) : (
                    <span className="status-badge status-badge--none">NEW</span>
                )}
            </div>

            {/* Clarification / rejection remarks */}
            {(isRejected || isClarificationRequested) && existingData?.rejection_remarks && (
                <div className={`parameter-row__remarks ${isClarificationRequested ? 'parameter-row__remarks--clarify' : ''}`}>
                    {isClarificationRequested ? <HelpCircle size={14} /> : <AlertCircle size={14} />}
                    <span>
                        <strong>{isClarificationRequested ? 'Clarification needed:' : 'Reason:'}</strong>{' '}
                        {existingData.rejection_remarks.split('|||').pop().trim()}
                    </span>
                </div>
            )}

            {/* Actions */}
            <div className="parameter-row__actions">
                {isEditing && !disabled && !isAdminLocked ? (
                    <>
                        <ActionButton variant="success" onClick={handleSave}>
                            {existingData ? 'Save Changes' : 'Save as Draft'}
                        </ActionButton>
                        {existingData && (
                            <ActionButton variant="secondary" onClick={handleCancel}>
                                Cancel
                            </ActionButton>
                        )}
                    </>
                ) : !isAdminLocked ? (
                    <>
                        {isEditable && !isHOD && (
                            <>
                                <ActionButton variant="primary" onClick={() => setIsEditing(true)}>
                                    {existingData ? 'Edit' : 'Create'}
                                </ActionButton>
                                {existingData && isDraft && (
                                    <ActionButton
                                        variant="success"
                                        onClick={() => onSubmit(existingData.activity_id)}
                                    >
                                        Request Approval
                                    </ActionButton>
                                )}
                                {existingData && isClarificationRequested && (
                                    <ActionButton
                                        variant="warning"
                                        onClick={() => onSubmit(existingData.activity_id)}
                                    >
                                        Resubmit
                                    </ActionButton>
                                )}
                            </>
                        )}
                        {!isEditable && !isHOD && existingData && (
                            <span className="action-label">
                                {isApproved
                                    ? 'Approved ✓'
                                    : isSubmitted
                                        ? 'Awaiting Review'
                                        : 'Read Only'}
                            </span>
                        )}
                        {isHOD && <span className="action-label">View Only</span>}
                        {/* Grey + button moved to parameter header as Blue button */}
                        {isSuperAdmin && existingData && (
                            <ActionButton
                                variant="danger"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this activity?')) {
                                        onDelete(existingData.activity_id);
                                    }
                                }}
                                title="Delete this activity"
                            >
                                <Trash2 size={14} /> Delete
                            </ActionButton>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default ParameterRow;
