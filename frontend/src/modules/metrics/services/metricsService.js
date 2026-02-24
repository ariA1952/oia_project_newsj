import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Partner University APIs
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

// Collaboration Activity APIs
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

export const createCollaborationActivity = async (data) => {
  try {
    const response = await apiClient.post('/collaboration-activity', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateCollaborationActivity = async (id, data) => {
  try {
    const response = await apiClient.put(`/collaboration-activity/${id}`, data);
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

export const rejectCollaborationActivity = async (id) => {
  try {
    const response = await apiClient.put(`/collaboration-activity/${id}/reject`);
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

// Master Data APIs - Updated to use POST as required by backend
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

// Auth API
export const login = async (userId, password) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', userId);
    formData.append('password', password);

    const response = await apiClient.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Interceptor to add Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
