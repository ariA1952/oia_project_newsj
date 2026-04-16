import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Globe, MapPin, ExternalLink, Search, CheckCircle, XCircle, FileDown, Clock, Filter, Trash2 } from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import {
    getPartnerUniversities,
    createPartnerUniversity,
    updatePartnerUniversity,
    approvePartnerUniversity,
    rejectPartnerUniversity,
    downloadUniversityAgreementDocument,
    deletePartnerUniversity,
} from '../services/metricsService';
import './Partners.css';

// ── Status badge helper ───────────────────────────────────────────────────────
const STATUS_META = {
    Active:         { cls: 'active',          label: 'Active' },
    Inactive:       { cls: 'inactive',        label: 'Inactive' },
    Pending:        { cls: 'pending',         label: 'Pending' },
    PENDING_REVIEW: { cls: 'pending-review',  label: 'Pending Review' },
    Rejected:       { cls: 'rejected',        label: 'Rejected' },
};

const StatusBadge = ({ status }) => {
    const meta = STATUS_META[status] ?? { cls: status?.toLowerCase() ?? 'none', label: status ?? '—' };
    return (
        <span className={`status-badge status-badge--${meta.cls}`}>{meta.label}</span>
    );
};

// ── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
    { key: null,             label: 'All' },
    { key: 'Active',         label: 'Active' },
    { key: 'PENDING_REVIEW', label: 'Pending Review' },
    { key: 'Rejected',       label: 'Rejected' },
];

// ── Partners page ─────────────────────────────────────────────────────────────

