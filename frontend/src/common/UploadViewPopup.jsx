import React from 'react';
import './FileUpload.css';

const UploadViewPopup = ({
    data,
    closePopup,
    onDelete,
    openUploadWindow,
    submitData,
    isSubmitButton,
    isViewOnly,
    getFilesForPreview,
    setPreviewIndex,
    previewFile,
    previewIndex,
    handleUploadPopup,
    generateURLAndSubmit,
    isMulti,
    acceptedFormats,
    filesizeAllowed,
    isDownloadable
}) => {
    React.useEffect(() => {
        if (data && data.length > 0 && previewFile.length === 0) {
            getFilesForPreview(data);
        }
    }, [data, getFilesForPreview, previewFile.length]);

    const activeFile = previewFile[previewIndex];

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const formattedFiles = files.map(file => ({
                data: file,
                name: file.name,
                extension: file.name.split('.').pop()
            }));
            generateURLAndSubmit(formattedFiles);
        }
    };

    return (
        <div className="upload-popup-overlay">
            <div className="upload-popup-container">
                <div className="upload-popup-header">
                    <h3>{isViewOnly ? 'View Documents' : 'Upload & Manage Documents'}</h3>
                    <button className="close-btn" onClick={closePopup}>&times;</button>
                </div>

                <div className="upload-popup-body">
                    <div className="preview-section">
                        {previewFile.length > 0 ? (
                            <div className="file-preview-container">
                                {activeFile?.extension?.toLowerCase() === 'pdf' ? (
                                    <iframe
                                        src={activeFile.url}
                                        title="PDF Preview"
                                        className="pdf-preview"
                                    />
                                ) : ['jpg', 'jpeg', 'png', 'gif'].includes(activeFile?.extension?.toLowerCase()) ? (
                                    <img src={activeFile.url} alt="Preview" className="img-preview" />
                                ) : (
                                    <div className="no-preview">
                                        <div className="no-preview-icon">📄</div>
                                        <p>No preview available for this file type</p>
                                        <a href={activeFile.url} target="_blank" rel="noopener noreferrer" className="download-link">
                                            Open in new tab
                                        </a>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="empty-preview">
                                <p>No files to preview</p>
                            </div>
                        )}
                    </div>

                    <div className="file-list-section">
                        <div className="file-list-header">
                            <span>Files ({previewFile.length})</span>
                            {!isViewOnly && (isMulti || previewFile.length === 0) && (
                                <label className="add-file-label">
                                    + Add File
                                    <input
                                        type="file"
                                        className="hidden-input"
                                        onChange={handleFileChange}
                                        multiple={isMulti}
                                        accept={acceptedFormats}
                                    />
                                </label>
                            )}
                        </div>
                        <div className="file-items">
                            {previewFile.map((file, index) => (
                                <div
                                    key={index}
                                    className={`file-item ${index === previewIndex ? 'active' : ''}`}
                                    onClick={() => setPreviewIndex(index)}
                                >
                                    <span className="file-name" title={file.fileName}>{file.fileName}</span>
                                    {!isViewOnly && (
                                        <button
                                            className="delete-file-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDelete(file);
                                            }}
                                        >
                                            &times;
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="upload-popup-footer">
                    {!isViewOnly && (
                        <button
                            className="submit-btn"
                            disabled={!isSubmitButton}
                            onClick={() => submitData()}
                        >
                            Save Changes
                        </button>
                    )}
                    <button className="cancel-btn" onClick={closePopup}>
                        {isViewOnly ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadViewPopup;
