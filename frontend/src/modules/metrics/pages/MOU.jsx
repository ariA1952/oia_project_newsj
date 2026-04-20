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
    const [showModal, setShowModal] = useState(false);
    const [editingMOU, setEditingMOU] = useState(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [formLoading, setFormLoading] = useState(false);

    // Open MOU document via authenticated fetch → blob URL
    const handleViewMOUDocument = async (mouId) => {
        try {
            const blobUrl = await downloadMOUDocument(mouId);
            window.open(blobUrl, '_blank');
        } catch {
            setNotification({ message: 'Failed to load document', type: 'error' });
        }
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

    const handleOpenModal = (mou = null) => {
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
        } else {
            setEditingMOU(null);
            setFormData(EMPTY_FORM);
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
        if (!formData.university_id || !formData.erp_academic_year_id) {
            setNotification({ message: 'University and Academic Year are required', type: 'warning' });
            return;
        }

        setFormLoading(true);
        try {
            const payload = { ...formData };
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

    const filteredMOUs = mous.filter(mou => {
        const uniName = getUniversityName(mou).toLowerCase();
        const mouType = (mou.mou_type || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        return uniName.includes(term) || mouType.includes(term);
    });

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

            {/* Search */}
            <div className="mou__search-bar">
                <Search size={18} className="mou__search-icon" />
                <input
                    type="text"
                    placeholder="Search by university or MOU type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mou__search-input"
                />
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
                                            <Building2 size={14} style={{ marginRight: 6 }} />
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
                                    <div className="mou__col">
                                        {mou.document_path ? (
                                            <button
                                                type="button"
                                                onClick={() => handleViewMOUDocument(mou.mou_id)}
                                                className="mou__doc-link"
                                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                <FileText size={14} />
                                                View Doc
                                                <ExternalLink size={12} style={{ marginLeft: 4 }} />
                                            </button>
                                        ) : (
                                            <span className="mou__no-doc">No document</span>
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
                            </div>

                            <div className="mou__modal-actions">
                                <ActionButton variant="secondary" type="button" onClick={() => setShowModal(false)}>
                                    Cancel
                                </ActionButton>
                                <ActionButton variant="primary" type="submit" disabled={formLoading}>
                                    {formLoading ? 'Saving…' : editingMOU ? 'Update MOU' : 'Create MOU'}
                                </ActionButton>
                            </div>
                        </form>
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