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
    // Remove empty string values - backend expects integers or nothing
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

// Master Data APIs - these endpoints will need to be added to backend or derived from existing data
export const getAcademicYears = async () => {
  try {
    // Assuming there's an endpoint, otherwise we'll fetch from activities
    const response = await apiClient.get('/academic-years');
    return response.data;
  } catch (error) {
    // Fallback: extract unique academic years from activities
    console.warn('Academic years endpoint not found, using fallback');
    return [];
  }
};

export const getQuarters = async (academicYearId) => {
  try {
    const response = await apiClient.post('/quarters', { academic_year_id: academicYearId });
    return response.data;
  } catch (error) {
    console.warn('Quarters endpoint not found');
    return [];
  }
};

export const getCampuses = async () => {
  try {
    const response = await apiClient.get('/campuses');
    return response.data;
  } catch (error) {
    console.warn('Campuses endpoint not found');
    return [];
  }
};

export const getDepartments = async (campusId) => {
  try {
    const response = await apiClient.post('/departments', { campus_id: campusId });
    return response.data;
  } catch (error) {
    console.warn('Departments endpoint not found');
    return [];
  }
};

export const getParameters = async () => {
  try {
    const response = await apiClient.get('/parameters');
    return response.data;
  } catch (error) {
    console.warn('Parameters endpoint not found');
    return [];
  }
};

export default apiClient;
