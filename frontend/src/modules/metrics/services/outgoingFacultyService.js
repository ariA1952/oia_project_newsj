/**
 * Outgoing Faculty — Staff Travel Summary API service.
 * Uses the same apiClient instance pattern as metricsService.js.
 * Isolated — no changes to existing service files.
 */
import apiClient from './metricsService';

const BASE = '/outgoing-faculty';

// ── CRUD ──────────────────────────────────────────────────────────────────────

export const createTravelSummary = async (payload) => {
  try {
    const res = await apiClient.post(BASE + '/', payload);
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const listTravelSummaries = async () => {
  try {
    const res = await apiClient.get(BASE + '/');
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const getTravelSummary = async (summaryId) => {
  try {
    const res = await apiClient.get(`${BASE}/${summaryId}`);
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const updateTravelSummary = async (summaryId, payload) => {
  try {
    const res = await apiClient.put(`${BASE}/${summaryId}`, payload);
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const deleteTravelSummary = async (summaryId) => {
  try {
    const res = await apiClient.delete(`${BASE}/${summaryId}`);
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

// ── Workflow actions ───────────────────────────────────────────────────────────

export const submitTravelSummary = async (summaryId) => {
  try {
    const res = await apiClient.post(`${BASE}/${summaryId}/submit`);
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const approveTravelSummary = async (summaryId) => {
  try {
    const res = await apiClient.post(`${BASE}/${summaryId}/approve`);
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const rejectTravelSummary = async (summaryId, remarks) => {
  try {
    const res = await apiClient.post(`${BASE}/${summaryId}/reject`, { remarks });
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};

export const requestTravelClarification = async (summaryId, remarks) => {
  try {
    const res = await apiClient.post(`${BASE}/${summaryId}/clarification`, { remarks });
    return res.data;
  } catch (err) {
    throw err.response?.data || err.message;
  }
};
