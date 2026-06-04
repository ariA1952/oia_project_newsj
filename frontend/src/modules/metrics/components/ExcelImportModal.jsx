import { useState, useRef, useCallback } from 'react';
import {
    X, Upload, Download, FileSpreadsheet, CheckCircle2,
    AlertCircle, Loader2, FileText, ChevronRight, Trash2,
} from 'lucide-react';
import apiClient from '../services/metricsService';
import './ExcelImportModal.css';

const STEPS = ['Upload', 'Validate', 'Documents', 'Complete'];

const ExcelImportModal = ({
    parameterId,
    parameterName,
    academicYearId,
    campusId,
    departmentId,
    documents = [],
    onClose,
    onComplete,
}) => {
    const [step, setStep] = useState(0);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [saveResult, setSaveResult] = useState(null);
    const [error, setError] = useState(null);

    // Document upload state for post-save
    const [docUploads, setDocUploads] = useState({}); // { activityId: { docType: File[] } }
    const [docUploadProgress, setDocUploadProgress] = useState({});

    const fileInputRef = useRef(null);

    // ── Step 0: Upload ──
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
            setFile(f);
            setError(null);
        } else {
            setError('Only .xlsx and .xls files are accepted');
        }
    }, []);

    const handleFileSelect = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setError(null);
        }
    };

    const downloadTemplate = async () => {
        try {
            const response = await apiClient.get(`/bulk/template/${parameterId}`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `template_${parameterName || 'bulk'}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download template');
        }
    };

    // ── Step 1: Validate ──
    const handleValidate = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('parameter_id', parameterId);
            formData.append('erp_academic_year_id', academicYearId);

            const response = await apiClient.post('/bulk/validate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setValidationResult(response.data);
            setStep(1);
        } catch (err) {
            setError(err.response?.data?.detail || 'Validation failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Save validated rows ──
    const handleSave = async () => {
        if (!validationResult) return;
        setLoading(true);
        setError(null);
        try {
            const validRows = validationResult.preview
                .filter((r) => r._valid)
                .map(({ _row_num, _valid, _errors, ...row }) => row);

            const response = await apiClient.post('/bulk/save', {
                parameter_id: parameterId,
                erp_academic_year_id: parseInt(academicYearId),
                campus_id: campusId ? parseInt(campusId) : null,
                department_id: departmentId ? parseInt(departmentId) : null,
                rows: validRows,
            });
            setSaveResult(response.data);
            // If documents are needed, go to doc upload step
            if (documents.length > 0 && response.data.activity_ids.length > 0) {
                setStep(2);
            } else {
                setStep(3);
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Save failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Document Upload ──
    const handleDocFile = (activityId, docType, files) => {
        setDocUploads((prev) => ({
            ...prev,
            [activityId]: {
                ...(prev[activityId] || {}),
                [docType]: [...((prev[activityId] || {})[docType] || []), ...files],
            },
        }));
    };

    const removeDocFile = (activityId, docType, idx) => {
        setDocUploads((prev) => {
            const updated = { ...prev };
            const list = [...((updated[activityId] || {})[docType] || [])];
            list.splice(idx, 1);
            updated[activityId] = { ...(updated[activityId] || {}), [docType]: list };
            return updated;
        });
    };

    const docKey = (label) =>
        label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    const uploadAllDocuments = async () => {
        setLoading(true);
        setError(null);
        const total = Object.values(docUploads).reduce(
            (sum, docs) => sum + Object.values(docs).reduce((s, files) => s + files.length, 0), 0
        );
        let uploaded = 0;

        try {
            for (const [activityId, docs] of Object.entries(docUploads)) {
                for (const [dt, files] of Object.entries(docs)) {
                    for (const f of files) {
                        const fd = new FormData();
                        fd.append('doc_type', dt);
                        fd.append('row_index', '0');
                        fd.append('file', f);
                        await apiClient.post(`/bulk/upload-documents/${activityId}`, fd, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        uploaded++;
                        setDocUploadProgress({ uploaded, total });
                    }
                }
            }
            setStep(3);
        } catch (err) {
            setError(`Document upload failed: ${err.response?.data?.detail || err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const skipDocuments = () => setStep(3);

    // ── Step 3: Complete ──
    const handleFinish = () => {
        onComplete && onComplete();
        onClose();
    };

    // Download error report as CSV
    const downloadErrorReport = () => {
        if (!validationResult?.errors?.length) return;
        const lines = ['Row,Field,Message'];
        validationResult.errors.forEach((e) => {
            lines.push(`${e.row},"${e.field}","${e.message}"`);
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'validation_errors.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="excel-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="excel-modal">
                {/* Header */}
                <div className="excel-modal__header">
                    <div className="excel-modal__header-left">
                        <FileSpreadsheet size={22} />
                        <h2>Import Excel — {parameterName || 'Bulk Import'}</h2>
                    </div>
                    <button className="excel-modal__close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Step Indicator */}
                <div className="excel-modal__steps">
                    {STEPS.map((s, i) => (
                        <div key={s} className={`excel-modal__step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                            <span className="excel-modal__step-num">{i < step ? '✓' : i + 1}</span>
                            <span className="excel-modal__step-label">{s}</span>
                            {i < STEPS.length - 1 && <ChevronRight size={14} className="excel-modal__step-arrow" />}
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="excel-modal__body">
                    {error && (
                        <div className="excel-modal__error">
                            <AlertCircle size={16} /> {typeof error === 'string' ? error : JSON.stringify(error)}
                        </div>
                    )}

                    {/* ── Step 0: Upload ── */}
                    {step === 0 && (
                        <div className="excel-modal__upload-step">
                            <div
                                className={`excel-modal__dropzone ${dragOver ? 'excel-modal__dropzone--active' : ''} ${file ? 'excel-modal__dropzone--has-file' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                {file ? (
                                    <div className="excel-modal__file-info">
                                        <FileSpreadsheet size={32} className="excel-modal__file-icon" />
                                        <span className="excel-modal__file-name">{file.name}</span>
                                        <span className="excel-modal__file-size">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </span>
                                        <button
                                            className="excel-modal__file-remove"
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        >
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="excel-modal__dropzone-content">
                                        <Upload size={40} className="excel-modal__dropzone-icon" />
                                        <p className="excel-modal__dropzone-text">
                                            Drag & drop your Excel file here
                                        </p>
                                        <p className="excel-modal__dropzone-hint">
                                            or click to browse • .xlsx, .xls accepted
                                        </p>
                                    </div>
                                )}
                            </div>

                            <button className="excel-modal__template-btn" onClick={downloadTemplate}>
                                <Download size={16} /> Download Template
                            </button>
                        </div>
                    )}

                    {/* ── Step 1: Validation ── */}
                    {step === 1 && validationResult && (
                        <div className="excel-modal__validate-step">
                            {/* Summary Cards */}
                            <div className="excel-modal__summary">
                                <div className="excel-modal__summary-card">
                                    <span className="excel-modal__summary-value">{validationResult.total_rows}</span>
                                    <span className="excel-modal__summary-label">Total Rows</span>
                                </div>
                                <div className="excel-modal__summary-card excel-modal__summary-card--success">
                                    <span className="excel-modal__summary-value">{validationResult.valid_rows}</span>
                                    <span className="excel-modal__summary-label">Valid</span>
                                </div>
                                <div className="excel-modal__summary-card excel-modal__summary-card--error">
                                    <span className="excel-modal__summary-value">{validationResult.failed_rows}</span>
                                    <span className="excel-modal__summary-label">Failed</span>
                                </div>
                                <div className="excel-modal__summary-card excel-modal__summary-card--warning">
                                    <span className="excel-modal__summary-value">{validationResult.duplicates}</span>
                                    <span className="excel-modal__summary-label">Duplicates</span>
                                </div>
                            </div>

                            {/* Error Details */}
                            {validationResult.errors.length > 0 && (
                                <div className="excel-modal__error-section">
                                    <div className="excel-modal__error-header">
                                        <h4><AlertCircle size={16} /> Validation Errors ({validationResult.errors.length})</h4>
                                        <button className="excel-modal__error-download" onClick={downloadErrorReport}>
                                            <Download size={14} /> Download Error Report
                                        </button>
                                    </div>
                                    <div className="excel-modal__error-table-wrapper">
                                        <table className="excel-modal__error-table">
                                            <thead>
                                                <tr><th>Row</th><th>Field</th><th>Error</th></tr>
                                            </thead>
                                            <tbody>
                                                {validationResult.errors.slice(0, 50).map((e, i) => (
                                                    <tr key={i}>
                                                        <td>{e.row}</td>
                                                        <td>{e.field}</td>
                                                        <td>{e.message}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Preview Table */}
                            {validationResult.preview.length > 0 && (
                                <div className="excel-modal__preview">
                                    <h4>Data Preview</h4>
                                    <div className="excel-modal__preview-table-wrapper">
                                        <table className="excel-modal__preview-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Status</th>
                                                    {Object.keys(validationResult.preview[0])
                                                        .filter((k) => !k.startsWith('_'))
                                                        .map((k) => <th key={k}>{k}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {validationResult.preview.map((row, i) => (
                                                    <tr key={i} className={row._valid ? '' : 'excel-modal__row--invalid'}>
                                                        <td>{row._row_num}</td>
                                                        <td>
                                                            {row._valid ? (
                                                                <CheckCircle2 size={16} className="excel-modal__icon--valid" />
                                                            ) : (
                                                                <AlertCircle size={16} className="excel-modal__icon--invalid" />
                                                            )}
                                                        </td>
                                                        {Object.entries(row)
                                                            .filter(([k]) => !k.startsWith('_'))
                                                            .map(([k, v]) => (
                                                                <td key={k} title={String(v)}>{String(v).substring(0, 40)}</td>
                                                            ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 2: Document Upload ── */}
                    {step === 2 && saveResult && (
                        <div className="excel-modal__docs-step">
                            <p className="excel-modal__docs-intro">
                                <CheckCircle2 size={18} className="excel-modal__icon--valid" />
                                <strong>{saveResult.inserted_count} entries saved as drafts.</strong> Now upload required documents for each entry.
                            </p>

                            {docUploadProgress.total > 0 && (
                                <div className="excel-modal__doc-progress">
                                    Uploading {docUploadProgress.uploaded} / {docUploadProgress.total} files...
                                </div>
                            )}

                            <div className="excel-modal__docs-list">
                                {saveResult.activity_ids.map((actId, idx) => (
                                    <div key={actId} className="excel-modal__doc-card">
                                        <div className="excel-modal__doc-card-header">
                                            Entry {idx + 1} — Activity #{actId}
                                        </div>
                                        <div className="excel-modal__doc-card-body">
                                            {documents.map((docLabel) => {
                                                const dk = docKey(docLabel);
                                                const files = (docUploads[actId] || {})[dk] || [];
                                                return (
                                                    <div key={dk} className="excel-modal__doc-slot">
                                                        <label className="excel-modal__doc-label">{docLabel}</label>
                                                        <div className="excel-modal__doc-upload-area">
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                multiple
                                                                onChange={(e) => handleDocFile(actId, dk, Array.from(e.target.files))}
                                                            />
                                                        </div>
                                                        {files.length > 0 && (
                                                            <ul className="excel-modal__doc-file-list">
                                                                {files.map((f, fi) => (
                                                                    <li key={fi}>
                                                                        <FileText size={12} /> {f.name}
                                                                        <button onClick={() => removeDocFile(actId, dk, fi)}><X size={12} /></button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {/* Other Document (optional) */}
                                            <div className="excel-modal__doc-slot excel-modal__doc-slot--other">
                                                <label className="excel-modal__doc-label">Other Document (Optional)</label>
                                                <input
                                                    type="text"
                                                    className="excel-modal__other-doc-title"
                                                    placeholder="Document title..."
                                                    onChange={(e) => {
                                                        const title = e.target.value;
                                                        setDocUploads(prev => ({
                                                            ...prev,
                                                            [actId]: { ...(prev[actId] || {}), _other_title: title }
                                                        }));
                                                    }}
                                                />
                                                <div className="excel-modal__doc-upload-area">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                        multiple
                                                        onChange={(e) => handleDocFile(actId, 'other_document', Array.from(e.target.files))}
                                                    />
                                                </div>
                                                {((docUploads[actId] || {})['other_document'] || []).length > 0 && (
                                                    <ul className="excel-modal__doc-file-list">
                                                        {((docUploads[actId] || {})['other_document'] || []).map((f, fi) => (
                                                            <li key={fi}>
                                                                <FileText size={12} /> {f.name}
                                                                <button onClick={() => removeDocFile(actId, 'other_document', fi)}><X size={12} /></button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Complete ── */}
                    {step === 3 && (
                        <div className="excel-modal__complete-step">
                            <CheckCircle2 size={56} className="excel-modal__complete-icon" />
                            <h3>Import Complete!</h3>
                            <p>
                                {saveResult
                                    ? `${saveResult.inserted_count} entries have been created as drafts.`
                                    : 'Import completed successfully.'}
                            </p>
                            <p className="excel-modal__complete-hint">
                                You can review and submit them for approval from the Data Entry page.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="excel-modal__footer">
                    {step === 0 && (
                        <>
                            <button className="excel-modal__btn excel-modal__btn--secondary" onClick={onClose}>Cancel</button>
                            <button
                                className="excel-modal__btn excel-modal__btn--primary"
                                onClick={handleValidate}
                                disabled={!file || loading}
                            >
                                {loading ? <><Loader2 size={16} className="excel-modal__spinner" /> Validating...</> : 'Validate & Preview'}
                            </button>
                        </>
                    )}
                    {step === 1 && (
                        <>
                            <button className="excel-modal__btn excel-modal__btn--secondary" onClick={() => { setStep(0); setValidationResult(null); }}>
                                ← Back
                            </button>
                            <button
                                className="excel-modal__btn excel-modal__btn--primary"
                                onClick={handleSave}
                                disabled={!validationResult?.valid_rows || loading}
                            >
                                {loading ? <><Loader2 size={16} className="excel-modal__spinner" /> Saving...</> : `Confirm Save (${validationResult?.valid_rows || 0} rows)`}
                            </button>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <button className="excel-modal__btn excel-modal__btn--secondary" onClick={skipDocuments}>
                                Skip — Upload Later
                            </button>
                            <button
                                className="excel-modal__btn excel-modal__btn--primary"
                                onClick={uploadAllDocuments}
                                disabled={loading}
                            >
                                {loading ? <><Loader2 size={16} className="excel-modal__spinner" /> Uploading...</> : 'Upload Documents'}
                            </button>
                        </>
                    )}
                    {step === 3 && (
                        <button className="excel-modal__btn excel-modal__btn--primary" onClick={handleFinish}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExcelImportModal;
