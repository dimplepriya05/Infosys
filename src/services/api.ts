import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { getToken, clearToken } from '@/utils/helpers';

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401 / 403 ────────────────────────────────

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('ics:session_expired'));
    }
    if (error.response?.status === 403) {
      window.dispatchEvent(new CustomEvent('ics:unauthorized'));
    }
    if (error.response?.status === 503) {
      window.dispatchEvent(new CustomEvent('ics:maintenance', { detail: error.response?.data?.message }));
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── API helpers (mock-aware) ─────────────────────────────────────────────────

export async function mockDelay(ms = 600): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (email: string, password: string) => {
    return api.post('/auth/login', { email, password });
  },
  register: async (data: unknown) => {
    return api.post('/auth/register', data);
  },
  logout: async () => {
    await mockDelay(200);
    clearToken();
  },
  refreshToken: async () => {
    return api.post('/auth/refresh');
  },
  forgotPassword: async (_email: string) => {
    await mockDelay(1000);
    return { data: { message: "If an account exists, a reset link has been sent to your email." } };
  },
};

// ─── Claims API ───────────────────────────────────────────────────────────────

export const claimsApi = {
  list:   (params?: Record<string, string>) => api.get('/claims', { params }),
  get:    (id: string)  => api.get(`/claims/${id}`),
  create: (data: unknown) => api.post('/claims', data),
  update: (id: string, data: unknown) => api.patch(`/claims/${id}`, data),
  delete: (id: string) => api.delete(`/claims/${id}`),
  addNote:      (id: string, note: string, internalOnly: boolean = false) => api.post(`/claims/${id}/notes`, { content: note, internalOnly }),
  changeStatus: (id: string, status: string) => api.patch(`/claims/${id}/status`, { status }),
  decide:       (id: string, data: unknown) => api.post(`/claims/${id}/decision`, data),
  saveDraft:    (data: unknown) => api.post('/claims/draft', data),
  withdraw:     (id: string) => api.patch(`/claims/${id}/withdraw`),
  transition:   (id: string, data: unknown) => api.patch(`/claims/${id}/workflow`, data),
  assign:       (id: string, data: unknown) => api.patch(`/claims/${id}/assign`, data),
  bulkAssign:   (data: unknown) => api.post(`/claims/bulk-assign`, data),
  triage:       (id: string, data: unknown) => api.post(`/claims/${id}/triage`, data),
  bulkUpload:   (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/claims/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  
  // Assessments
  getAssessment: (id: string) => api.get(`/claims/${id}/assessment`),
  saveAssessment: (id: string, data: unknown) => api.post(`/claims/${id}/assessment`, data),
  
  // Reserves
  getReserveHistory: (id: string) => api.get(`/claims/${id}/reserves`),
  updateReserve: (id: string, data: unknown) => api.post(`/claims/${id}/reserves`, data),
  
  // Financial
  getFinancialSuggestions: (id: string) => api.get(`/claims/${id}/financial/suggestions`),
  saveFinancial: (id: string, data: unknown) => api.put(`/claims/${id}/financial`, data),

};

export const claimRfiApi = {
  list: (claimId: string) => api.get(`/claims/${claimId}/rfis`),
  create: (claimId: string, data: { requestedInfo: string; dueDate: string }) => api.post(`/claims/${claimId}/rfis`, data),
  fulfill: (claimId: string, rfiId: number, documentId: number) => api.post(`/claims/${claimId}/rfis/${rfiId}/fulfill/${documentId}`),
};

export const appealsApi = {
  submit: (claimId: string, data: { reason: string; justification: string }) => api.post(`/claims/${claimId}/appeals`, data),
  list:   (claimId: string) => api.get(`/claims/${claimId}/appeals`),
  listAll: () => api.get('/claims/0/appeals/all'),
  export: () => api.get('/claims/0/appeals/export', { responseType: 'blob' }),
};

// ─── Policies API ─────────────────────────────────────────────────────────────

export const policiesApi = {
  list:   (params?: Record<string, string>) => api.get('/policies', { params }),
  get:    (id: string) => api.get(`/policies/${id}`),
  create: (data: unknown) => api.post('/policies', data),
  update: (id: string, data: unknown) => api.patch(`/policies/${id}`, data),
};

// ─── Underwriter API ──────────────────────────────────────────────────────────

export const underwriterApi = {
  listPending: (params?: Record<string, string>) => api.get('/underwriter/claims', { params }),
  getClaim: (id: string) => api.get(`/underwriter/claims/${id}`),
  validate: (id: string, data: { status: string; notes: string }) => api.post(`/underwriter/claims/${id}/validate`, data),
};


// ─── Documents API ────────────────────────────────────────────────────────────

export const documentsApi = {
  upload:   (claimId: string, file: File, category?: string, internalOnly?: boolean, onProgress?: (progressEvent: any) => void) => {
    const form = new FormData();
    form.append('file', file);
    if (category) form.append('category', category);
    const url = `/documents/claims/${claimId}/upload` + (internalOnly ? '?internalOnly=true' : '');
    return api.post(url, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  replace: (documentId: string, file: File, onProgress?: (progressEvent: any) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/documents/${documentId}/replace`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  list:     (claimId: string) => api.get(`/documents/claims/${claimId}`),
  download: (id: string)      => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete:   (id: string)      => api.delete(`/documents/${id}`),
};



// ─── Reports API ──────────────────────────────────────────────────────────────

export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  exportClaims: (params?: Record<string, string>) => api.get('/reports/export/claims', { params, responseType: 'blob' }),
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  list:   ()               => api.get('/admin/users'),
  get:    (id: number)     => api.get(`/users/${id}`),
  create: (data: unknown)  => api.post('/users', data),
  update: (id: number, data: unknown) => api.patch(`/users/${id}`, data),
  updateUser: (id: number, data: unknown) => api.put(`/admin/users/${id}`, data),
  toggleStatus: (id: number, active: boolean) => api.patch(`/admin/users/${id}/activate?active=${active}`),
  bulkUpload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/admin/users/bulk', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadRolesPdf: ()     => api.get('/admin/reports/roles-pdf', { responseType: 'blob' }),
  delete: (id: number)     => api.delete(`/users/${id}`),
  getProfile:    () => api.get('/users/profile'),
  updateProfile: (data: unknown) => api.put('/users/profile', data),
  updatePreferences: (data: unknown) => api.put('/users/profile/preferences', data),
  changePassword: (data: unknown) => api.patch('/users/profile/change-password', data),
  exportProfilePdf: () => api.get('/users/profile/export', { responseType: 'blob' }),
};

// ─── Audit API ────────────────────────────────────────────────────────────────

export const auditApi = {
  list:   (params?: Record<string, string>) => api.get('/audit', { params }),
  export: ()                                => api.get('/audit/export', { responseType: 'blob' }),
};

// ─── Settings API ─────────────────────────────────────────────────────────────

export const settingsApi = {
  getPasswordPolicy:         ()              => api.get('/settings/password-policy'),
  updatePasswordPolicy:      (data: unknown) => api.put('/settings/password-policy', data),
  getWorkflowRules:          ()              => api.get('/settings/workflow-rules'),
  updateWorkflowRules:       (data: unknown) => api.put('/settings/workflow-rules', data),
  getNotificationTemplates:  ()              => api.get('/settings/notification-templates'),
  updateNotificationTemplate:(id: string, data: unknown) => api.put(`/settings/notification-templates/${id}`, data),
  export:                    ()              => api.get('/settings/export', { responseType: 'blob' }),
};

// ─── Payments API ─────────────────────────────────────────────────────────────

export const paymentsApi = {
  getAll:    ()                               => api.get('/payments'),
  initiate:  (claimId: number, data: unknown) => api.post(`/payments/claims/${claimId}/initiate`, data),
  confirm:   (paymentId: number)              => api.patch(`/payments/${paymentId}/confirm`),
  retry:     (paymentId: number)              => api.post(`/payments/${paymentId}/retry`),
  getByClaim:(claimId: number)                => api.get(`/payments/claims/${claimId}`),
  reconcile: (data: unknown)                  => api.post(`/payments/reconcile`, data),
  export:    ()                               => api.get(`/payments/export`, { responseType: 'blob' }),
  downloadReceipt: (paymentId: number)        => api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' }),
};
