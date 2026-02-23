import { useState, useEffect } from 'react';
import ActionButton from '../../../common/ActionButton';
import FileUpload from '../../../common/FileUpload';
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
}) => {
    const [isEditing, setIsEditing] = useState(!existingData);
    const [formData, setFormData] = useState({
        numeric_value: existingData?.numeric_value || '',
        university_id: existingData?.university_id || '',
        document_url: existingData?.activity_data?.document_url || '',
    });
    const [errors, setErrors] = useState({});

    // Sync state when props change (fixes stale data on AY/Quarter switch)
    useEffect(() => {
        setFormData({
            numeric_value: existingData?.numeric_value || '',
            university_id: existingData?.university_id || '',
            document_url: existingData?.activity_data?.document_url || '',
        });
        setIsEditing(!existingData);
        setErrors({});
    }, [existingData]);

    const isSubmitted = existingData?.status === 'SUBMITTED';
    const isApproved = existingData?.status === 'APPROVED';
    const isRejected = existingData?.status === 'REJECTED';
    const isDraft = existingData?.status === 'DRAFT' || !existingData;
    const isEditable = isDraft || isRejected;

    const validate = () => {
        const newErrors = {};

        if (!formData.numeric_value || formData.numeric_value === '') {
            newErrors.numeric_value = 'Value is required';
        } else if (parseFloat(formData.numeric_value) < 0) {
            newErrors.numeric_value = 'Value cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;

        onSave({
            parameter_id: parameter.parameter_id,
            numeric_value: parseFloat(formData.numeric_value),
            university_id: formData.university_id ? parseInt(formData.university_id) : null,
            activity_data: {
                document_url: formData.document_url,
            },
        });

        setIsEditing(false);
    };

    const handleCancel = () => {
        if (existingData) {
            setFormData({
                numeric_value: existingData.numeric_value || '',
                university_id: existingData.university_id || '',
                document_url: existingData.activity_data?.document_url || '',
            });
            setIsEditing(false);
        }
        setErrors({});
    };

    const handleFileSelect = (file) => {
        if (file) {
            setFormData({ ...formData, document_url: `uploads/${file.name}` });
        } else {
            setFormData({ ...formData, document_url: '' });
        }
    };

    return (
        <div className={`parameter-row ${disabled && !isEditing ? 'parameter-row--disabled' : ''}`}>
            <div className="parameter-row__name">
                {parameter.parameter_name || parameter.parameter_code}
            </div>

            <div className="parameter-row__input">
                <input
                    type="number"
                    step="0.01"
                    value={formData.numeric_value}
                    onChange={(e) => setFormData({ ...formData, numeric_value: e.target.value })}
                    disabled={!isEditing || !isEditable || disabled}
                    className={errors.numeric_value ? 'input-error' : ''}
                    placeholder="Enter value"
                />
                {errors.numeric_value && (
                    <span className="parameter-row__error">{errors.numeric_value}</span>
                )}
            </div>

            <div className="parameter-row__university">
                <select
                    value={formData.university_id}
                    onChange={(e) => setFormData({ ...formData, university_id: e.target.value })}
                    disabled={!isEditing || !isEditable || disabled}
                >
                    <option value="">Select Partner University</option>
                    {universities.map((uni) => (
                        <option key={uni.university_id} value={uni.university_id}>
                            {uni.university_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="parameter-row__status">
                {existingData ? (
                    <span className={`status-badge status-badge--${existingData.status.toLowerCase()}`}>
                        {existingData.status}
                    </span>
                ) : (
                    <span className="status-badge status-badge--none">NEW</span>
                )}
            </div>

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
                        {isEditable ? (
                            <>
                                <ActionButton variant="primary" onClick={() => setIsEditing(true)}>
                                    {existingData ? 'Edit' : 'Create Activity'}
                                </ActionButton>
                                {existingData && (
                                    <ActionButton variant="success" onClick={() => onSubmit(existingData.activity_id)}>
                                        Request Approval
                                    </ActionButton>
                                )}
                            </>
                        ) : (
                            <span className="action-label">Read Only</span>
                        )}
                        {isContextSelected && (
                            <ActionButton variant="secondary" onClick={onAdd} title="Add another entry">
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