const Partners = () => {
    const { user } = useAuth();
    const userRole = user?.erp_users_type;
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    const [universities, setUniversities]           = useState([]);
    const [pendingCount, setPendingCount]           = useState(0);
    const [activeTab, setActiveTab]                 = useState(null);   // null = All
    const [loading, setLoading]                     = useState(false);
    const [actionLoading, setActionLoading]         = useState(null);   // university_id being acted on
    const [notification, setNotification]           = useState(null);
    const [searchTerm, setSearchTerm]               = useState('');
    const [showModal, setShowModal]                 = useState(false);
    const [editingUniversity, setEditingUniversity] = useState(null);
    const [formData, setFormData]                   = useState({
        university_name: '', university_code: '', university_type: '',
        country: '', university_ranking: '', website: '', status: 'Active',
        start_date: '', end_date: '',
    });

    // ── fetch ────────────────────────────────────────────────────────────────

    const fetchUniversities = useCallback(async () => {
        setLoading(true);
        try {
            const params = { skip: 0, limit: 1000 };
            if (activeTab) {
                params.status = activeTab;
            } else if (!isAdmin) {
                // Non-admins only ever see Active universities
                params.status = 'Active';
            }
            const data = await getPartnerUniversities(params);
            setUniversities(data);

            // Keep pending badge count always accurate (admin only)
            if (isAdmin) {
                if (activeTab !== null) {
                    const all = await getPartnerUniversities({ skip: 0, limit: 1000 });
                    setPendingCount(all.filter((u) => u.status === 'PENDING_REVIEW').length);
                } else {
                    setPendingCount(data.filter((u) => u.status === 'PENDING_REVIEW').length);
                }
            }
        } catch {
            setNotification({ message: 'Failed to fetch partner universities', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [activeTab, isAdmin]);

    useEffect(() => { fetchUniversities(); }, [fetchUniversities]);

    // ── admin actions ────────────────────────────────────────────────────────

    const handleApprove = async (uni) => {
        setActionLoading(uni.university_id);
        try {
            const updated = await approvePartnerUniversity(uni.university_id);
            const mouNote = uni.has_mou_at_submission
                ? ' MOU record has been auto-created.'
                : '';
            setNotification({
                message: `${uni.university_name} approved successfully.${mouNote}`,
                type: 'success',
            });
            fetchUniversities();
        } catch (err) {
            setNotification({ message: err?.detail || 'Failed to approve university', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (uni) => {
        if (!window.confirm(`Reject "${uni.university_name}"? This cannot be undone.`)) return;
        setActionLoading(uni.university_id);
        try {
            await rejectPartnerUniversity(uni.university_id);
            setNotification({ message: `${uni.university_name} has been rejected.`, type: 'error' });
            fetchUniversities();
        } catch (err) {
            setNotification({ message: err?.detail || 'Failed to reject university', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleViewDoc = async (uni) => {
        setActionLoading(uni.university_id);
        try {
            const url = await downloadUniversityAgreementDocument(uni.university_id);
            window.open(url, '_blank');
        } catch {
            setNotification({ message: 'Document not found or unavailable.', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (uni) => {
        if (!window.confirm(`Are you sure you want to delete "${uni.university_name}"? This cannot be undone.`)) return;
        setActionLoading(uni.university_id);
        try {
            await deletePartnerUniversity(uni.university_id);
            setNotification({ message: `${uni.university_name} has been deleted.`, type: 'success' });
            fetchUniversities();
        } catch (err) {
            setNotification({ message: err?.detail || 'Failed to delete university', type: 'error' });
        } finally {
            setActionLoading(null);
        }
    };

    // ── form (create / edit) ─────────────────────────────────────────────────

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((p) => ({ ...p, [name]: value }));
    };

    const handleOpenModal = (university = null) => {
        if (university) {
            setEditingUniversity(university);
            setFormData({
                university_name:    university.university_name    || '',
                university_code:    university.university_code    || '',
                university_type:    university.university_type    || '',
                country:            university.country            || '',
                university_ranking: university.university_ranking || '',
                website:            university.website            || '',
                status:             university.status             || 'Active',
                start_date:         university.start_date         || '',
                end_date:           university.end_date           || '',
            });
        } else {
            setEditingUniversity(null);
            setFormData({
                university_name: '', university_code: '', university_type: '',
                country: '', university_ranking: '', website: '', status: 'Active',
                start_date: '', end_date: '',
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUniversity) {
                await updatePartnerUniversity(editingUniversity.university_id, formData);
                setNotification({ message: 'University updated successfully', type: 'success' });
            } else {
                await createPartnerUniversity(formData);
                setNotification({ message: 'University added successfully', type: 'success' });
            }
            setShowModal(false);
            fetchUniversities();
        } catch (error) {
            setNotification({ message: error.detail || 'Failed to save university', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // ── filtering + search ───────────────────────────────────────────────────

    const filteredUniversities = universities.filter((uni) => {
        const q = searchTerm.toLowerCase();
        return (
            uni.university_name?.toLowerCase().includes(q) ||
            uni.country?.toLowerCase().includes(q) ||
            uni.university_code?.toLowerCase().includes(q)
        );
    });

    if (loading && universities.length === 0) return <Loader fullscreen />;

    return (
        <div className="partners">

            {/* ── Page header ────────────────────────────────────────────── */}
            <div className="partners__header">
                <div>
                    <h1 className="partners__title">Partner Universities</h1>
                    <p className="partners__subtitle">Manage international partner institutions and collaborations</p>
                </div>
                {isAdmin && (
                    <ActionButton variant="primary" onClick={() => handleOpenModal()}>
                        <Plus size={16} style={{ marginRight: 6 }} />
                        Add Partner
                    </ActionButton>
                )}
            </div>

            {/* ── Filter tabs ─────────────────────────────────────────────── */}
            {isAdmin && (
                <div className="partners__tabs">
                    {TABS.map((tab) => (
                        <button
                            key={String(tab.key)}
                            className={`partners__tab ${activeTab === tab.key ? 'partners__tab--active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            {tab.label === 'Pending Review' ? (
                                <>
                                    <Clock size={13} style={{ marginRight: 4 }} />
                                    Pending Review
                                    {pendingCount > 0 && (
                                        <span className="partners__tab-badge">{pendingCount}</span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Filter size={12} style={{ marginRight: 4, opacity: 0.6 }} />
                                    {tab.label}
                                </>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Search bar ──────────────────────────────────────────────── */}
            <div className="partners__search-bar">
                <Search size={18} className="partners__search-icon" />
                <input
                    type="text"
                    placeholder="Search by name, country or code…"
                    className="partners__search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* ── Pending review callout ──────────────────────────────────── */}
            {isAdmin && activeTab === 'PENDING_REVIEW' && filteredUniversities.length > 0 && (
                <div className="partners__pending-note">
                    <Clock size={15} />
                    <span>
                        <strong>{filteredUniversities.length}</strong> university suggestion{filteredUniversities.length !== 1 ? 's' : ''} awaiting your review.
                        Approving will make the university visible to all users in dropdowns.
                    </span>
                </div>
            )}

            {/* ── Table ───────────────────────────────────────────────────── */}
            <div className="partners__content">
                <div className={`partners__grid-header ${activeTab === 'PENDING_REVIEW' ? 'partners__grid-header--pending' : ''}`}>
                    <span>University Name</span>
                    <span>Location</span>
                    <span>Type / Rank</span>
                    <span>Partnership Duration</span>
                    <span>Status</span>
                    {isAdmin && <span>Actions</span>}
                </div>

                <div className="partners__list">
                    {filteredUniversities.length === 0 ? (
                        <div className="partners__empty">
                            {activeTab === 'PENDING_REVIEW'
                                ? '✓ No pending suggestions — all caught up!'
                                : 'No partner universities found.'}
                        </div>
                    ) : (
                        filteredUniversities.map((uni) => {
                            const isPending     = uni.status === 'PENDING_REVIEW';
                            const isActing      = actionLoading === uni.university_id;

                            return (
                                <div
                                    key={uni.university_id}
                                    className={`partners__row ${isPending ? 'partners__row--pending' : ''}`}
                                >
                                    {/* Name */}
                                    <div className="partners__col-name">
                                        <div className="partners__uni-name">{uni.university_name}</div>
                                        <div className="partners__uni-code">{uni.university_code}</div>
                                        {isPending && uni.has_mou_at_submission && (
                                            <span className="partners__mou-flag partners__mou-flag--yes">MOU Attached</span>
                                        )}
                                        {isPending && !uni.has_mou_at_submission && (
                                            <span className="partners__mou-flag partners__mou-flag--no">Agreement Doc</span>
                                        )}
                                    </div>

                                    {/* Location */}
                                    <div className="partners__col-location">
                                        <div className="partners__country">
                                            <MapPin size={13} style={{ marginRight: 4 }} />
                                            {uni.country || '—'}
                                        </div>
                                        {uni.website && (
                                            <a href={uni.website} target="_blank" rel="noopener noreferrer" className="partners__website">
                                                <Globe size={13} style={{ marginRight: 4 }} />
                                                Website
                                                <ExternalLink size={10} style={{ marginLeft: 4 }} />
                                            </a>
                                        )}
                                    </div>

                                    {/* Type / Rank */}
                                    <div className="partners__col-rank">
                                        <div className="partners__type">{uni.university_type || 'N/A'}</div>
                                        <div className="partners__rank">QS Rank: {uni.university_ranking || 'N/A'}</div>
                                    </div>

                                    {/* Dates */}
                                    <div className="partners__col-dates">
                                        {uni.start_date || uni.end_date ? (
                                            <div className="partners__dates">
                                                <span>{uni.start_date || '—'}</span>
                                                <span> → </span>
                                                <span>{uni.end_date || '—'}</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Not set</span>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <div className="partners__col-status">
                                        <StatusBadge status={uni.status} />
                                    </div>

                                    {/* Actions */}
                                    {isAdmin && (
                                        <div className="partners__col-actions">
                                            {isPending ? (
                                                <div className="partners__pending-actions">
                                                    {/* View Document */}
                                                    {uni.agreement_doc_path && (
                                                        <button
                                                            className="partners__action-btn partners__action-btn--doc"
                                                            onClick={() => handleViewDoc(uni)}
                                                            disabled={isActing}
                                                            title="View uploaded document"
                                                        >
                                                            <FileDown size={13} />
                                                            {uni.has_mou_at_submission ? 'View MOU' : 'View Doc'}
                                                        </button>
                                                    )}
                                                    {/* Approve */}
                                                    <button
                                                        className="partners__action-btn partners__action-btn--approve"
                                                        onClick={() => handleApprove(uni)}
                                                        disabled={isActing}
                                                        title="Approve university"
                                                    >
                                                        <CheckCircle size={13} />
                                                        {isActing ? '…' : 'Approve'}
                                                    </button>
                                                    {/* Reject */}
                                                    <button
                                                        className="partners__action-btn partners__action-btn--reject"
                                                        onClick={() => handleReject(uni)}
                                                        disabled={isActing}
                                                        title="Reject suggestion"
                                                    >
                                                        <XCircle size={13} />
                                                        {isActing ? '…' : 'Reject'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <ActionButton variant="secondary" onClick={() => handleOpenModal(uni)}>
                                                        <Edit2 size={14} />
                                                    </ActionButton>
                                                    {isSuperAdmin && (
                                                        <ActionButton 
                                                            variant="danger" 
                                                            onClick={() => handleDelete(uni)}
                                                            title="Delete University"
                                                        >
                                                            <Trash2 size={14} />
                                                        </ActionButton>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Add / Edit Modal ───────────────────────────────────────── */}
            {showModal && (
                <div className="partners__modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="partners__modal">
                        <h2 className="partners__modal-title">
                            {editingUniversity ? 'Edit Partner University' : 'Add New Partner University'}
                        </h2>
                        <form onSubmit={handleSubmit} className="partners__form">
                            <div className="partners__form-grid">
                                <div className="partners__field">
                                    <label>University Name *</label>
                                    <input type="text" name="university_name" required value={formData.university_name} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>University Code *</label>
                                    <input type="text" name="university_code" required value={formData.university_code} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>Country</label>
                                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>University Type</label>
                                    <input type="text" name="university_type" placeholder="e.g. Public, Private" value={formData.university_type} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>QS Ranking</label>
                                    <input type="number" name="university_ranking" value={formData.university_ranking} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>Website URL</label>
                                    <input type="url" name="website" placeholder="https://…" value={formData.website} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Pending">Pending</option>
                                    </select>
                                </div>
                                <div className="partners__field">
                                    <label>Partnership Start Date</label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleInputChange} />
                                </div>
                                <div className="partners__field">
                                    <label>Partnership End Date</label>
                                    <input type="date" name="end_date" value={formData.end_date} onChange={handleInputChange} />
                                </div>
                            </div>
                            <div className="partners__modal-actions">
                                <ActionButton variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</ActionButton>
                                <ActionButton variant="primary" type="submit">
                                    {editingUniversity ? 'Update University' : 'Add University'}
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

export default Partners;
