import { useState, useEffect, useRef } from 'react';
import { AlertCircle, FileText, ExternalLink, Upload, X } from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import { useAuth } from '../../../common/AuthContext';
import { downloadActivityDocument } from '../services/metricsService';
import './ParameterRow.css';

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
    hasSubmittedSibling = false,
}) => {
    const { user } = useAuth();
    const isHOD = ['HOD', 'COORDINATOR'].includes(user?.erp_users_type);
    const fileInputRef = useRef(null);

    const [isEditing, setIsEditing] = useState(!existingData);
    const [formData, setFormData] = useState({
        activity_title: existingData?.activity_title || '',
        numeric_value: existingData?.numeric_value || '',
        university_id: existingData?.university_id || '',
        start_date: existingData?.start_date || '',
        end_date: existingData?.end_date || '',
        activity_data: existingData?.activity_data?.remarks || '',
        document: null,          // File object for new upload
    });
    const [errors, setErrors] = useState({});

    // Sync state when props change (new context selected, activity updated)
    useEffect(() => {
        setFormData({
            activity_title: existingData?.activity_title || '',
            numeric_value: existingData?.numeric_value || '',
            university_id: existingData?.university_id || '',
            start_date: existingData?.start_date || '',
            end_date: existingData?.end_date || '',
            activity_data: existingData?.activity_data?.remarks || '',
            document: null,
        });
        setIsEditing(!existingData);
        setErrors({});
    }, [existingData]);

    const isSubmitted = existingData?.status === 'SUBMITTED';
    const isApproved = existingData?.status === 'APPROVED';
    const isRejected = existingData?.status === 'REJECTED';
    const isClarificationRequested = existingData?.status === 'CLARIFICATION_REQUESTED';
    const isDraft = existingData?.status === 'DRAFT' || !existingData;
    // DRAFT, REJECTED, or CLARIFICATION_REQUESTED are all editable (by faculty)
    const isEditable = (isDraft || isRejected || isClarificationRequested) && !isHOD;

    const validate = () => {
        const newErrors = {};
        const numVal = formData.numeric_value;
        if (numVal === '' || numVal === null || numVal === undefined) {
            newErrors.numeric_value = 'Numeric value is required';
        } else {
            const parsed = parseFloat(numVal);
            if (isNaN(parsed)) {
                newErrors.numeric_value = 'Value must be a valid number';
            } else if (parsed < 0) {
                newErrors.numeric_value = 'Value cannot be negative';
            }
        }
        if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
            newErrors.end_date = 'End date must be after start date';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Block non-numeric keystrokes (e, E, +, -) on the number input
    const handleNumericKeyDown = (e) => {
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    };

    // Strip any non-numeric characters (except a single decimal point) on change
    const handleNumericChange = (e) => {
        const raw = e.target.value;
        // Allow digits and at most one decimal point; block everything else
        const clean = raw.replace(/[^0-9.]/g, '').replace(/(\..*?)\./g, '$1');
        setFormData(prev => ({ ...prev, numeric_value: clean }));
    };

    // Open document via authenticated fetch → Blob URL
    const handleViewDocument = async () => {
        if (!existingData?.activity_id) return;
        try {
            const blobUrl = await downloadActivityDocument(existingData.activity_id);
            window.open(blobUrl, '_blank');
        } catch {
            alert('Failed to load document. Please try again.');
        }
    };

    const handleSave = () => {
        if (!validate()) return;

        const payload = {
            parameter_id: parameter.parameter_id,
            numeric_value: parseFloat(formData.numeric_value),
            university_id: formData.university_id ? parseInt(formData.university_id) : null,
            activity_title: formData.activity_title || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            activity_data: formData.activity_data ? { remarks: formData.activity_data } : null,
            document: formData.document || null,
        };

        onSave(payload);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (existingData) {
            setFormData({
                activity_title: existingData.activity_title || '',
                numeric_value: existingData.numeric_value || '',
                university_id: existingData.university_id || '',
                start_date: existingData.start_date || '',
                end_date: existingData.end_date || '',
                activity_data: existingData.activity_data?.remarks || '',
                document: null,
            });
            setIsEditing(false);
        }
        setErrors({});
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0] || null;
        setFormData(prev => ({ ...prev, document: file }));
    };

    const handleRemoveFile = () => {
        setFormData(prev => ({ ...prev, document: null }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const statusClass = existingData?.status?.toLowerCase().replace('_', '-') || 'none';

    return (
        <div className={`parameter-row ${disabled && !isEditing ? 'parameter-row--disabled' : ''}`}>

            {/* ── Parameter Name ─────────────────────────────────── */}
            <div className="parameter-row__name">
                {parameter.parameter_name || parameter.parameter_code}
                {parameter.parameter_code && (
                    <span className="parameter-row__code">{parameter.parameter_code}</span>
                )}
            </div>

            {/* ── Editable Fields ────────────────────────────────── */}
            <div className="parameter-row__fields">
                {/* Activity Title */}
                <div className="parameter-row__field">
                    <label className="parameter-row__label">Title</label>
                    <input
                        type="text"
                        className="parameter-row__input-text"
                        placeholder="Activity title"
                        value={formData.activity_title}
                        onChange={(e) => setFormData(prev => ({ ...prev, activity_title: e.target.value }))}
                        disabled={!isEditing || !isEditable || disabled}
                    />
                </div>

                {/* Numeric Value */}
                <div className="parameter-row__field">
                    <label className="parameter-row__label">Value *</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        className={`parameter-row__input-number ${errors.numeric_value ? 'input-error' : ''}`}
                        placeholder="0"
                        value={formData.numeric_value}
                        onChange={handleNumericChange}
                        onKeyDown={handleNumericKeyDown}
                        disabled={!isEditing || !isEditable || disabled}
                    />
                    {errors.numeric_value && (
                        <span className="parameter-row__error">{errors.numeric_value}</span>
                    )}
                </div>

                {/* Partner University */}
                <div className="parameter-row__field">
                    <label className="parameter-row__label">Partner University</label>
                    <select
                        className="parameter-row__select"
                        value={formData.university_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, university_id: e.target.value }))}
                        disabled={!isEditing || !isEditable || disabled}
                    >
                        <option value="">— None —</option>
                        {universities.map((uni) => (
                            <option key={uni.university_id} value={uni.university_id}>
                                {uni.university_name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Start Date */}
                <div className="parameter-row__field">
                    <label className="parameter-row__label">Start Date</label>
                    <input
                        type="date"
                        className="parameter-row__input-date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        disabled={!isEditing || !isEditable || disabled}
                    />
                </div>

                {/* End Date */}
                <div className="parameter-row__field">
                    <label className="parameter-row__label">End Date</label>
                    <input
                        type="date"
                        className={`parameter-row__input-date ${errors.end_date ? 'input-error' : ''}`}
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        disabled={!isEditing || !isEditable || disabled}
                    />
                    {errors.end_date && (
                        <span className="parameter-row__error">{errors.end_date}</span>
                    )}
                </div>

                {/* Remarks / Activity Data */}
                <div className="parameter-row__field parameter-row__field--wide">
                    <label className="parameter-row__label">Remarks / Notes</label>
                    <textarea
                        className="parameter-row__textarea"
                        placeholder="Any additional details or notes..."
                        rows={2}
                        value={formData.activity_data}
                        onChange={(e) => setFormData(prev => ({ ...prev, activity_data: e.target.value }))}
                        disabled={!isEditing || !isEditable || disabled}
                    />
                </div>

                {/* Document Upload (edit mode only, not HOD, not SUBMITTED/APPROVED) */}
                {isEditing && isEditable && !disabled && (
                    <div className="parameter-row__field parameter-row__field--wide">
                        <label className="parameter-row__label">Upload Document (PDF / Word)</label>
                        <div className="parameter-row__file-area">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="parameter-row__file-input"
                                id={`file-${parameter.parameter_id}-${existingData?.activity_id || 'new'}`}
                            />
                            <label
                                htmlFor={`file-${parameter.parameter_id}-${existingData?.activity_id || 'new'}`}
                                className="parameter-row__file-label"
                            >
                                <Upload size={14} />
                                {formData.document ? formData.document.name : 'Choose file…'}
                            </label>
                            {formData.document && (
                                <button
                                    type="button"
                                    className="parameter-row__file-remove"
                                    onClick={handleRemoveFile}
                                    title="Remove file"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Existing Document Link (view mode) — uses auth header via blob fetch */}
                {existingData?.document_path && !isEditing && (
                    <div className="parameter-row__field">
                        <label className="parameter-row__label">Document</label>
                        <button
                            type="button"
                            onClick={handleViewDocument}
                            className="parameter-row__doc-link"
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <FileText size={13} />
                            {existingData.document_path.split('/').pop() || 'View Document'}
                            <ExternalLink size={11} style={{ marginLeft: 4 }} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Status Badge ───────────────────────────────────── */}
            <div className="parameter-row__status">
                {existingData ? (
                    <span className={`status-badge status-badge--${statusClass}`}>
                        {existingData.status}
                    </span>
                ) : (
                    <span className="status-badge status-badge--none">NEW</span>
                )}
            </div>

            {/* ── Clarification Remarks (Faculty sees this) ──────── */}
            {(isRejected || isClarificationRequested) && existingData?.rejection_remarks && (
                <div className={`parameter-row__remarks ${isClarificationRequested ? 'parameter-row__remarks--clarify' : ''}`}>
                    <AlertCircle size={14} />
                    <span>
                        <strong>{isClarificationRequested ? 'Clarification needed:' : 'Reason:'}</strong>{' '}
                        {existingData.rejection_remarks}
                    </span>
                </div>
            )}

            {/* ── Actions ────────────────────────────────────────── */}
            <div className="parameter-row__actions">
                {isEditing && !disabled ? (
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
                ) : (
                    <>
                        {isEditable && !isHOD && (
                            <>
                                <ActionButton variant="primary" onClick={() => setIsEditing(true)}>
                                    {existingData ? 'Edit' : 'Create Activity'}
                                </ActionButton>
                                {existingData && isDraft && (
                                    <ActionButton variant="success" onClick={() => onSubmit(existingData.activity_id)}>
                                        Request Approval
                                    </ActionButton>
                                )}
                                {existingData && isClarificationRequested && (
                                    <ActionButton variant="warning" onClick={() => onSubmit(existingData.activity_id)}>
                                        Resubmit
                                    </ActionButton>
                                )}
                            </>
                        )}
                        {!isEditable && !isHOD && existingData && (
                            <span className="action-label">
                                {isApproved ? 'Approved ✓' : isSubmitted ? 'Awaiting Review' : 'Read Only'}
                            </span>
                        )}
                        {isHOD && (
                            <span className="action-label">View Only</span>
                        )}
                        {isContextSelected && !isHOD && !hasSubmittedSibling && (
                            <ActionButton variant="secondary" onClick={onAdd} title="Add another entry for this parameter">
                                +
                            </ActionButton>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ParameterRow;
