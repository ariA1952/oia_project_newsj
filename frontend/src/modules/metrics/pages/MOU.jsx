import { useState, useEffect } from 'react';
import {
    Plus, Edit2, FileText, ExternalLink, Search,
    Calendar, Building2, AlertCircle, Shield, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import useMetricsMasterData from '../hooks/useMetricsMasterData';
import {
    getMOUs,
    createMOU,
    downloadMOUDocument,
    deleteMOU,
    updateMOU,
    downloadMOUOtherDocument,
    getMOUById,
    getMOUOtherDocuments,
} from '../services/metricsService';
import './MOU.css';

const EMPTY_FORM = {
    university_id: '',
    erp_academic_year_id: '',
    mou_type: '',
    start_date: '',
    end_date: '',
    status: 'Active',
    document: null,
};

const StatusBadge = ({ status }) => (
    <span className={`status-badge status-badge--${(status || 'active').toLowerCase().replace(/\s/g, '_')}`}>
        {status || 'Active'}
    </span>
);

const MOU = () => {
    const { user } = useAuth();
    const userRole = user?.erp_users_type;
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    // Faculty and HOD are both view-only
    const isViewOnly = !isAdmin;

    const { masterData, loading: masterDataLoading } = useMetricsMasterData();
    const [mous, setMous] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Active');
    const [showModal, setShowModal] = useState(false);
    const [editingMOU, setEditingMOU] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formLoading, setFormLoading] = useState(false);

    // Other optional documents state
    const [otherDocs, setOtherDocs] = useState([]);
    const [docsLoading, setDocsLoading] = useState(false);

    // Supporting documents popup/lazy-loading states
    const [showOtherDocsModal, setShowOtherDocsModal] = useState(false);
    const [selectedMOUForDocs, setSelectedMOUForDocs] = useState(null);
    const [popupDocs, setPopupDocs] = useState([]);
    const [popupLoading, setPopupLoading] = useState(false);

    // Open MOU document via authenticated fetch → blob URL
    const handleViewMOUDocument = async (mouId) => {
        try {
            const blobUrl = await downloadMOUDocument(mouId);
            window.open(blobUrl, '_blank');
        } catch {
            setNotification({ message: 'Failed to load document', type: 'error' });
        }
    };

    // Open MOU supporting document via authenticated fetch → blob URL
    const handleViewOtherDocument = async (mouId, fileIndex) => {
        try {
            const blobUrl = await downloadMOUOtherDocument(mouId, fileIndex);
            window.open(blobUrl, '_blank');
        } catch {
            setNotification({ message: 'Failed to load supporting document', type: 'error' });
        }
    };

    // Direct download MOU supporting document via programmatically clicking a blob link
    const handleDownloadOtherDocument = async (mouId, fileIndex, filename) => {
        try {
            const blobUrl = await downloadMOUOtherDocument(mouId, fileIndex);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename || 'document');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch {
            setNotification({ message: 'Failed to download supporting document', type: 'error' });
        }
    };

    // Handle lazy-loaded popup fetch for supporting documents metadata
    const handleOpenOtherDocsPopup = async (mou) => {
        setSelectedMOUForDocs(mou);
        setShowOtherDocsModal(true);
        setPopupLoading(true);
        try {
            const docs = await getMOUOtherDocuments(mou.mou_id);
            setPopupDocs(docs || []);
        } catch (error) {
            setNotification({ message: 'Failed to load supporting documents details', type: 'error' });
        } finally {
            setPopupLoading(false);
        }
    };

    const handleAddOtherDoc = () => {
        setOtherDocs(prev => [
            ...prev,
            { id: `temp_${Date.now()}`, title: '', file: null, has_new_file: true }
        ]);
    };

    const handleRemoveOtherDoc = (id) => {
        setOtherDocs(prev => prev.filter(doc => doc.id !== id));
    };

    const handleOtherDocChange = (id, field, value) => {
        setOtherDocs(prev => prev.map(doc => {
            if (doc.id === id) {
                return { ...doc, [field]: value };
            }
            return doc;
        }));
    };

    useEffect(() => {
        fetchMOUs();
    }, []);

    const fetchMOUs = async () => {
        setLoading(true);
        try {
            const data = await getMOUs({ skip: 0, limit: 200 });
            setMous(data);
        } catch (err) {
            setNotification({ message: 'Failed to fetch MOUs', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this MOU? This action cannot be undone.')) return;
        try {
            await deleteMOU(id);
            setNotification({ message: 'MOU deleted successfully', type: 'success' });
            fetchMOUs();
        } catch (err) {
            setNotification({ message: err?.detail || 'Failed to delete MOU', type: 'error' });
        }
    };

    const getUniversityName = (mou) =>
        mou.university_name || masterData.universities.find(u => u.university_id === mou.university_id)?.university_name || `University #${mou.university_id}`;

    const getAcademicYearName = (id) =>
        masterData.academicYears.find(y => y.erp_academic_year_id === id)?.academic_year_name ||
        masterData.academicYears.find(y => y.erp_academic_year_id === id)?.academic_year ||
        `Year #${id}`;

    const handleOpenModal = async (mou = null) => {
        if (!isAdmin) return;
        if (mou) {
            setEditingMOU(mou);
            setFormData({
                university_id: mou.university_id || '',
                erp_academic_year_id: mou.erp_academic_year_id || '',
                mou_type: mou.mou_type || '',
                start_date: mou.start_date || '',
                end_date: mou.end_date || '',
                status: mou.status || 'Active',
                document: null,
            });
            setOtherDocs([]);
            setDocsLoading(true);
            try {
                // Fetch full details of the MOU including all uploaded other_documents
                const fullMOU = await getMOUById(mou.mou_id);
                const initialDocs = (fullMOU.other_documents || []).map((doc, idx) => ({
                    id: `existing_${idx}`,
                    title: doc.title || '',
                    file_path: doc.file_path || '',
                    uploaded_by: doc.uploaded_by,
                    uploaded_at: doc.uploaded_at,
                    has_new_file: false,
                    file: null
                }));
                setOtherDocs(initialDocs);
            } catch (err) {
                setNotification({ message: 'Failed to load supporting documents for editing', type: 'error' });
            } finally {
                setDocsLoading(false);
            }
        } else {
            setEditingMOU(null);
            setFormData(EMPTY_FORM);
            setOtherDocs([]);
            setDocsLoading(false);
        }
        setShowModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'document') {
            setFormData(prev => ({ ...prev, document: files[0] || null }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (docsLoading) {
            setNotification({ message: 'Please wait for supporting documents to load', type: 'warning' });
            return;
        }
        if (!formData.university_id || !formData.erp_academic_year_id) {
            setNotification({ message: 'University and Academic Year are required', type: 'warning' });
            return;
        }

        // Validate supporting documents: title requires file, file requires title
        for (const doc of otherDocs) {
            const hasTitle = !!doc.title.trim();
            const hasFile = doc.has_new_file ? !!doc.file : !!doc.file_path;

            if (hasTitle && !hasFile) {
                setNotification({
                    message: `Please upload a file for supporting document "${doc.title}"`,
                    type: 'warning'
                });
                return;
            }
            if (!hasTitle && hasFile) {
                setNotification({
                    message: 'Please provide a title for all uploaded supporting documents',
                    type: 'warning'
                });
                return;
            }
        }

        setFormLoading(true);
        try {
            const payload = { ...formData };

            // Construct other documents metadata
            const metadata = otherDocs
                .filter(doc => doc.title.trim())
                .map(doc => ({
                    id: doc.id,
                    title: doc.title,
                    has_new_file: doc.has_new_file,
                    file_path: doc.file_path || '',
                    uploaded_by: doc.uploaded_by,
                    uploaded_at: doc.uploaded_at
                }));
            payload.other_documents_metadata = JSON.stringify(metadata);

            // Append dynamic files
            otherDocs.forEach(doc => {
                if (doc.has_new_file && doc.file) {
                    payload[`other_file_${doc.id}`] = doc.file;
                }
            });

            if (editingMOU) {
                await updateMOU(editingMOU.mou_id, payload);
                setNotification({ message: 'MOU updated successfully', type: 'success' });
            } else {
                await createMOU(payload);
                setNotification({ message: 'MOU created successfully', type: 'success' });
            }
            setShowModal(false);
            fetchMOUs();
        } catch (err) {
            setNotification({ message: err?.detail || 'Failed to save MOU', type: 'error' });
        } finally {
            setFormLoading(false);
        }
    };

    const filteredMOUs = mous
        .filter(mou => {
            const matchesStatus = (mou.status || 'Active').toLowerCase() === statusFilter.toLowerCase();
            const uniName = getUniversityName(mou).toLowerCase();
            const mouType = (mou.mou_type || '').toLowerCase();
            const term = searchTerm.toLowerCase();
            return matchesStatus && (uniName.includes(term) || mouType.includes(term));
        })
        .sort((a, b) => b.mou_id - a.mou_id);

    if (masterDataLoading) return <Loader fullscreen />;

    return (
        <div className="mou">
            {/* Header */}
            <div className="mou__header">
                <div>
                    <h1 className="mou__title">Memoranda of Understanding</h1>
                    <p className="mou__subtitle">
                        {isAdmin
                            ? 'Manage MOUs with international partner universities'
                            : 'View active MOUs with international partner universities'}
                    </p>
                </div>
                {isAdmin && (
                    <ActionButton variant="primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        New MOU
                    </ActionButton>
                )}
            </div>

            {/* Role Banner for non-admins */}
            {isViewOnly && (
                <div className="mou__role-banner">
                    <Shield size={16} />
                    <span>Read-only access — only OIA Admin can create or edit MOUs</span>
                </div>
            )}

            {/* Controls Row: Search & Toggle */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {/* Status Toggle List */}
                <div style={{ display: 'flex', backgroundColor: '#e2e8f0', p: '2px', borderRadius: '8px', padding: '4px' }}>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('Active')}
                        style={{
                            padding: '6px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: statusFilter === 'Active' ? '#fff' : 'transparent',
                            color: statusFilter === 'Active' ? '#1e293b' : '#64748b',
                            fontWeight: statusFilter === 'Active' ? '600' : '500',
                            boxShadow: statusFilter === 'Active' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Active MOUs
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('Inactive')}
                        style={{
                            padding: '6px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            backgroundColor: statusFilter === 'Inactive' ? '#fff' : 'transparent',
                            color: statusFilter === 'Inactive' ? '#1e293b' : '#64748b',
                            fontWeight: statusFilter === 'Inactive' ? '600' : '500',
                            boxShadow: statusFilter === 'Inactive' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Inactive MOUs
                    </button>
                </div>

                {/* Search */}
                <div className="mou__search-bar" style={{ marginBottom: 0, flex: 1, maxWidth: '400px' }}>
                    <Search size={18} className="mou__search-icon" />
                    <input
                        type="text"
                        placeholder="Search by university or MOU type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mou__search-input"
                    />
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="mou__loader"><Loader size="large" /></div>
            ) : (
                <div className="mou__content">
                    <div className="mou__table-header">
                        <span>Partner University</span>
                        <span>MOU Type</span>
                        <span>Academic Year</span>
                        <span>Duration</span>
                        <span>Status</span>
                        <span>MOU Exists</span>
                        <span>Document</span>
                        {isAdmin && <span>Actions</span>}
                    </div>

                    <div className="mou__list">
                        {filteredMOUs.length === 0 ? (
                            <div className="mou__empty">
                                <AlertCircle size={40} />
                                <p>No MOUs found.</p>
                            </div>
                        ) : (
                            filteredMOUs.map(mou => (
                                <div key={mou.mou_id} className="mou__row">
                                    {/* University */}
                                    <div className="mou__col">
                                        <div className="mou__uni-name">
                                            {getUniversityName(mou)}
                                        </div>
                                        <div className="mou__mou-id">MOU #{mou.mou_id}</div>
                                    </div>

                                    {/* Type */}
                                    <div className="mou__col">
                                        <span className="mou__type-tag">{mou.mou_type || '—'}</span>
                                    </div>

                                    {/* Academic Year */}
                                    <div className="mou__col mou__col--muted">
                                        {getAcademicYearName(mou.erp_academic_year_id)}
                                    </div>

                                    {/* Duration */}
                                    <div className="mou__col">
                                        <div className="mou__dates">
                                            <Calendar size={13} style={{ marginRight: 4 }} />
                                            <span>{mou.start_date || '—'}</span>
                                            {' → '}
                                            <span>{mou.end_date || '—'}</span>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div className="mou__col">
                                        <StatusBadge status={mou.status} />
                                    </div>

                                    {/* MOU Exists (Based on document) */}
                                    <div className="mou__col" style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: '1rem' }}>
                                        {mou.document_path ? (
                                            <CheckCircle size={18} color="green" title="MOU Document Exists" />
                                        ) : (
                                            <XCircle size={18} color="red" title="No MOU Document" />
                                        )}
                                    </div>

                                    {/* Document */}
                                    <div className="mou__col" style={{ gap: '6px', alignItems: 'flex-start' }}>
                                        {mou.document_path ? (
                                            <button
                                                type="button"
                                                onClick={() => handleViewMOUDocument(mou.mou_id)}
                                                className="mou__doc-link mou__doc-link--primary"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                <FileText size={14} />
                                                Agreement
                                                <ExternalLink size={12} style={{ marginLeft: 4 }} />
                                            </button>
                                        ) : (
                                            <span className="mou__no-doc">No Agreement</span>
                                        )}
                                        {mou.other_docs_count > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenOtherDocsPopup(mou)}
                                                className="mou__other-docs-btn"
                                            >
                                                <FileText size={12} />
                                                <span>Other Docs ({mou.other_docs_count})</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {isAdmin && (
                                        <div className="mou__col mou__col--actions" style={{ flexDirection: 'row', gap: '8px' }}>
                                            <ActionButton variant="secondary" onClick={() => handleOpenModal(mou)} title="Edit MOU">
                                                <Edit2 size={15} />
                                            </ActionButton>
                                            {isSuperAdmin && (
                                                <ActionButton
                                                    variant="danger"
                                                    onClick={() => handleDelete(mou.mou_id)}
                                                    title="Delete MOU"
                                                >
                                                    <Trash2 size={15} />
                                                </ActionButton>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && isAdmin && (
                <div className="mou__modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="mou__modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="mou__modal-title">
                            {editingMOU ? 'Edit MOU' : 'Create New MOU'}
                        </h2>
                        <form onSubmit={handleSubmit} className="mou__form">
                            <div className="mou__form-grid">
                                {/* Partner University */}
                                <div className="mou__field mou__field--wide">
                                    <label>Partner University *</label>
                                    <select
                                        name="university_id"
                                        required
                                        value={formData.university_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select University</option>
                                        {editingMOU && editingMOU.university_id && !masterData.universities.some(u => u.university_id === editingMOU.university_id) && (
                                            <option value={editingMOU.university_id}>
                                                {getUniversityName(editingMOU)}
                                            </option>
                                        )}
                                        {masterData.universities.map(u => (
                                            <option key={u.university_id} value={u.university_id}>
                                                {u.university_name} {u.country ? `(${u.country})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Academic Year */}
                                <div className="mou__field">
                                    <label>Academic Year *</label>
                                    <select
                                        name="erp_academic_year_id"
                                        required
                                        value={formData.erp_academic_year_id}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Year</option>
                                        {masterData.academicYears.map(y => (
                                            <option key={y.erp_academic_year_id} value={y.erp_academic_year_id}>
                                                {y.academic_year_name || y.academic_year}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* MOU Type */}
                                <div className="mou__field">
                                    <label>MOU Type</label>
                                    <input
                                        type="text"
                                        name="mou_type"
                                        placeholder="e.g. General Collaboration"
                                        value={formData.mou_type}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Start Date */}
                                <div className="mou__field">
                                    <label>Start Date</label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* End Date */}
                                <div className="mou__field">
                                    <label>End Date</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                {/* Status */}
                                <div className="mou__field">
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>

                                {/* Document Upload */}
                                <div className="mou__field mou__field--wide">
                                    <label>Upload MOU Document (PDF / Word)</label>
                                    <input
                                        type="file"
                                        name="document"
                                        accept=".pdf,.doc,.docx"
                                        onChange={handleInputChange}
                                        className="mou__file-input"
                                    />
                                    {editingMOU?.document_path && !formData.document && (
                                        <div className="mou__existing-doc">
                                            <FileText size={13} />
                                            Existing document on file — upload new to replace
                                        </div>
                                    )}
                                </div>

                                {/* Other Documents Section */}
                                <div className="mou__field mou__field--wide" style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                    <label style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b', marginBottom: '8px', display: 'block' }}>
                                        Other Documents (Optional Supporting Files)
                                    </label>
                                    
                                    {docsLoading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', padding: '10px' }}>
                                            <span style={{ animation: 'spin 1s linear infinite', border: '2px solid #cbd5e1', borderTop: '2px solid #0f766e', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-block' }}></span>
                                            <span>Loading supporting documents...</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {otherDocs.map((doc) => (
                                                <div key={doc.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                    {/* Document Title */}
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'none', letterSpacing: 'normal' }}>Document Title *</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Meeting Minutes, Approval Email"
                                                            value={doc.title}
                                                            onChange={(e) => handleOtherDocChange(doc.id, 'title', e.target.value)}
                                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                                                        />
                                                    </div>

                                                    {/* File Upload */}
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <label style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', textTransform: 'none', letterSpacing: 'normal' }}>Upload File *</label>
                                                        {doc.has_new_file ? (
                                                            <input
                                                                type="file"
                                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                onChange={(e) => handleOtherDocChange(doc.id, 'file', e.target.files[0] || null)}
                                                                style={{ fontSize: '13px', background: 'transparent', border: 'none', padding: 0 }}
                                                            />
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0f766e', fontWeight: '500' }}>
                                                                <FileText size={14} />
                                                                <span>{doc.title || 'Supporting File'}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOtherDocChange(doc.id, 'has_new_file', true)}
                                                                    style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                                                                >
                                                                    Replace
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Remove Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveOtherDoc(doc.id)}
                                                        style={{ padding: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: '4px' }}
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}

                                            <button
                                                type="button"
                                                onClick={handleAddOtherDoc}
                                                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0f766e', background: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', border: '1px dashed #0f766e', fontWeight: '500', transition: 'all 0.2s' }}
                                            >
                                                <Plus size={14} />
                                                Add Other Document
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mou__modal-actions">
                                <ActionButton variant="secondary" type="button" onClick={() => setShowModal(false)}>
                                    Cancel
                                </ActionButton>
                                <ActionButton variant="primary" type="submit" disabled={formLoading || docsLoading}>
                                    {formLoading ? 'Saving…' : docsLoading ? 'Loading Docs…' : editingMOU ? 'Update MOU' : 'Create MOU'}
                                </ActionButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showOtherDocsModal && selectedMOUForDocs && (
                <div className="mou__modal-overlay" onClick={() => setShowOtherDocsModal(false)}>
                    <div className="mou__modal mou__modal--other-docs" onClick={(e) => e.stopPropagation()}>
                        <div className="mou__modal-header">
                            <h2 className="mou__modal-title">
                                Supporting Documents - {selectedMOUForDocs.university_name || `MOU #${selectedMOUForDocs.mou_id}`}
                            </h2>
                            <button
                                type="button"
                                className="mou__modal-close-btn"
                                onClick={() => setShowOtherDocsModal(false)}
                            >
                                &times;
                            </button>
                        </div>

                        {popupLoading ? (
                            <div className="mou__popup-loader">
                                <Loader size="medium" />
                                <p style={{ marginTop: '8px', color: '#64748b', fontSize: '0.85rem' }}>Loading documents...</p>
                            </div>
                        ) : popupDocs.length === 0 ? (
                            <div className="mou__popup-empty">
                                <AlertCircle size={32} style={{ color: '#94a3b8' }} />
                                <p>No supporting documents uploaded for this university.</p>
                            </div>
                        ) : (
                            <div className="mou__popup-list">
                                {popupDocs.map((doc, idx) => (
                                    <div key={idx} className="mou__popup-item">
                                        <div className="mou__popup-item-header">
                                            <span className="mou__popup-item-number">{idx + 1}.</span>
                                            <span className="mou__popup-item-title">{doc.title}</span>
                                        </div>
                                        
                                        <div className="mou__popup-item-meta">
                                            <div className="mou__popup-meta-field">
                                                <span className="mou__meta-label">Uploaded By:</span>
                                                <span className="mou__meta-value">{doc.uploaded_by || 'Admin'}</span>
                                            </div>
                                            <div className="mou__popup-meta-field">
                                                <span className="mou__meta-label">Uploaded On:</span>
                                                <span className="mou__meta-value">{doc.uploaded_at || '—'}</span>
                                            </div>
                                        </div>

                                        <div className="mou__popup-item-actions">
                                            <button
                                                type="button"
                                                className="mou__popup-btn mou__popup-btn--preview"
                                                onClick={() => handleViewOtherDocument(selectedMOUForDocs.mou_id, doc.file_index)}
                                            >
                                                Preview
                                            </button>
                                            <button
                                                type="button"
                                                className="mou__popup-btn mou__popup-btn--download"
                                                onClick={() => {
                                                    const ext = doc.file_path ? doc.file_path.split('.').pop() : 'pdf';
                                                    const cleanTitle = doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                                    handleDownloadOtherDocument(selectedMOUForDocs.mou_id, doc.file_index, `${cleanTitle}.${ext}`);
                                                }}
                                            >
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="mou__modal-actions" style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                            <ActionButton variant="secondary" onClick={() => setShowOtherDocsModal(false)}>
                                Close
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}

            {notification && (
                <Notification
                    message={notification.message}
                    type={notification.type}
                    onClose={() => setNotification(null)}
                />
            )}
        </div>
    );
};

export default MOU;