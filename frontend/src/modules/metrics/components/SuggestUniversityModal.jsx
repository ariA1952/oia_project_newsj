import { useState, useRef, useEffect } from 'react';
import { X, Building2, Upload, FileText, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { suggestPartnerUniversity } from '../services/metricsService';
import './SuggestUniversityModal.css';

/**
 * SuggestUniversityModal
 *
 * Props:
 *   onClose()            – close the modal
 *   onSuccess(newUni)    – called with the returned university object on success
 *   existingNames        – array of existing university names (for duplicate check)
 */
const SuggestUniversityModal = ({ onClose, onSuccess, existingNames = [] }) => {
    const fileInputRef = useRef(null);
    const bodyRef = useRef(null);

    const [form, setForm] = useState({
        university_name: '',
        country: '',
        website: '',
    });


    const [errors, setErrors]       = useState({});
    const [serverError, setServerError] = useState('');
    const [loading, setLoading]     = useState(false);
    const [success, setSuccess]     = useState(false);

    // Scroll body to top when modal opens
    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, []);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((p) => ({ ...p, [field]: '' }));
    };



    const isValidUrl = (str) => {
        try { new URL(str); return true; } catch { return false; }
    };

    const validate = () => {
        const errs = {};

        if (!form.university_name.trim())
            errs.university_name = 'University name is required';
        else if (
            existingNames.some(
                (n) => n.toLowerCase() === form.university_name.trim().toLowerCase()
            )
        )
            errs.university_name = 'This university already exists in the system';

        if (!form.country.trim())
            errs.country = 'Country is required';

        if (!form.website.trim())
            errs.website = 'Website is required';
        else if (!isValidUrl(form.website.trim()))
            errs.website = 'Please enter a valid URL (e.g. https://example.edu)';



        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // Compute if submit should be enabled (live derived state)
    const isSubmittable =
        form.university_name.trim() &&
        form.country.trim() &&
        form.website.trim() &&
        isValidUrl(form.website.trim());

    const handleSubmit = async () => {
        setServerError('');
        if (!validate()) return;

        setLoading(true);
        try {
            const data = {
                university_name: form.university_name.trim(),
                university_code: form.university_name.trim().replace(/[^a-zA-Z]/g, '').slice(0, 6).toUpperCase(),
                country: form.country.trim(),
                website: form.website.trim(),
            };
            const result = await suggestPartnerUniversity(data);
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

    // Backdrop click to close (only when not loading)
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !loading) onClose();
    };

    // ── Section label helper ──────────────────────────────────────────────────
    const SectionLabel = ({ children }) => (
        <div className="suggest-modal__section-label">{children}</div>
    );

    return (
        <div className="suggest-modal-overlay" onMouseDown={handleOverlayClick}>
            <div className="suggest-modal" role="dialog" aria-modal="true" aria-labelledby="suggest-modal-title">

                {/* ── Success State ──────────────────────────────────────── */}
                {success ? (
                    <div className="suggest-modal__success">
                        <div className="suggest-modal__success-icon">
                            <CheckCircle2 size={28} />
                        </div>
                        <h3>University Submitted!</h3>
                        <p>
                            <strong>{form.university_name}</strong> has been submitted. It is pending OIA Admin review.
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
                                    <h2 className="suggest-modal__title" id="suggest-modal-title">
                                        Add University
                                    </h2>
                                    <p className="suggest-modal__subtitle">
                                        Submit for OIA Admin review · All fields are required
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
                        <div className="suggest-modal__body" ref={bodyRef}>

                            {/* ── Section 1: University Details ─────────── */}
                            <SectionLabel>University Details</SectionLabel>

                            {/* University Name */}
                            <div className="suggest-modal__field">
                                <label className="suggest-modal__label">
                                    University Name <span>*</span>
                                </label>
                                <input
                                    className={`suggest-modal__input ${errors.university_name ? 'suggest-modal__input--error' : ''}`}
                                    type="text"
                                    placeholder="e.g. University of Oxford"
                                    value={form.university_name}
                                    onChange={(e) => handleChange('university_name', e.target.value)}
                                    disabled={loading}
                                    autoFocus
                                />
                                {errors.university_name && (
                                    <span className="suggest-modal__error-text">{errors.university_name}</span>
                                )}
                            </div>

                            {/* Country + Website in a row */}
                            <div className="suggest-modal__row">
                                <div className="suggest-modal__field">
                                    <label className="suggest-modal__label">
                                        Country <span>*</span>
                                    </label>
                                    <input
                                        className={`suggest-modal__input ${errors.country ? 'suggest-modal__input--error' : ''}`}
                                        type="text"
                                        placeholder="e.g. United Kingdom"
                                        value={form.country}
                                        onChange={(e) => handleChange('country', e.target.value)}
                                        disabled={loading}
                                    />
                                    {errors.country && (
                                        <span className="suggest-modal__error-text">{errors.country}</span>
                                    )}
                                </div>

                                <div className="suggest-modal__field">
                                    <label className="suggest-modal__label">
                                        Website <span>*</span>
                                    </label>
                                    <input
                                        className={`suggest-modal__input ${errors.website ? 'suggest-modal__input--error' : ''}`}
                                        type="url"
                                        placeholder="https://www.example.edu"
                                        value={form.website}
                                        onChange={(e) => handleChange('website', e.target.value)}
                                        disabled={loading}
                                    />
                                    {errors.website && (
                                        <span className="suggest-modal__error-text">{errors.website}</span>
                                    )}
                                </div>
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
                                disabled={loading || !isSubmittable}
                                title={!isSubmittable ? 'Fill in all required fields to submit' : undefined}
                            >
                                {loading ? 'Submitting…' : 'Submit for Review'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SuggestUniversityModal;
