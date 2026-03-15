import api from './axios'

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login:    (data)       => api.post('/auth/login', data),
  register: (data)       => api.post('/auth/register', data),
  refresh:  ()           => api.post('/auth/refresh'),
  logout:   ()           => api.post('/auth/logout'),
}

// ── User / Profile ────────────────────────────────────────────────
export const userApi = {
  getMe:           ()     => api.get('/users/me'),
  updateMe:        (data) => api.put('/users/me', data),
  uploadResume:    (form) => api.post('/users/me/resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getBookmarks:    ()     => api.get('/users/me/bookmarks'),
  toggleBookmark:  (id)   => api.post(`/users/me/bookmarks/${id}`),
}

// ── Events ────────────────────────────────────────────────────────
export const eventApi = {
  getAll:  (params) => api.get('/events', { params }),
  getById: (id)     => api.get(`/events/${id}`),
  search:  (params) => api.get('/events/search', { params }),
}

// ── Registrations ─────────────────────────────────────────────────
export const registrationApi = {
  register:    (eventId, data) => api.post(`/registrations/events/${eventId}`, data),
  cancel:      (eventId, data) => api.delete(`/registrations/events/${eventId}`, { data }),
  getMine:     (params)        => api.get('/registrations/my', { params }),
  getStatus:   (eventId)       => api.get(`/registrations/events/${eventId}/status`),
}

// ── Notifications ─────────────────────────────────────────────────
export const notificationApi = {
  getAll:             (params) => api.get('/notifications', { params }),
  markRead:           (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:        ()       => api.put('/notifications/read-all'),
  deleteNotification: (id)     => api.delete(`/notifications/${id}`),
}

// ── Colleges ──────────────────────────────────────────────────────
export const collegeApi = {
  getAll:  (params) => api.get('/colleges', { params }),
  getById: (id)     => api.get(`/colleges/${id}`),
}
