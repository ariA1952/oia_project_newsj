import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

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

// ─── Dashboard Summary API ───────────────────────────────────────────────────

export const getDashboardSummary = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    const url = queryString ? `/dashboard/summary?${queryString}` : '/dashboard/summary';
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

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

/**
 * Faculty or Admin suggests a new partner university.
 * @param {Object} data - { university_name, university_code, country, website }
 */
export const suggestPartnerUniversity = async (data) => {
  try {
    const formData = new FormData();
    formData.append('university_name', data.university_name);
    formData.append('university_code', data.university_code);
    if (data.country) formData.append('country', data.country);
    if (data.website) formData.append('website', data.website);
    const response = await apiClient.post('/partner-university/suggest', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/** Admin approves a PENDING_REVIEW university. */
export const approvePartnerUniversity = async (id) => {
  try {
    const response = await apiClient.patch(`/partner-university/${id}/approve`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/** Admin rejects a PENDING_REVIEW university suggestion. */
export const rejectPartnerUniversity = async (id) => {
  try {
    const response = await apiClient.patch(`/partner-university/${id}/reject`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/** Super Admin deletes a partner university. */
export const deletePartnerUniversity = async (id) => {
  try {
    const response = await apiClient.delete(`/partner-university/${id}`);
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

    // Append scalar fields (skip deprecated flat file/uni/date fields)
    const SKIP_KEYS = new Set(['document', 'numeric_value', 'university_id']);
    Object.entries(data).forEach(([key, value]) => {
      if (SKIP_KEYS.has(key)) return;
      if (value === undefined || value === null || value === '') return;
      if (key === 'activity_data' && typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    // Row-based file uploads: rowFiles = [{ rowIndex, docType, file }]
    if (Array.isArray(data.rowFiles)) {
      data.rowFiles.forEach(({ rowIndex, docType, file }) => {
        if (file instanceof File) {
          formData.append(`file_${rowIndex}_${docType}`, file);
        }
      });
    }

    const response = await apiClient.post('/collaboration-activity', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    const serverError = error.response?.data?.detail;
    if (Array.isArray(serverError)) {
      const msg = serverError.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
      throw new Error(msg);
    }
    throw error.response?.data?.message || error.message || 'An unknown error occurred';
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

    const SKIP_KEYS = new Set(['document', 'numeric_value', 'university_id', 'rowFiles']);
    Object.entries(data).forEach(([key, value]) => {
      if (SKIP_KEYS.has(key)) return;
      if (value === undefined || value === null) return;
      if (key === 'activity_data' && typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });

    // Row-based file uploads
    if (Array.isArray(data.rowFiles)) {
      data.rowFiles.forEach(({ rowIndex, docType, file }) => {
        if (file instanceof File) {
          formData.append(`file_${rowIndex}_${docType}`, file);
        }
      });
    }

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

/**
 * Delete a collaboration activity (SUPER_ADMIN only).
 */
export const deleteCollaborationActivity = async (id) => {
  try {
    const response = await apiClient.delete(`/collaboration-activity/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Checks if a duplicate activity exists with overlapping dates for a given parameter and university.
 */
export const checkDuplicateActivity = async (parameter_id, university_id, start_date, end_date, activity_id = null) => {
  if (!parameter_id || !university_id || !start_date || !end_date) {
    return null;
  }
  
  try {
    const params = { parameter_id, university_id, start_date, end_date };
    if (activity_id) params.activity_id = activity_id;
    const response = await apiClient.get('/collaboration-activity/check-duplicate', { params });
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
 * Pass rowIndex, docType, fileIndex to target a specific file upload.
 * Use: const url = await downloadActivityDocument(id, 0, 'report', 0);  window.open(url, '_blank');
 */
export const downloadActivityDocument = async (id, rowIndex, docType, fileIndex) => {
  try {
    const params = new URLSearchParams();
    if (rowIndex !== undefined && rowIndex !== null) params.append('row_index', rowIndex);
    if (docType !== undefined && docType !== null) params.append('doc_type', docType);
    if (fileIndex !== undefined && fileIndex !== null) params.append('file_index', fileIndex);
    const query = params.toString();
    const url = `/collaboration-activity/${id}/document${query ? `?${query}` : ''}`;
    const response = await apiClient.get(url, { responseType: 'blob' });
    return URL.createObjectURL(response.data);
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// getActivityDocumentUrl removed — use downloadActivityDocument(id) instead.

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

/**
 * Delete an MOU (Super Admin only).
 */
export const deleteMOU = async (id) => {
  try {
    const response = await apiClient.delete(`/mou/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/** Update an existing MOU record (Admins only). */
export const updateMOU = async (id, data) => {
  try {
    const formData = new FormData();
    formData.append('university_id', data.university_id);
    formData.append('erp_academic_year_id', data.erp_academic_year_id);
    if (data.mou_type) formData.append('mou_type', data.mou_type);
    if (data.start_date) formData.append('start_date', data.start_date);
    if (data.end_date) formData.append('end_date', data.end_date);
    if (data.status) formData.append('status', data.status);
    if (data.document instanceof File) formData.append('document', data.document);

    // Other documents metadata
    if (data.other_documents_metadata) {
      formData.append('other_documents_metadata', data.other_documents_metadata);
    }
    // Dynamic supporting files
    Object.entries(data).forEach(([key, value]) => {
      if (key.startsWith('other_file_') && value) {
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
 * Download an MOU Other Document with auth via header, returns a temporary Blob URL.
 */
export const downloadMOUOtherDocument = async (id, fileIndex) => {
  try {
    const response = await apiClient.get(
      `/mou/${id}/other-document/${fileIndex}`,
      { responseType: 'blob' }
    );
    return URL.createObjectURL(response.data);
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Fetch detailed other documents list for a specific MOU.
 */
export const getMOUOtherDocuments = async (mouId) => {
  try {
    const response = await apiClient.get(`/mou/${mouId}/other-documents`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// getMOUDocumentUrl removed — use downloadMOUDocument(id) instead.

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
    // Strictly Active — PENDING_REVIEW universities must not appear in dropdowns
    const response = await apiClient.post('/partner-university/query', { status: 'Active', skip: 0, limit: 1000 });
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

// ─── Bulk Operations APIs ──────────────────────────────────────────────────────

/**
 * Download an Excel template for a given parameter.
 * Returns a blob URL that can be used for download.
 */
export const downloadBulkTemplate = async (parameterId) => {
  try {
    const response = await apiClient.get(`/bulk/template/${parameterId}`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Validate an uploaded Excel file against parameter rules.
 * @param {File} file - The Excel file
 * @param {number} parameterId
 * @param {number} academicYearId
 */
export const validateBulkUpload = async (file, parameterId, academicYearId) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('parameter_id', parameterId);
    formData.append('erp_academic_year_id', academicYearId);
    const response = await apiClient.post('/bulk/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Save pre-validated bulk rows.
 */
export const saveBulkEntries = async (data) => {
  try {
    const response = await apiClient.post('/bulk/save', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Submit dynamic multi-entry payload.
 */
export const submitDynamicMultiEntry = async (data) => {
  try {
    const response = await apiClient.post('/bulk/multi-entry', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Get field configuration for a parameter.
 */
export const getFieldConfig = async (parameterId) => {
  try {
    const response = await apiClient.get(`/bulk/field-config/${parameterId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

/**
 * Upload a document for a bulk-created activity.
 */
export const uploadBulkDocument = async (activityId, docType, rowIndex, file) => {
  try {
    const formData = new FormData();
    formData.append('doc_type', docType);
    formData.append('row_index', String(rowIndex));
    formData.append('file', file);
    const response = await apiClient.post(`/bulk/upload-documents/${activityId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export default apiClient;