import { useState, useRef } from 'react';
import { X, Building2, Upload, FileText, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { suggestPartnerUniversity } from '../services/metricsService';
import './SuggestUniversityModal.css';

/**
 * SuggestUniversityModal
 *
 * Props:
 *   onClose()            – close the modal
 *   onSuccess(newUni)    – called with the returned university object on success
 */
const SuggestUniversityModal = ({ onClose, onSuccess }) => {
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        university_name: '',
        university_code: '',
        country: '',
        website: '',
    });
    const [hasMOU, setHasMOU]       = useState(false);
    const [document, setDocument]   = useState(null);
    const [errors, setErrors]       = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading]     = useState(false);
    const [success, setSuccess]     = useState(false);

    // Auto-generate university code from name (first 6 letters uppercase)
    const handleNameChange = (e) => {
        const name = e.target.value;
        setForm((prev) => ({
            ...prev,
            university_name: name,
            university_code: prev.university_code
                ? prev.university_code
                : name.replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase(),
        }));
        if (errors.university_name) setErrors((p) => ({ ...p, university_name: '' }));
    };

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        setDocument(file);
    };

    const validate = () => {
        const errs = {};
        if (!form.university_name.trim())  errs.university_name = 'University name is required';
        if (!form.university_code.trim())  errs.university_code = 'Code is required';
        if (!document)                     errs.document = 'Please upload a supporting document';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        setServerError('');
        if (!validate()) return;

        setLoading(true);
        try {
            const result = await suggestPartnerUniversity({
                university_name: form.university_name.trim(),
                university_code: form.university_code.trim(),
                country: form.country.trim() || undefined,
                website: form.website.trim() || undefined,
                has_mou_at_submission: hasMOU,
                document,
            });
            setSuccess(true);
            if (onSuccess) onSuccess(result);
        } catch (err) {
            setServerError(
                typeof err === 'string'
                    ? err
                    : err?.detail || 'Something went wrong. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    // ── Backdrop click to close (only when not loading) ──────────────────────
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) onClose();
    };

    return (
        <div className="suggest-modal-overlay" onMouseDown={handleOverlayClick}>
            <div className="suggest-modal" role="dialog" aria-modal="true">

                {/* ── Success State ──────────────────────────────────────── */}
                {success ? (
                    <div className="suggest-modal__success">
                        <div className="suggest-modal__success-icon">
                            <CheckCircle2 size={28} />
                        </div>
                        <h3>University Suggested!</h3>
                        <p>
                            <strong>{form.university_name}</strong> has been submitted for OIA Admin review.
                            Once approved, it will appear in the university dropdown for everyone.
                        </p>
                        <button className="suggest-modal__success-close" onClick={onClose}>
                            Got it
                        </button>
                    </div>
                ) : (
                    <>
                        {/* ── Header ──────────────────────────────────────── */}
                        <div className="suggest-modal__header">
                            <div className="suggest-modal__header-left">
                                <div className="suggest-modal__header-icon">
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <h2 className="suggest-modal__title">Suggest a University</h2>
                                    <p className="suggest-modal__subtitle">
                                        Submit for OIA Admin review
                                    </p>
                                </div>
                            </div>
                            <button
                                className="suggest-modal__close"
                                onClick={onClose}
                                disabled={loading}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* ── Body ────────────────────────────────────────── */}
                        <div className="suggest-modal__body">

                            {/* Row 1: Name + Code */}
                            <div className="suggest-modal__row">
                                <div className="suggest-modal__field">
                                    <label className="suggest-modal__label">
                                        University Name <span>*</span>
                                    </label>
                                    <input
                                        className={`suggest-modal__input ${errors.university_name ? 'suggest-modal__input--error' : ''}`}
                                        type="text"
                                        placeholder="e.g. University of Oxford"
                                        value={form.university_name}
                                        onChange={handleNameChange}
                                        disabled={loading}
                                    />
                                    {errors.university_name && (
                                        <span className="suggest-modal__error-text">{errors.university_name}</span>
                                    )}
                                </div>

                                <div className="suggest-modal__field">
                                    <label className="suggest-modal__label">
                                        University Code <span>*</span>
                                    </label>
                                    <input
                                        className={`suggest-modal__input ${errors.university_code ? 'suggest-modal__input--error' : ''}`}
                                        type="text"
                                        placeholder="e.g. OXF001"
                                        value={form.university_code}
                                        onChange={(e) => handleChange('university_code', e.target.value.toUpperCase())}
                                        disabled={loading}
                                        maxLength={10}
                                    />
                                    {errors.university_code ? (
                                        <span className="suggest-modal__error-text">{errors.university_code}</span>
                                    ) : (
                                        <span className="suggest-modal__code-hint">Auto-filled from name</span>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Country + Website */}
                            <div className="suggest-modal__row">
                                <div className="suggest-modal__field">
                                    <label className="suggest-modal__label">Country</label>
                                    <input
                                        className="suggest-modal__input"
                                        type="text"
                                        placeholder="e.g. United Kingdom"
                                        value={form.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="suggest-modal__field">
                                    <label className="suggest-modal__label">Website</label>
                                    <input
                                        className="suggest-modal__input"
                                        type="url"
                                        placeholder="https://..."
                                        value={form.website}
                                        onChange={(e) => handleChange('website', e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* MOU / Document section */}
                            <div className="suggest-modal__mou-section">
                                <label className="suggest-modal__checkbox-row">
                                    <input
                                        type="checkbox"
                                        className="suggest-modal__checkbox"
                                        checked={hasMOU}
                                        onChange={(e) => setHasMOU(e.target.checked)}
                                        disabled={loading}
                                    />
                                    <span className="suggest-modal__checkbox-label">
                                        A formal MOU exists for this university
                                    </span>
                                </label>

                                <p className="suggest-modal__checkbox-desc">
                                    {hasMOU
                                        ? 'Upload the signed MOU document below. An official MOU record will be created on approval.'
                                        : 'No MOU yet? Upload any supporting agreement (email, letter of intent, etc.).'}
                                </p>

                                {/* Upload area */}
                                <div className="suggest-modal__upload-area">
                                    <span className="suggest-modal__upload-label-text">
                                        {hasMOU ? 'Upload MOU Document *' : 'Upload Supporting Agreement *'}
                                    </span>

                                    {document ? (
                                        <div className="suggest-modal__file-preview">
                                            <FileText size={14} />
                                            <span title={document.name}>{document.name}</span>
                                            <button
                                                type="button"
                                                className="suggest-modal__file-remove"
                                                onClick={() => { setDocument(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                disabled={loading}
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="suggest-modal__upload-btn">
                                            <Upload size={14} />
                                            Choose file (.pdf, .doc, .docx, .jpg, .png)
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                className="suggest-modal__file-input"
                                                onChange={handleFileChange}
                                                disabled={loading}
                                            />
                                        </label>
                                    )}
                                    {errors.document && (
                                        <span className="suggest-modal__error-text">{errors.document}</span>
                                    )}
                                </div>
                            </div>

                            {/* Info note */}
                            <div className="suggest-modal__info-note">
                                <Info size={14} />
                                <span>
                                    This university will be <strong>pending OIA Admin review</strong> and
                                    will appear in the dropdown for all users only after approval.
                                </span>
                            </div>

                            {/* Server error */}
                            {serverError && (
                                <div className="suggest-modal__error-banner">
                                    <AlertCircle size={14} />
                                    {serverError}
                                </div>
                            )}
                        </div>

                        {/* ── Footer ──────────────────────────────────────── */}
                        <div className="suggest-modal__footer">
                            <button
                                type="button"
                                className="suggest-modal__btn suggest-modal__btn--secondary"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="suggest-modal__btn suggest-modal__btn--primary"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Submitting…' : 'Submit Suggestion'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SuggestUniversityModal;
