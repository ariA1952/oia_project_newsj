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

// Helper: check if a stored JWT is expired
function isStoredTokenExpired() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

// Interceptor to handle 401 Unauthorized (expired/invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const is401 = error.response?.status === 401;
    // Fallback: if no response (CORS blocked the 401), check token expiry directly
    const isNetworkErrorWithExpiredToken = !error.response && isStoredTokenExpired();

    if (is401 || isNetworkErrorWithExpiredToken) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
    // If it's a 422, error.response.data usually contains a 'detail' array
    const serverError = error.response?.data?.detail;

    if (Array.isArray(serverError)) {
      // Take the first error message and its location (e.g., "body.project_id: field required")
      const msg = serverError.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
      throw new Error(msg);
    }

    throw error.response?.data?.message || error.message || "An unknown error occurred";
  }
};

/**
 * Update a collaboration activity. Supports optional document upload via FormData.
 * @param {number} id
 * @param {Object} data - Activity fields. Include `document` (File) to upload a new file.
 */
export const updateCollaborationActivity = async (id, data) => {
  try {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'document') {
        if (value instanceof File) {
          formData.append('document', value);
        }
      } else if (key === 'activity_data' && typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    const response = await apiClient.put(`/collaboration-activity/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
 * Initial request for clarification (HOD / Admin only). Changes status to CLARIFICATION_REQUESTED.
 */
export const requestClarification = async (id, remarks) => {
  try {
    const formData = new URLSearchParams();
    formData.append('remarks', remarks);
    const response = await apiClient.put(
      `/collaboration-activity/${id}/request-clarification`,
      formData.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Send a reply in the clarification thread.
 */
export const sendClarificationReply = async (id, message) => {
  try {
    const response = await apiClient.post(
      `/collaboration-activity/${id}/clarify`,
      { message }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get all clarifications for an activity.
 */
export const getClarifications = async (id) => {
  try {
    const response = await apiClient.get(`/collaboration-activity/${id}/clarifications`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getPendingActivities = async () => {
  // Alias for getCollaborationActivities — the dedicated /pending endpoint
  // does not exist on the backend. Fetch all and filter client-side.
  try {
    const response = await apiClient.post('/collaboration-activity/query', { status: 'SUBMITTED' });
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
    // Strip empty string values, then force status filter
    const cleanFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
    cleanFilters.status = 'DRAFT';
    const response = await apiClient.post('/collaboration-activity/query', cleanFilters);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Download an activity document with auth via header, returns a temporary Blob URL.
 * Use: const url = await downloadActivityDocument(id);  window.open(url, '_blank');
 */
export const downloadActivityDocument = async (id) => {
  try {
    const response = await apiClient.get(
      `/collaboration-activity/${id}/document`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(response.data);
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * @deprecated Use downloadActivityDocument(id) instead.
 * Returns a URL with the token embedded as a query parameter (auth header not sent).
 */
export const getActivityDocumentUrl = (id) => {
  const token = localStorage.getItem('token');
  return `${API_BASE_URL}/collaboration-activity/${id}/document?token=${token}`;
};

// ─── MOU APIs ────────────────────────────────────────────────────────────────

export const getMOUs = async () => {
  try {
    const response = await apiClient.post('/mou/query');
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
};

/**
 * Download an MOU document with auth via header, returns a temporary Blob URL.
 */
export const downloadMOUDocument = async (id) => {
  try {
    const response = await apiClient.get(
      `/mou/${id}/document`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(response.data);
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/** @deprecated Use downloadMOUDocument(id) instead. */
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

/**
 * Fetch all campus-department mappings to resolve erp_campus_department_mapping_id → names.
 */
export const getCampusDeptMappings = async () => {
  try {
    const response = await apiClient.post('/campus-dept-mappings', {});
    return response.data;
  } catch (error) {
    console.warn('Campus-dept mappings endpoint failed');
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