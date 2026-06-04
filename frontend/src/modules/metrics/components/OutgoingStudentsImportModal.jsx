import { useState, useRef, useCallback } from 'react';
import {
    X, Upload, Download, FileSpreadsheet, CheckCircle2,
    AlertCircle, Loader2, FileArchive, Trash2, ChevronRight
} from 'lucide-react';
import apiClient from '../services/metricsService';
import './OutgoingStudentsImportModal.css';

const STEPS = ['Upload', 'Validate', 'Complete'];

const OutgoingStudentsImportModal = ({
    parameterId,
    parameterName,
    academicYearId,
    campusId,
    departmentId,
    onClose,
    onComplete,
}) => {
    const [step, setStep] = useState(0);
    const [excelFile, setExcelFile] = useState(null);
    const [zipFile, setZipFile] = useState(null);
    
    const [dragOverExcel, setDragOverExcel] = useState(false);
    const [dragOverZip, setDragOverZip] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    const [saveResult, setSaveResult] = useState(null);
    const [error, setError] = useState(null);

    const excelInputRef = useRef(null);
    const zipInputRef = useRef(null);

    // ── Step 0: Upload ──
    const handleExcelDrop = useCallback((e) => {
        e.preventDefault();
        setDragOverExcel(false);
        const f = e.dataTransfer.files[0];
        if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
            setExcelFile(f);
            setError(null);
        } else {
            setError('Only .xlsx and .xls files are accepted for data upload');
        }
    }, []);

    const handleZipDrop = useCallback((e) => {
        e.preventDefault();
        setDragOverZip(false);
        const f = e.dataTransfer.files[0];
        if (f && f.name.endsWith('.zip')) {
            setZipFile(f);
            setError(null);
        } else {
            setError('Only .zip files are accepted for supporting documents');
        }
    }, []);

    const downloadTemplate = async () => {
        try {
            const response = await apiClient.get(`/bulk/outgoing-students-template/${parameterId}`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `template_${parameterName || 'outgoing_students'}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download specialized template');
        }
    };

    // ── Step 1: Validate ──
    const handleValidate = async () => {
        if (!excelFile) return;
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('excel_file', excelFile);
            if (zipFile) {
                formData.append('zip_file', zipFile);
            }
            formData.append('parameter_id', parameterId);
            formData.append('erp_academic_year_id', academicYearId);

            const response = await apiClient.post('/bulk/validate-outgoing-students', formData, {
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

    // ── Save validated rows + docs ──
    const handleSave = async () => {
        if (!validationResult) return;
        setLoading(true);
        setError(null);
        try {
            // Include all valid rows — both clean and duplicate-warned
            const validRows = validationResult.preview
                .filter((r) => r._valid)
                .map(({ _row_num, _valid, _errors, _warnings, file_status, ...row }) => row);

            const formData = new FormData();
            formData.append('parameter_id', parameterId);
            formData.append('erp_academic_year_id', academicYearId);
            if (campusId) formData.append('campus_id', campusId);
            if (departmentId) formData.append('department_id', departmentId);

            formData.append('rows', JSON.stringify(validRows));

            if (zipFile) {
                formData.append('zip_file', zipFile);
            }

            const response = await apiClient.post('/bulk/save-outgoing-students', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSaveResult(response.data);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.detail || 'Save failed');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 3: Complete ──
    const handleFinish = () => {
        onComplete && onComplete();
        onClose();
    };

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
                        <h2>Advanced Import — {parameterName}</h2>
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
                            <div className="os-modal__upload-grid">
                                {/* Excel Upload */}
                                <div
                                    className={`os-modal__dropzone ${dragOverExcel ? 'os-modal__dropzone--active' : ''} ${excelFile ? 'os-modal__dropzone--has-file' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverExcel(true); }}
                                    onDragLeave={() => setDragOverExcel(false)}
                                    onDrop={handleExcelDrop}
                                    onClick={() => excelInputRef.current?.click()}
                                >
                                    <input
                                        ref={excelInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={(e) => setExcelFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                    />
                                    {excelFile ? (
                                        <div className="excel-modal__file-info">
                                            <FileSpreadsheet size={32} className="excel-modal__file-icon" />
                                            <span className="excel-modal__file-name">{excelFile.name}</span>
                                            <span className="excel-modal__file-size">{(excelFile.size / 1024).toFixed(1)} KB</span>
                                            <button className="excel-modal__file-remove" onClick={(e) => { e.stopPropagation(); setExcelFile(null); }}>
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="excel-modal__dropzone-content">
                                            <div className="os-modal__dropzone-title">1. Data Sheet (Excel)</div>
                                            <Upload size={32} className="excel-modal__dropzone-icon" />
                                            <p className="excel-modal__dropzone-hint">Drag & drop .xlsx file</p>
                                        </div>
                                    )}
                                </div>

                                {/* ZIP Upload */}
                                <div
                                    className={`os-modal__dropzone ${dragOverZip ? 'os-modal__dropzone--active' : ''} ${zipFile ? 'os-modal__dropzone--has-file' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverZip(true); }}
                                    onDragLeave={() => setDragOverZip(false)}
                                    onDrop={handleZipDrop}
                                    onClick={() => zipInputRef.current?.click()}
                                >
                                    <input
                                        ref={zipInputRef}
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => setZipFile(e.target.files[0])}
                                        style={{ display: 'none' }}
                                    />
                                    {zipFile ? (
                                        <div className="excel-modal__file-info">
                                            <FileArchive size={32} className="excel-modal__file-icon" style={{ color: '#0ea5e9' }} />
                                            <span className="excel-modal__file-name">{zipFile.name}</span>
                                            <span className="excel-modal__file-size">{(zipFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                            <button className="excel-modal__file-remove" onClick={(e) => { e.stopPropagation(); setZipFile(null); }}>
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="excel-modal__dropzone-content">
                                            <div className="os-modal__dropzone-title">2. Documents (ZIP) - Optional</div>
                                            <Upload size={32} className="excel-modal__dropzone-icon" />
                                            <p className="excel-modal__dropzone-hint">Drag & drop .zip containing PDFs</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button className="excel-modal__template-btn" onClick={downloadTemplate}>
                                <Download size={16} /> Download Specialized Template
                            </button>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', marginTop: '-10px' }}>
                                Template contains drop-down lists for Universities, Countries, Purpose, etc.
                            </p>
                        </div>
                    )}

                    {/* ── Step 1: Validation ── */}
                    {step === 1 && validationResult && (
                        <div className="excel-modal__validate-step">
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
                                <div className="excel-modal__summary-card" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
                                    <span className="excel-modal__summary-value" style={{ color: '#0284c7' }}>{validationResult.matched_files || 0}</span>
                                    <span className="excel-modal__summary-label">Files Matched</span>
                                </div>
                            </div>

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
                            {/* Warnings section: duplicate rows */}
                            {validationResult.preview.some((r) => r._warnings?.length > 0) && (
                                <div style={{
                                    margin: '8px 0', padding: '10px 14px',
                                    background: '#fffbeb', border: '1px solid #fde68a',
                                    borderRadius: 8, fontSize: '0.84rem', color: '#92400e',
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                }}>
                                    <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0, color: '#f59e0b' }} />
                                    <div>
                                        <strong>Duplicate Warning:</strong> Some rows appear to already exist in the system (highlighted in yellow).
                                        They will still be imported — please review before submitting for approval.
                                    </div>
                                </div>
                            )}

                            {validationResult.preview.length > 0 && (
                                <div className="excel-modal__preview">
                                    <h4>Data Preview</h4>
                                    <div className="excel-modal__preview-table-wrapper">
                                        <table className="excel-modal__preview-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Status</th>
                                                    <th>File Status</th>
                                                    {Object.keys(validationResult.preview[0])
                                                        .filter((k) => !k.startsWith('_') && k !== 'file_status')
                                                        .map((k) => <th key={k}>{k}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {validationResult.preview.map((row, i) => (
                                                    <tr
                                                        key={i}
                                                        className={
                                                            !row._valid
                                                                ? 'excel-modal__row--invalid'
                                                                : row._warnings?.length > 0
                                                                    ? 'excel-modal__row--warning'
                                                                    : ''
                                                        }
                                                    >
                                                        <td>{row._row_num}</td>
                                                        <td>
                                                            {!row._valid ? (
                                                                <AlertCircle size={16} className="excel-modal__icon--invalid" />
                                                            ) : row._warnings?.length > 0 ? (
                                                                <span title={row._warnings.map(w => w.message).join('; ')}>
                                                                    ⚠️
                                                                </span>
                                                            ) : (
                                                                <CheckCircle2 size={16} className="excel-modal__icon--valid" />
                                                            )}
                                                        </td>
                                                        <td>
                                                            {row.file_status === 'found' ? (
                                                                <span className="os-modal__file-status--found"><CheckCircle2 size={14} /> Found</span>
                                                            ) : row.file_status === 'missing' ? (
                                                                <span className="os-modal__file-status--missing"><AlertCircle size={14} /> Missing in ZIP</span>
                                                            ) : (
                                                                <span className="os-modal__file-status--none">—</span>
                                                            )}
                                                        </td>
                                                        {Object.entries(row)
                                                            .filter(([k]) => !k.startsWith('_') && k !== 'file_status')
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

                    {/* ── Step 2: Complete ── */}
                    {step === 2 && (
                        <div className="excel-modal__complete-step">
                            <CheckCircle2 size={56} className="excel-modal__complete-icon" />
                            <h3>Import Complete!</h3>
                            <p>
                                {saveResult
                                    ? `${saveResult.inserted_count} entries have been created as drafts.`
                                    : 'Import completed successfully.'}
                            </p>
                            {saveResult?.files_saved > 0 && (
                                <p style={{ color: '#059669', fontWeight: 600 }}>
                                    ✓ {saveResult.files_saved} supporting documents attached.
                                </p>
                            )}
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
                                disabled={!excelFile || loading}
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
                        <button className="excel-modal__btn excel-modal__btn--primary" onClick={handleFinish}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OutgoingStudentsImportModal;
