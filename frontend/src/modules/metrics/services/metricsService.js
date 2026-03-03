import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Partner University APIs ─────────────────────────────────────────────────

export const getPartnerUniversities = async (params = {}) => {
  try {
    const response = await apiClient.post('/partner-university/query', params);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPartnerUniversityById = async (id) => {
  try {
    const response = await apiClient.get(`/partner-university/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const createPartnerUniversity = async (data) => {
  try {
    const response = await apiClient.post('/partner-university', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updatePartnerUniversity = async (id, data) => {
  try {
    const response = await apiClient.put(`/partner-university/${id}`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ─── Collaboration Activity APIs ─────────────────────────────────────────────

export const getCollaborationActivities = async (filters = {}) => {
  try {
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    const response = await apiClient.post('/collaboration-activity/query', cleanFilters);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getCollaborationActivityById = async (id) => {
  try {
    const response = await apiClient.get(`/collaboration-activity/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create a collaboration activity. Supports optional document upload.
 * @param {Object} data - All activity fields plus optional `document` (File object)
 */
export const createCollaborationActivity = async (data) => {
  try {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'document') {
        // File object — append directly
        formData.append('document', value);
      } else if (key === 'activity_data' && typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    const response = await apiClient.post('/collaboration-activity', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update a collaboration activity. Supports optional document upload via FormData.
 * @param {number} id
 * @param {Object} data - Activity fields. Include `document` (File) to upload a new file.
 */
export const updateCollaborationActivity = async (id, data) => {
  try {
    // If there is a file to upload we must use FormData (but the PUT endpoint
    // currently only accepts JSON). For now we strip the document out and use JSON.
    // When the backend update endpoint is upgraded to accept FormData this will
    // automatically use it.
    const { document, ...jsonData } = data;
    const response = await apiClient.put(`/collaboration-activity/${id}`, jsonData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const approveCollaborationActivity = async (id) => {
  try {
    const response = await apiClient.put(`/collaboration-activity/${id}/approve`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const rejectCollaborationActivity = async (id, remarks) => {
  try {
    const formData = new URLSearchParams();
    formData.append('remarks', remarks);
    const response = await apiClient.put(
      `/collaboration-activity/${id}/reject`,
      formData.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Request clarification on a submitted activity (HOD / Admin only).
 */
export const clarifyCollaborationActivity = async (id, remarks) => {
  try {
    const formData = new URLSearchParams();
    formData.append('remarks', remarks);
    const response = await apiClient.put(
      `/collaboration-activity/${id}/clarify`,
      formData.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPendingActivities = async () => {
  try {
    const response = await apiClient.get('/collaboration-activity/pending');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const submitCollaborationActivity = async (id) => {
  try {
    const response = await apiClient.put(`/collaboration-activity/${id}/submit`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getDraftActivities = async (filters = {}) => {
  try {
    const cleanFilters = { ...filters, status: 'DRAFT' };
    const response = await apiClient.post('/collaboration-activity/query', cleanFilters);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get the download URL for an activity document.
 * Returns a URL string that can be used as an <a href> target.
 */
export const getActivityDocumentUrl = (id) => {
  const token = localStorage.getItem('token');
  return `${API_BASE_URL}/collaboration-activity/${id}/document?token=${token}`;
};

// ─── MOU APIs ────────────────────────────────────────────────────────────────

export const getMOUs = async (params = { skip: 0, limit: 200 }) => {
  try {
    const response = await apiClient.post('/mou/query', params);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getMOUById = async (id) => {
  try {
    const response = await apiClient.get(`/mou/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Create an MOU (Admin only). Accepts optional document file.
 */
export const createMOU = async (data) => {
  try {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'document') {
        formData.append('document', value);
      } else {
        formData.append(key, value);
      }
    });
    const response = await apiClient.post('/mou', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Update an MOU (Admin only). Accepts optional document file.
 */
export const updateMOU = async (id, data) => {
  try {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'document') {
        formData.append('document', value);
      } else {
        formData.append(key, value);
      }
    });
    const response = await apiClient.put(`/mou/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Returns a URL for downloading an MOU document.
 */
export const getMOUDocumentUrl = (id) => {
  const token = localStorage.getItem('token');
  return `${API_BASE_URL}/mou/${id}/document?token=${token}`;
};

// ─── Master Data APIs ─────────────────────────────────────────────────────────

export const getAcademicYears = async () => {
  try {
    const response = await apiClient.post('/academic-years', {});
    return response.data;
  } catch (error) {
    console.error('Failed to fetch academic years');
    return [];
  }
};

export const getQuarters = async (academicYearId) => {
  try {
    const response = await apiClient.post('/quarters', { academic_year_id: academicYearId });
    return response.data;
  } catch (error) {
    console.warn('Quarters endpoint failed');
    return [];
  }
};

export const getCampuses = async () => {
  try {
    const response = await apiClient.post('/campuses', {});
    return response.data;
  } catch (error) {
    console.warn('Campuses endpoint failed');
    return [];
  }
};

export const getDepartments = async (campusId) => {
  try {
    const response = await apiClient.post('/departments', { campus_id: campusId });
    return response.data;
  } catch (error) {
    console.warn('Departments endpoint failed');
    return [];
  }
};

export const getParameters = async () => {
  try {
    const response = await apiClient.post('/parameters', {});
    return response.data;
  } catch (error) {
    console.warn('Parameters endpoint failed');
    return [];
  }
};

export const getPartnerUniversitiesList = async () => {
  try {
    const response = await apiClient.post('/partner-university/query', { skip: 0, limit: 1000 });
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch universities');
    return [];
  }
};

// ─── User Profile API ─────────────────────────────────────────────────────────

export const getUserProfile = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const login = async (userId, password) => {
  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', userId);
    formData.append('password', password);

    const response = await apiClient.post('/auth/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default apiClient;
