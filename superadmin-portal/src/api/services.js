import api from './axios'

export const authApi = {
  login:   (data) => api.post('/auth/login', data),
  refresh: ()     => api.post('/auth/refresh'),
  logout:  ()     => api.post('/auth/logout'),
}

export const userApi = {
  getMe: () => api.get('/users/me'),
}

export const adminApi = {
  // Colleges
  getPendingColleges: (params)     => api.get('/admin/colleges/pending', { params }),
  getCollegeProfile:  (id)         => api.get(`/admin/colleges/${id}/profile`),
  verifyCollege:      (id)         => api.patch(`/admin/colleges/${id}/verify`),
  rejectCollege:      (id, body)   => api.patch(`/admin/colleges/${id}/reject`, body),
  reviewCollege:      (id, body)   => api.put(`/admin/colleges/${id}/review`, body),

  // College edits
  getPendingCollegeEdits: (params)   => api.get('/admin/colleges/pending-edits', { params }),
  approveCollegeEdit:     (id)       => api.patch(`/admin/colleges/${id}/approve-edit`),
  rejectCollegeEdit:      (id, body) => api.patch(`/admin/colleges/${id}/reject-edit`, body),

  // Users
  getUsers:           (params)     => api.get('/admin/users', { params }),
  toggleUserStatus:   (id, body)   => api.put(`/admin/users/${id}/toggle`, body),

  // Events
  getPendingEvents:   (params)     => api.get('/admin/events/pending', { params }),
  moderateEvent:      (id, body)   => api.put(`/admin/events/${id}/moderate`, body),
  approveEvent:       (id)         => api.patch(`/admin/events/${id}/approve`),
  rejectEvent:        (id, body)   => api.patch(`/admin/events/${id}/reject`, body),

  // Logs
  getLogs:            (params)     => api.get('/admin/logs', { params }),

  // Analytics
  getAnalytics:          ()           => api.get('/admin/analytics'),
  getCollegeLeaderboard: (params)     => api.get('/admin/analytics/colleges', { params }),
  getPopularEvents:      (params)     => api.get('/admin/analytics/events', { params }),
  getRegistrationTrend:  (params)     => api.get('/admin/analytics/registrations/trend', { params }),
}

export const eventApi = {
  getAll:  (params) => api.get('/events', { params }),
  getById: (id)     => api.get(`/events/${id}`),
}

export const collegeApi = {
  getAll:  (params) => api.get('/colleges', { params }),
  getById: (id)     => api.get(`/colleges/${id}`),
}
