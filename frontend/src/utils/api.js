import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8090/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
// Remove empty/undefined params to avoid sending ?search=
const cleanParams = (params = {}) => {
  return Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );
};


// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      // Redirect ONLY if user is on a protected route
      const path = window.location.pathname;
      const isProtected = path.startsWith('/member') || path.startsWith('/admin');
      if (isProtected) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email, password, userType) => 
    api.post(`/auth/${userType}/login`, { email, password }),
  
  getProfile: () => 
    api.get('/auth/me'),
  
  updateProfile: (data) => 
    api.put('/auth/profile', data),
  
  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  verifyToken: () => 
    api.get('/auth/verify'),
};

export const companiesAPI = {
  getAll: (params = {}) => 
    api.get('/companies', { params: cleanParams(params) }),
  
  getById: (id) => 
    api.get(`/companies/${id}`),
  
  create: (data) => 
    api.post('/companies', data),
  
  update: (id, data) => 
    api.put(`/companies/${id}`, data),
  
  delete: (id) => 
    api.delete(`/companies/${id}`),
  
  uploadLogo: (id, file) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post(`/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  getStats: (id) => 
    api.get(`/companies/${id}/stats`),
};

export const membersAPI = {
  getAll: (params = {}) => 
    api.get('/members', { params: cleanParams(params) }),
  
  getById: (id) => 
    api.get(`/members/public/${id}`),
  
  getByCompany: (companyId, params = {}) => 
    api.get(`/members/company/${companyId}`, { params: cleanParams(params) }),
  
  create: (data) => 
    api.post('/members', data),
  
  update: (id, data) => 
    api.put(`/members/${id}`, data),
  
  delete: (id) => 
    api.delete(`/members/${id}`),
  
  uploadProfilePicture: (id, file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.post(`/members/${id}/profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  addToCompany: (id, companyId, role = 'employee') => 
    api.post(`/members/${id}/companies`, { companyId, role }),
  
  removeFromCompany: (id, companyId) => 
    api.delete(`/members/${id}/companies/${companyId}`),
};

export const visitorsAPI = {
  create: (data) => 
    api.post('/visitors', data),
  
  getByPhone: (phone) => 
    api.get(`/visitors/phone/${phone}`),
  
  getAll: (params = {}) => 
    api.get('/visitors', { params }),
  
  getById: (id) => 
    api.get(`/visitors/${id}`),
  
  update: (id, data) => 
    api.put(`/visitors/${id}`, data),
  
  uploadPhoto: (id, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return api.post(`/visitors/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  uploadIdProof: (id, file, idProofType, idProofNumber) => {
    const formData = new FormData();
    formData.append('idProof', file);
    formData.append('idProofType', idProofType);
    formData.append('idProofNumber', idProofNumber);
    return api.post(`/visitors/${id}/id-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  blacklist: (id, isBlacklisted, reason) => 
    api.put(`/visitors/${id}/blacklist`, { isBlacklisted, reason }),
  
  getStats: () => 
    api.get('/visitors/stats/overview'),
};

export const requestsAPI = {
  create: (data) => 
    api.post('/requests', data),
  
  getByMember: (memberId, params = {}) => 
    api.get(`/requests/member/${memberId}`, { params }),
  
  getByCompany: (companyId, params = {}) => 
    api.get(`/requests/company/${companyId}`, { params }),
  
  getById: (id) => 
    api.get(`/requests/public/${id}`),
  
  getByVisitorPublic: (visitorId) =>
    api.get(`/requests/public/visitor/${visitorId}`),

  getPublic: (params = {}) =>
    api.get('/requests/public', { params: cleanParams(params) }),
  
  updateStatus: (id, action, message, proposedTime) => 
    api.put(`/requests/${id}/status`, { action, message, proposedTime }),
  
  markEntered: (id, entryGate, securityPersonnel) => 
    api.put(`/requests/${id}/enter`, { entryGate, securityPersonnel }),
  
  markExited: (id) => 
    api.put(`/requests/${id}/exit`),
  
  cancel: (id) => 
    api.put(`/requests/${id}/cancel`),
  
  getQueue: (companyId) => 
    api.get(`/requests/queue/${companyId}`),
};

export const adminAPI = {
  getDashboard: () => 
    api.get('/admin/dashboard'),
  
  getAdmins: (params = {}) => 
    api.get('/admin/admins', { params }),
  
  createAdmin: (data) => 
    api.post('/admin/admins', data),
  
  updateAdmin: (id, data) => 
    api.put(`/admin/admins/${id}`, data),
  
  deleteAdmin: (id) => 
    api.delete(`/admin/admins/${id}`),
  
  getAuditLogs: (params = {}) => 
    api.get('/admin/audit-logs', { params }),
  
  forceAcceptRequest: (id) => 
    api.put(`/admin/requests/${id}/force-accept`),
  
  sendNotification: (data) => 
    api.post('/admin/notifications/send', data),
  
  getSettings: () => 
    api.get('/admin/settings'),
  
  getReport: (type, params = {}) => 
    api.get(`/admin/reports/${type}`, { params }),
};

export default api;
