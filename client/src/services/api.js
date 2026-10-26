/**
 * Centralized API Client for AccessPass Frontend
 * Manages HTTP communication with the Express backend, automatically injects
 * JWT Bearer tokens from localStorage, and provides strongly-typed methods.
 */

// Retrieve and sanitize API base URL from Vite environment variables
const rawApiUrl = import.meta.env.VITE_API_BASE_URL;

// In production, require VITE_API_BASE_URL or fallback to relative '/api' if hosted together.
// Never fall back to localhost in production.
export const API_BASE_URL = rawApiUrl
  ? rawApiUrl.trim().replace(/\/+$/, '')
  : (import.meta.env.DEV ? 'http://localhost:5000/api' : '');

if (import.meta.env.PROD && !rawApiUrl) {
  console.warn(
    '[AccessPass] Warning: VITE_API_BASE_URL is not configured in production environment variables. Please configure the Render backend URL in Vercel project settings.'
  );
}

/**
 * Core HTTP Request Wrapper
 * @param {string} endpoint - API path (e.g. '/auth/login')
 * @param {RequestInit} [options] - Standard Fetch options
 * @returns {Promise<any>}
 */
export async function apiRequest(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
  
  // Retrieve token from localStorage
  const token = localStorage.getItem('accesspass_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    // Handle CSV or binary file downloads
    if (options.responseType === 'blob') {
      if (!response.ok) {
        throw new Error(`File download failed with status ${response.status}`);
      }
      return await response.blob();
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data.message || `Request failed with HTTP status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    // Network down / server offline fallback
    if (!error.status) {
      error.message = import.meta.env.DEV
        ? 'Unable to connect to the AccessPass backend server. Please verify Express is running on port 5000.'
        : 'Unable to connect to the AccessPass backend server. Please check your network connection and backend service status.';
    }
    throw error;
  }
}

// ============================================================================
// SYSTEM & HEALTH
// ============================================================================
export const checkServerHealth = () => apiRequest('/health');

// ============================================================================
// AUTHENTICATION
// ============================================================================
export const authApi = {
  login: (email, password) => 
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  getMe: () => apiRequest('/auth/me'),
};

// ============================================================================
// PUBLIC & VISITOR SELF-SERVICE
// ============================================================================
export const publicApi = {
  getBuildings: () => apiRequest('/public/buildings'),
  getHosts: (buildingId) => 
    apiRequest(`/public/hosts${buildingId ? `?building_id=${buildingId}` : ''}`),
  registerVisit: (payload) => 
    apiRequest('/public/visits/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getVisitStatus: (referenceCode) => 
    apiRequest(`/public/visits/${encodeURIComponent(referenceCode)}/status`),
  getVisitByReference: (referenceCode) => 
    apiRequest(`/public/visits/${encodeURIComponent(referenceCode)}`),
  verifyVisitAccess: (referenceCode, verificationSecret) => 
    apiRequest(`/public/visits/${encodeURIComponent(referenceCode)}/verify-access`, {
      method: 'POST',
      body: JSON.stringify({ verificationSecret }),
    }),
  registerStaff: (payload) => 
    apiRequest('/public/staff/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ============================================================================
// HOST PORTAL
// ============================================================================
export const hostApi = {
  getRequests: (status) => 
    apiRequest(`/host/requests${status ? `?status=${status}` : ''}`),
  approveRequest: (requestId) => 
    apiRequest(`/host/requests/${requestId}/approve`, {
      method: 'PATCH',
    }),
  rejectRequest: (requestId, reason) => 
    apiRequest(`/host/requests/${requestId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
  revokeRequest: (requestId, reason) =>
    apiRequest(`/host/requests/${requestId}/revoke`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};

// ============================================================================
// SECURITY CHECKPOINT
// ============================================================================
export const securityApi = {
  verifyPass: (code) => 
    apiRequest('/security/verify-pass', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
  checkIn: (passId, gate, remarks) => 
    apiRequest('/security/check-in', {
      method: 'POST',
      body: JSON.stringify({ passId, gate, remarks }),
    }),
  checkOut: (passId, gate, remarks) => 
    apiRequest('/security/check-out', {
      method: 'POST',
      body: JSON.stringify({ passId, gate, remarks }),
    }),
  getTodayLogs: () => apiRequest('/security/today-logs'),
};

// ============================================================================
// ADMIN PORTAL
// ============================================================================
export const adminApi = {
  getStats: () => apiRequest('/admin/stats'),
  
  // Users
  getUsers: () => apiRequest('/admin/users'),
  createUser: (payload) => 
    apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id, payload) => 
    apiRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteUser: (id) => 
    apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
  approveStaff: (id, payload) => 
    apiRequest(`/admin/users/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload || {}),
    }),
  rejectStaff: (id, reason) => 
    apiRequest(`/admin/users/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // Buildings
  getBuildings: () => apiRequest('/admin/buildings'),
  createBuilding: (payload) => 
    apiRequest('/admin/buildings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBuilding: (id, payload) => 
    apiRequest(`/admin/buildings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Blacklist
  getBlacklist: () => apiRequest('/admin/blacklist'),
  addBlacklist: (payload) => 
    apiRequest('/admin/blacklist', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  removeBlacklist: (id) => 
    apiRequest(`/admin/blacklist/${id}`, {
      method: 'DELETE',
    }),

  // Audit Logs & Export
  getAuditLogs: (limit = 100) => 
    apiRequest(`/admin/audit-logs?limit=${limit}`),
  downloadVisitsCSV: async () => {
    const blob = await apiRequest('/admin/reports/visits-csv', { responseType: 'blob' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `accesspass_visits_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
