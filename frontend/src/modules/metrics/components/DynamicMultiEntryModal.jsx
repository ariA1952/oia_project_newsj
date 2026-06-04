import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    X, Layers, Plus, Trash2, CheckCircle2, AlertCircle,
    Loader2, ChevronRight, Upload, FileText, Info,
    ChevronDown, LayoutDashboard, Calendar, GraduationCap,
} from 'lucide-react';
import apiClient from '../services/metricsService';
import {
    getParamConfig,
    FALLBACK_CONFIG,
} from '../config/parameterConfigs';
import './DynamicMultiEntryModal.css';

const STEPS = ['Select Fields', 'Common Values', 'Entries', 'Confirm'];

const DynamicMultiEntryModal = ({
    parameter,
    parameterId,
    parameterName,
    academicYearId,
    campusId,
    departmentId,
    universities = [],
    onClose,
    onComplete,
}) => {
    const config = useMemo(() => getParamConfig(parameter) ?? FALLBACK_CONFIG, [parameter]);
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeEntryIdx, setActiveEntryIdx] = useState(0);

    const entriesContainerRef = useRef(null);
    const entryRefs = useRef({});

    // Step 0: field selection
    const [commonFieldIds, setCommonFieldIds] = useState(new Set());

    // Step 1: common values
    const [commonValues, setCommonValues] = useState({});

    // Step 2: entries
    const [entries, setEntries] = useState([]);

    // Step 3: results
    const [saveResult, setSaveResult] = useState(null);

    // Helper to create empty data for an entry
    const createEmptyEntryData = useCallback(() => {
        const data = { activity_title: '', documents: {}, other_doc_title: '' };
        config.fields.forEach((f) => {
            if (f.type === 'multi-uni') data[f.id] = [];
            else data[f.id] = '';
        });
        return data;
    }, [config.fields]);

    // Initialize entries or load from draft
    useEffect(() => {
        const draftKey = `dme_draft_${parameterId}`;
        const saved = localStorage.getItem(draftKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setEntries(parsed.entries || []);
                setCommonFieldIds(new Set(parsed.commonFieldIds || []));
                setCommonValues(parsed.commonValues || {});
                setStep(parsed.step || 0);
            } catch (e) {
                setEntries([{ _id: crypto.randomUUID(), data: createEmptyEntryData(), isExpanded: true, isValid: true, errors: [] }]);
            }
        } else {
            setEntries([{ _id: crypto.randomUUID(), data: createEmptyEntryData(), isExpanded: true, isValid: true, errors: [] }]);
        }
    }, [parameterId, createEmptyEntryData]);

    // Save draft on change
    useEffect(() => {
        if (step < 3) {
            const draftKey = `dme_draft_${parameterId}`;
            localStorage.setItem(draftKey, JSON.stringify({
                entries,
                commonFieldIds: Array.from(commonFieldIds),
                commonValues,
                step
            }));
        }
    }, [entries, commonFieldIds, commonValues, step, parameterId]);

    const clearDraft = () => localStorage.removeItem(`dme_draft_${parameterId}`);

    const toggleCommonField = (fieldId) => {
        setCommonFieldIds((prev) => {
            const next = new Set(prev);
            if (next.has(fieldId)) next.delete(fieldId);
            else next.add(fieldId);
            return next;
        });
    };

    const variableFields = config.fields.filter((f) => !commonFieldIds.has(f.id));
    const commonFields = config.fields.filter((f) => commonFieldIds.has(f.id));

    // Stats
    const completedCount = entries.filter(e => {
        const d = e.data;
        const hasTitle = commonFieldIds.has('activity_title') ? !!commonValues.activity_title : !!d.activity_title;
        const hasVars = variableFields.every(f => !f.required || (Array.isArray(d[f.id]) ? d[f.id].length > 0 : !!d[f.id]));
        return hasTitle && hasVars;
    }).length;

    // ── Field Renderer ──
    const renderField = (field, value, onChange, disabled = false) => {
        switch (field.type) {
            case 'text':
            case 'country':
                return (
                    <input
                        type="text"
                        className="dme-field__input"
                        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}…`}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        className="dme-field__textarea"
                        placeholder={field.placeholder ?? '…'}
                        rows={2}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    />
                );
            case 'date':
                return (
                    <input
                        type="date"
                        className="dme-field__input"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    />
                );
            case 'month':
                return (
                    <input
                        type="month"
                        className="dme-field__input"
                        value={value ? value.substring(0, 7) : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            onChange(val ? `${val}-01` : '');
                        }}
                        disabled={disabled}
                    />
                );
            case 'number':
                return (
                    <input
                        type="number"
                        className="dme-field__input"
                        placeholder="0"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    />
                );
            case 'select':
                return (
                    <select
                        className="dme-field__select"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    >
                        <option value="">— Select —</option>
                        {(field.options || []).map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                );
            case 'yesno':
                return (
                    <select
                        className="dme-field__select"
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={disabled}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>
                );
            case 'multi-uni': {
                const ids = Array.isArray(value) ? value.map(String) : [];
                return (
                    <div className="dme-field__multi-uni">
                        <select
                            className="dme-field__select"
                            value=""
                            onChange={(e) => {
                                if (e.target.value && !ids.includes(e.target.value)) {
                                    onChange([...ids, e.target.value]);
                                }
                            }}
                            disabled={disabled}
                        >
                            <option value="">Add university...</option>
                            {universities
                                .filter((u) => !ids.includes(String(u.university_id)))
                                .map((u) => (
                                    <option key={u.university_id} value={String(u.university_id)}>
                                        {u.university_name}
                                    </option>
                                ))}
                        </select>
                        {ids.length > 0 && (
                            <div className="dme-field__uni-tags">
                                {ids.map((uid) => {
                                    const uni = universities.find((u) => String(u.university_id) === uid);
                                    return (
                                        <span key={uid} className="dme-field__uni-tag">
                                            {uni?.university_name || `#${uid}`}
                                            {!disabled && (
                                                <button
                                                    type="button"
                                                    onClick={() => onChange(ids.filter((i) => i !== uid))}
                                                >
                                                    <X size={10} />
                                                </button>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            }
            default:
                return null;
        }
    };

    // ── Entry manipulation ──
    const addEntry = () => {
        const newId = crypto.randomUUID();
        setEntries((prev) => [
            ...prev.map(e => ({ ...e, isExpanded: false })),
            { _id: newId, data: createEmptyEntryData(), isExpanded: true, isValid: true, errors: [] }
        ]);
        setActiveEntryIdx(entries.length);
        
        // Auto scroll to bottom
        setTimeout(() => {
            if (entriesContainerRef.current) {
                entriesContainerRef.current.scrollTop = entriesContainerRef.current.scrollHeight;
            }
        }, 100);
    };

    const removeEntry = (idx) => {
        if (entries.length <= 1) return;
        setEntries((prev) => prev.filter((_, i) => i !== idx));
        if (activeEntryIdx >= entries.length - 1) setActiveEntryIdx(Math.max(0, entries.length - 2));
    };

    const updateEntryData = (idx, fieldId, value) => {
        setEntries((prev) =>
            prev.map((e, i) => (i === idx ? { ...e, data: { ...e.data, [fieldId]: value } } : e))
        );
    };

    const toggleEntryExpand = (idx) => {
        setEntries(prev => prev.map((e, i) => i === idx ? { ...e, isExpanded: !e.isExpanded } : e));
        setActiveEntryIdx(idx);
    };

    const scrollToEntry = (idx) => {
        setActiveEntryIdx(idx);
        setEntries(prev => prev.map((e, i) => i === idx ? { ...e, isExpanded: true } : e));
        entryRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Document handling
    const addDocFile = (entryIdx, docType, files) => {
        setEntries((prev) =>
            prev.map((e, i) => {
                if (i !== entryIdx) return e;
                const docs = { ...e.data.documents };
                docs[docType] = [...(docs[docType] || []), ...files];
                return { ...e, data: { ...e.data, documents: docs } };
            })
        );
    };

    const removeDocFile = (entryIdx, docType, fileIdx) => {
        setEntries((prev) =>
            prev.map((e, i) => {
                if (i !== entryIdx) return e;
                const docs = { ...e.data.documents };
                const list = [...(docs[docType] || [])];
                list.splice(fileIdx, 1);
                docs[docType] = list;
                return { ...e, data: { ...e.data, documents: docs } };
            })
        );
    };

    // ── Local Validation ──
    const validateLocal = () => {
        let firstErrorIdx = -1;
        const newEntries = entries.map((e, idx) => {
            const errors = [];
            const d = e.data;
            
            // Title
            if (!commonFieldIds.has('activity_title') && !d.activity_title) {
                errors.push("Activity Title is required");
            }
            
            // Variable fields
            variableFields.forEach(f => {
                if (f.required) {
                    const val = d[f.id];
                    if (!val || (Array.isArray(val) && val.length === 0)) {
                        errors.push(`${f.label} is required`);
                    }
                }
            });

            // Mandatory documents
            (config.documents || []).forEach(docLabel => {
                if (docLabel.toLowerCase().startsWith('other')) return;
                const dk = dkFn(docLabel);
                const files = d.documents?.[dk] || [];
                if (files.length === 0) {
                    errors.push(`${docLabel} document is required`);
                }
            });

            if (errors.length > 0 && firstErrorIdx === -1) firstErrorIdx = idx;
            return { ...e, errors, isValid: errors.length === 0, isExpanded: errors.length > 0 ? true : e.isExpanded };
        });

        setEntries(newEntries);
        
        if (firstErrorIdx !== -1) {
            setError(`Please fix errors in Entry ${firstErrorIdx + 1}`);
            scrollToEntry(firstErrorIdx);
            return false;
        }
        return true;
    };

    // ── Submit ──
    const handleSubmit = async () => {
        if (!validateLocal()) return;

        setLoading(true);
        setError(null);
        try {
            const common = {};
            for (const fid of commonFieldIds) {
                common[fid] = commonValues[fid] ?? '';
            }

            const entryData = entries.map((e) => {
                const d = e.data;
                const row = {};
                row.activity_title = d.activity_title || commonValues.activity_title || '';
                for (const f of variableFields) row[f.id] = d[f.id] ?? '';
                for (const fid of commonFieldIds) {
                    if (fid !== 'activity_title') row[fid] = commonValues[fid] ?? '';
                }
                return row;
            });

            const response = await apiClient.post('/bulk/multi-entry', {
                parameter_id: parameterId,
                erp_academic_year_id: parseInt(academicYearId),
                campus_id: campusId ? parseInt(campusId) : null,
                department_id: departmentId ? parseInt(departmentId) : null,
                common_fields: common,
                entries: entryData,
            });

            const result = response.data;
            setSaveResult(result);

            // Document Uploads
            // Now that we group entries into a single parent activity, we upload all docs to result.activity_ids[0]
            const parentActId = result.activity_ids?.[0];
            if (parentActId) {
                for (let idx = 0; idx < entries.length; idx++) {
                    const docs = entries[idx].data.documents || {};
                    for (const [dt, files] of Object.entries(docs)) {
                        for (const f of files) {
                            if (f instanceof File) {
                                const fd = new FormData();
                                fd.append('doc_type', dt);
                                // CRITICAL: Use the actual entry index so backend links doc to correct row
                                fd.append('row_index', String(idx));
                                fd.append('file', f);
                                try {
                                    await apiClient.post(`/bulk/upload-documents/${parentActId}`, fd, {
                                        headers: { 'Content-Type': 'multipart/form-data' },
                                    });
                                } catch (uploadErr) {
                                    console.error(`Failed to upload doc for entry ${idx}:`, uploadErr);
                                }
                            }
                        }
                    }
                }
            }

            clearDraft();
            setStep(3);
        } catch (err) {
            const detail = err.response?.data?.detail;
            const status = err.response?.status;

            if (typeof detail === 'object' && detail.errors) {
                // Our custom validation structure
                setError(`Validation failed: ${detail.errors.map(e => e.message).join('; ')}`);
                const apiErrorsByRow = {};
                detail.errors.forEach(e => {
                    if (!apiErrorsByRow[e.row]) apiErrorsByRow[e.row] = [];
                    apiErrorsByRow[e.row].push(e.message);
                });
                
                setEntries(prev => prev.map((e, i) => {
                    const rowNum = i + 1;
                    if (apiErrorsByRow[rowNum]) {
                        return { ...e, errors: apiErrorsByRow[rowNum], isValid: false, isExpanded: true };
                    }
                    return e;
                }));
            } else if (Array.isArray(detail)) {
                // Standard FastAPI 422 list
                const msg = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
                setError(`Validation error: ${msg}`);
            } else {
                const errorMsg = typeof detail === 'string' ? detail : (detail?.message || err.message || 'Unknown error');
                setError(`Save failed (Status: ${status || 'Unknown'}). ${errorMsg}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFinish = () => {
        onComplete && onComplete();
        onClose();
    };

    const dkFn = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    const getEntrySummary = (entry) => {
        const title = entry.data.activity_title || commonValues.activity_title || 'Untitled Activity';
        const unis = entry.data.partner_universities || commonValues.partner_universities || [];
        const uniNames = unis.map(uid => universities.find(u => String(u.university_id) === String(uid))?.university_name).filter(Boolean);
        const docCount = Object.values(entry.data.documents || {}).reduce((acc, files) => acc + files.length, 0);
        return {
            title,
            meta: uniNames.length > 0 ? uniNames.join(', ') : 'No universities selected',
            docCount,
        };
    };

    return (
        <div className="dme-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="dme-modal">
                {/* Header */}
                <div className="dme-modal__header">
                    <div className="dme-modal__header-left">
                        <Layers size={22} />
                        <h2>Dynamic Multi-Entry Overhaul</h2>
                    </div>
                    <button className="dme-modal__close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Steps */}
                <div className="dme-modal__steps">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`dme-modal__step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                            <span className="dme-modal__step-num">{i < step ? '✓' : i + 1}</span>
                            <span className="dme-modal__step-label">{s}</span>
                            {i < STEPS.length - 1 && <ChevronRight size={14} className="dme-modal__step-arrow" />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="dme-modal__body">
                    {error && (
                        <div className="dme-modal__error">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Step 0: Field Selection */}
                    {step === 0 && (
                        <div className="dme-step-content dme-step-content--scrollable">
                            <div className="dme-step-fields">
                                <div className="dme-step-intro">
                                    <LayoutDashboard size={20} />
                                    <div>
                                        <strong>Optimization Step:</strong> Select fields that are identical for every entry you're about to add.
                                        We'll collect these values once and apply them to all generated forms.
                                    </div>
                                </div>
                                <div className="dme-field-toggle-list">
                                    <label className="dme-field-toggle">
                                        <input type="checkbox" checked={commonFieldIds.has('activity_title')} onChange={() => toggleCommonField('activity_title')} />
                                        <span className="dme-field-toggle__label">Activity Title</span>
                                        <span className="dme-field-toggle__type">text</span>
                                    </label>
                                    {config.fields.map((f) => (
                                        <label key={f.id} className="dme-field-toggle">
                                            <input type="checkbox" checked={commonFieldIds.has(f.id)} onChange={() => toggleCommonField(f.id)} />
                                            <span className="dme-field-toggle__label">{f.label}</span>
                                            <span className="dme-field-toggle__type">{f.type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Common Values */}
                    {step === 1 && (
                        <div className="dme-step-content dme-step-content--scrollable">
                            <div className="dme-step-common">
                                <div className="dme-step-intro">
                                    <Info size={20} />
                                    <div>Provide the shared values for the fields you selected.</div>
                                </div>
                                <div className="dme-common-fields">
                                    {commonFieldIds.has('activity_title') && (
                                        <div className="dme-field-group">
                                            <label className="dme-field-label">Activity Title <span className="dme-required">*</span></label>
                                            <input type="text" className="dme-field__input" value={commonValues.activity_title || ''} onChange={(e) => setCommonValues(p => ({ ...p, activity_title: e.target.value }))} />
                                        </div>
                                    )}
                                    {commonFields.map((f) => (
                                        <div key={f.id} className="dme-field-group">
                                            <label className="dme-field-label">{f.label} <span className="dme-required">*</span></label>
                                            {renderField(f, commonValues[f.id], (v) => setCommonValues(p => ({ ...p, [f.id]: v })))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Entries Overhaul */}
                    {step === 2 && (
                        <div className="dme-step-entries">
                            <div className="dme-sticky-toolbar">
                                <div className="dme-toolbar-stats">
                                    <div className="dme-stat-item">
                                        <span className="dme-stat-label">Total Entries</span>
                                        <span className="dme-stat-value">{entries.length}</span>
                                    </div>
                                    <div className="dme-stat-item">
                                        <span className="dme-stat-label">Completed</span>
                                        <span className="dme-stat-value" style={{ color: '#10b981' }}>{completedCount}</span>
                                    </div>
                                    <div className="dme-stat-item">
                                        <span className="dme-stat-label">Pending</span>
                                        <span className="dme-stat-value" style={{ color: '#f59e0b' }}>{entries.length - completedCount}</span>
                                    </div>
                                </div>
                                <button className="dme-add-entry-btn" onClick={addEntry}>
                                    <Plus size={18} /> Add Another Entry
                                </button>
                            </div>

                            <div className="dme-entries-container">
                                {/* Navigation Sidebar */}
                                {entries.length > 3 && (
                                    <div className="dme-entries-nav">
                                        {entries.map((e, idx) => (
                                            <div 
                                                key={e._id} 
                                                className={`dme-nav-item ${activeEntryIdx === idx ? 'active' : ''} ${!e.isValid ? 'has-error' : ''}`}
                                                onClick={() => scrollToEntry(idx)}
                                                title={`Entry ${idx + 1}`}
                                            >
                                                {idx + 1}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="dme-entries-list" ref={entriesContainerRef}>
                                    {entries.map((entry, idx) => {
                                        const summary = getEntrySummary(entry);
                                        return (
                                            <div 
                                                key={entry._id} 
                                                ref={el => entryRefs.current[idx] = el}
                                                className={`dme-entry-card ${entry.isExpanded ? 'expanded' : ''} ${activeEntryIdx === idx ? 'active' : ''} ${!entry.isValid ? 'invalid' : ''}`}
                                            >
                                                <div className="dme-entry-card__header" onClick={() => toggleEntryExpand(idx)}>
                                                    <div className="dme-entry-header-info">
                                                        <div className="dme-entry-num">{idx + 1}</div>
                                                        <div className="dme-entry-summary">
                                                            <span className="dme-entry-summary__title">{summary.title}</span>
                                                            <span className="dme-entry-summary__meta">{summary.meta}</span>
                                                            {summary.docCount > 0 && <span className="dme-entry-summary__docs"><FileText size={11} /> {summary.docCount} file{summary.docCount !== 1 ? 's' : ''}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="dme-entry-card__actions">
                                                        {entries.length > 1 && (
                                                            <button 
                                                                className="dme-remove-entry-icon" 
                                                                onClick={(e) => { e.stopPropagation(); removeEntry(idx); }}
                                                                title="Delete Entry"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                        <ChevronDown size={18} className="dme-expand-icon" />
                                                    </div>
                                                </div>

                                                {entry.isExpanded && (
                                                    <div className="dme-entry-card__body">
                                                        {entry.errors.length > 0 && (
                                                            <div className="dme-entry-errors">
                                                                {entry.errors.map((err, i) => (
                                                                    <div key={i} className="dme-entry-error-msg">
                                                                        <AlertCircle size={12} /> {err}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div className="dme-entry-fields">
                                                            {!commonFieldIds.has('activity_title') && (
                                                                <div className="dme-field-group dme-field-group--wide">
                                                                    <label className="dme-field-label">Activity Title <span className="dme-required">*</span></label>
                                                                    <input type="text" className="dme-field__input" value={entry.data.activity_title || ''} onChange={(e) => updateEntryData(idx, 'activity_title', e.target.value)} />
                                                                </div>
                                                            )}
                                                            {variableFields.map((f) => (
                                                                <div key={f.id} className={`dme-field-group ${f.type === 'textarea' ? 'dme-field-group--wide' : ''}`}>
                                                                    <label className="dme-field-label">{f.label} {f.required && <span className="dme-required">*</span>}</label>
                                                                    {renderField(f, entry.data[f.id], (v) => updateEntryData(idx, f.id, v))}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {config.documents?.length > 0 && (
                                                            <div className="dme-entry-docs">
                                                                <div className="dme-entry-docs__title"><FileText size={16} /> Documents</div>
                                                                <div className="dme-entry-docs__grid">
                                                                    {config.documents.map((docLabel) => {
                                                                        const dk = dkFn(docLabel);
                                                                        const files = entry.data.documents[dk] || [];
                                                                        const isOptional = docLabel.toLowerCase().startsWith('other');
                                                                        return (
                                                                            <div key={dk} className={`dme-doc-slot ${!isOptional && files.length === 0 ? 'dme-doc-slot--missing' : ''}`}>
                                                                                <label className="dme-doc-slot__label">
                                                                                    {docLabel}{!isOptional && <span className="dme-required"> *</span>}
                                                                                    {isOptional && <span className="dme-doc-slot__optional"> (Optional)</span>}
                                                                                </label>
                                                                                <div className="dme-doc-slot__upload">
                                                                                    <input
                                                                                        type="file"
                                                                                        multiple
                                                                                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                                                                        onChange={(e) => addDocFile(idx, dk, Array.from(e.target.files))}
                                                                                    />
                                                                                    <span className="dme-doc-slot__hint">Accepted: .pdf, .docx</span>
                                                                                </div>
                                                                                {files.length > 0 && (
                                                                                    <ul className="dme-doc-slot__files">
                                                                                        {files.map((f, fi) => (
                                                                                            <li key={fi}>
                                                                                                <div className="dme-doc-name"><FileText size={12} /> {f.name}</div>
                                                                                                <button onClick={() => removeDocFile(idx, dk, fi)}><X size={12} /></button>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Complete */}
                    {step === 3 && (
                        <div className="dme-step-content dme-step-content--scrollable">
                            <div className="dme-step-complete">
                                <CheckCircle2 size={64} className="dme-complete-icon" />
                                <h3>Success! {saveResult?.inserted_count || entries.length} Entries Generated</h3>
                                <p>All activities have been saved as drafts. You can now submit them for review.</p>
                                
                                {saveResult?.warnings?.length > 0 && (
                                    <div className="dme-complete-warnings">
                                        <div className="dme-warning-title">
                                            <AlertCircle size={14} />
                                            <span>Note: {saveResult.warnings.length} potential duplicates were detected but saved anyway.</span>
                                        </div>
                                        <ul className="dme-warning-list">
                                            {saveResult.warnings.slice(0, 5).map((w, i) => (
                                                <li key={i}>Entry {w.row}: {w.message}</li>
                                            ))}
                                            {saveResult.warnings.length > 5 && <li>...and {saveResult.warnings.length - 5} more</li>}
                                        </ul>
                                    </div>
                                )}

                                <button className="dme-btn dme-btn--primary" style={{ marginTop: '2rem' }} onClick={handleFinish}>View My Entries</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="dme-modal__footer">
                    {step < 3 && (
                        <button className="dme-btn dme-btn--secondary" onClick={() => step === 0 ? onClose() : setStep(step - 1)}>
                            {step === 0 ? 'Cancel' : 'Back'}
                        </button>
                    )}
                    {step < 2 && (
                        <button className="dme-btn dme-btn--primary" onClick={() => setStep(step + 1)}>
                            Continue <ChevronRight size={18} />
                        </button>
                    )}
                    {step === 2 && (
                        <button className="dme-btn dme-btn--primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? <><Loader2 size={18} className="dme-spinner" /> Saving...</> : `Confirm & Save ${entries.length} Entries`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DynamicMultiEntryModal;
