import { useState, useEffect } from 'react';
import { Plus, Edit2, Globe, MapPin, ExternalLink, Search } from 'lucide-react';
import ActionButton from '../../../common/ActionButton';
import Loader from '../../../common/Loader';
import Notification from '../../../common/Notification';
import { useAuth } from '../../../common/AuthContext';
import {
    getPartnerUniversities,
    createPartnerUniversity,
    updatePartnerUniversity
} from '../services/metricsService';
import './Partners.css';

const Partners = () => {
    const { user } = useAuth();
    const isAdmin = ['OIA_ADMIN', 'SUPER_ADMIN'].includes(user?.erp_users_type);

    const [universities, setUniversities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingUniversity, setEditingUniversity] = useState(null);
    const [formData, setFormData] = useState({
        university_name: '',
        university_code: '',
        university_type: '',
        country: '',
        university_ranking: '',
        website: '',
        status: 'Active',
        start_date: '',
        end_date: '',
    });

    useEffect(() => {
        fetchUniversities();
    }, []);

    const fetchUniversities = async () => {
        setLoading(true);
        try {
            const data = await getPartnerUniversities({ skip: 0, limit: 1000 });
            setUniversities(data);
        } catch (error) {
            setNotification({
                message: 'Failed to fetch partner universities',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleOpenModal = (university = null) => {
        if (university) {
            setEditingUniversity(university);
            setFormData({
                university_name: university.university_name || '',
                university_code: university.university_code || '',
                university_type: university.university_type || '',
                country: university.country || '',
                university_ranking: university.university_ranking || '',
                website: university.website || '',
                status: university.status || 'Active',
                start_date: university.start_date || '',
                end_date: university.end_date || '',
            });
        } else {
            setEditingUniversity(null);
            setFormData({
                university_name: '',
                university_code: '',
                university_type: '',
                country: '',
                university_ranking: '',
                website: '',
                status: 'Active',
                start_date: '',
                end_date: '',
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
            setNotification({
                message: error.detail || 'Failed to save university',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredUniversities = universities.filter(uni =>
        uni.university_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uni.university_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && universities.length === 0) {
        return <Loader fullscreen />;
    }

    return (
        <div className="partners">
            <div className="partners__header">
                <div>
                    <h1 className="partners__title">Partner Universities</h1>
                    <p className="partners__subtitle">Manage international partner institutions and collaborations</p>
                </div>
                {isAdmin && (
                    <ActionButton variant="primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} style={{ marginRight: '8px' }} />
                        Add Partner
                    </ActionButton>
                )}
            </div>

            <div className="partners__search-bar">
                <Search size={20} className="partners__search-icon" />
                <input
                    type="text"
                    placeholder="Search by name, country or code..."
                    className="partners__search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="partners__content">
                <div className="partners__grid-header">
                    <span>University Name</span>
                    <span>Location</span>
                    <span>Type / Rank</span>
                    <span>Partnership Duration</span>
                    <span>Status</span>
                    {isAdmin && <span>Actions</span>}
                </div>

                <div className="partners__list">
                    {filteredUniversities.length === 0 ? (
                        <div className="partners__empty">No partner universities found.</div>
                    ) : (
                        filteredUniversities.map(uni => (
                            <div key={uni.university_id} className="partners__row">
                                <div className="partners__col-name">
                                    <div className="partners__uni-name">{uni.university_name}</div>
                                    <div className="partners__uni-code">{uni.university_code}</div>
                                </div>
                                <div className="partners__col-location">
                                    <div className="partners__country">
                                        <MapPin size={14} style={{ marginRight: '4px' }} />
                                        {uni.country}
                                    </div>
                                    {uni.website && (
                                        <a href={uni.website} target="_blank" rel="noopener noreferrer" className="partners__website">
                                            <Globe size={14} style={{ marginRight: '4px' }} />
                                            Website
                                            <ExternalLink size={10} style={{ marginLeft: '4px' }} />
                                        </a>
                                    )}
                                </div>
                                <div className="partners__col-rank">
                                    <div className="partners__type">{uni.university_type || 'N/A'}</div>
                                    <div className="partners__rank">QS Rank: {uni.university_ranking || 'N/A'}</div>
                                </div>
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
                                <div className="partners__col-status">
                                    <span className={`status-badge status-badge--${uni.status?.toLowerCase() || 'active'}`}>
                                        {uni.status || 'Active'}
                                    </span>
                                </div>
                                {isAdmin && (
                                    <div className="partners__col-actions">
                                        <ActionButton variant="secondary" onClick={() => handleOpenModal(uni)}>
                                            <Edit2 size={16} />
                                        </ActionButton>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {showModal && (
                <div className="partners__modal-overlay">
                    <div className="partners__modal">
                        <h2 className="partners__modal-title">
                            {editingUniversity ? 'Edit Partner University' : 'Add New Partner University'}
                        </h2>
                        <form onSubmit={handleSubmit} className="partners__form">
                            <div className="partners__form-grid">
                                <div className="partners__field">
                                    <label>University Name *</label>
                                    <input
                                        type="text"
                                        name="university_name"
                                        required
                                        value={formData.university_name}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="partners__field">
                                    <label>University Code *</label>
                                    <input
                                        type="text"
                                        name="university_code"
                                        required
                                        value={formData.university_code}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="partners__field">
                                    <label>Country</label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="partners__field">
                                    <label>University Type</label>
                                    <input
                                        type="text"
                                        name="university_type"
                                        placeholder="e.g. Public, Private"
                                        value={formData.university_type}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="partners__field">
                                    <label>QS Ranking</label>
                                    <input
                                        type="number"
                                        name="university_ranking"
                                        value={formData.university_ranking}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="partners__field">
                                    <label>Website URL</label>
                                    <input
                                        type="url"
                                        name="website"
                                        placeholder="https://..."
                                        value={formData.website}
                                        onChange={handleInputChange}
                                    />
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
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="partners__field">
                                    <label>Partnership End Date</label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                            <div className="partners__modal-actions">
                                <ActionButton variant="secondary" type="button" onClick={() => setShowModal(false)}>
                                    Cancel
                                </ActionButton>
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
