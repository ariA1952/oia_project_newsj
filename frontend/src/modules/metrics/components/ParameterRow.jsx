import { useState } from 'react';
import ActionButton from '../../../common/ActionButton';
import FileUpload from '../../../common/FileUpload';
import './ParameterRow.css';

const ParameterRow = ({
    parameter,
    existingData = null,
    universities = [],
    onSave,
    onDelete,
    disabled = false,
}) => {
    const [isEditing, setIsEditing] = useState(!existingData);
    const [formData, setFormData] = useState({
        numeric_value: existingData?.numeric_value || '',
        university_id: existingData?.university_id || '',
        document_url: existingData?.activity_data?.document_url || '',
    });
    const [errors, setErrors] = useState({});

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
        // In real implementation, upload file and get URL
        // For now, just set a placeholder URL
        if (file) {
            setFormData({ ...formData, document_url: `uploads/${file.name}` });
        } else {
            setFormData({ ...formData, document_url: '' });
        }
    };

    return (
        <div className={`parameter-row ${disabled ? 'parameter-row--disabled' : ''}`}>
            <div className="parameter-row__name">
                {parameter.parameter_name || parameter.parameter_code}
            </div>

            <div className="parameter-row__input">
                <input
                    type="number"
                    step="0.01"
                    value={formData.numeric_value}
                    onChange={(e) => setFormData({ ...formData, numeric_value: e.target.value })}
                    disabled={!isEditing || disabled}
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
                    disabled={!isEditing || disabled}
                >
                    <option value="">Select Partner University</option>
                    {universities.map((uni) => (
                        <option key={uni.university_id} value={uni.university_id}>
                            {uni.university_name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="parameter-row__file">
                {isEditing && !disabled ? (
                    <FileUpload
                        onFileSelect={handleFileSelect}
                        label="Upload"
                        accept=".pdf,.doc,.docx,.xlsx"
                    />
                ) : (
                    <span className="parameter-row__file-name">
                        {formData.document_url || 'No file'}
                    </span>
                )}
            </div>

            <div className="parameter-row__actions">
                {isEditing && !disabled ? (
                    <>
                        <ActionButton variant="success" onClick={handleSave}>
                            Save
                        </ActionButton>
                        {existingData && (
                            <ActionButton variant="secondary" onClick={handleCancel}>
                                Cancel
                            </ActionButton>
                        )}
                    </>
                ) : (
                    <>
                        <ActionButton variant="primary" onClick={() => setIsEditing(true)} disabled={disabled}>
                            Edit
                        </ActionButton>
                        {existingData && (
                            <ActionButton variant="danger" onClick={() => onDelete(existingData.activity_id)} disabled={disabled}>
                                Delete
                            </ActionButton>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ParameterRow;
