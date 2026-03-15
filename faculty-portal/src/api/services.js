import api from './axios'

export const authApi = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register/faculty', data),
  refresh:  ()     => api.post('/auth/refresh'),
  logout:   ()     => api.post('/auth/logout'),
}

export const userApi = {
  getMe:    ()     => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
}

export const eventApi = {
  getAll:          (params)   => api.get('/events', { params }),
  getMyEvents:     (params)   => api.get('/events', { params: { ...params, myEvents: true } }),
  getById:         (id)       => api.get(`/events/${id}`),
  getAnalytics:    (id)       => api.get(`/events/${id}/analytics`),
  getMyAnalytics:  ()         => api.get('/events/analytics/summary'),
  create:          (form)     => api.post('/events', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update:          (id, form) => api.put(`/events/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete:          (id)       => api.delete(`/events/${id}`),
  getFiles:        (id)       => api.get(`/events/${id}/files`),
  deleteFile:      (id, body) => api.delete(`/events/${id}/files`, { data: body }),
  replaceWorkshop: (id, form) => api.patch(`/events/${id}/files/replace-workshop`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadBanner:    (id, form) => api.post(`/events/${id}/upload-banner`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadDocuments: (id, form) => api.post(`/events/${id}/upload-documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const collegeApi = {
  getAll:      (params)    => api.get('/colleges', { params }),
  getMine:     ()          => api.get('/colleges/my'),
  getById:     (id)        => api.get(`/colleges/${id}`),
  create:      (form)      => api.post('/colleges', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update:      (id, form)  => api.put(`/colleges/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  submitEdit:  (form)      => api.patch('/colleges/my/edit', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export const registrationApi = {
  getEventAttendees: (eventId, params) =>
    api.get(`/registrations/events/${eventId}/attendees`, { params }),
  exportAttendees: (eventId) =>
    api.get(`/registrations/events/${eventId}/export`, { responseType: 'blob' }),
  closeRegistration: (eventId) =>
    api.put(`/registrations/events/${eventId}/close`),
  updateSeatLimit: (eventId, data) =>
    api.put(`/registrations/events/${eventId}/seats`, data),
  checkIn: (eventId, registrationId) =>
    api.put(`/registrations/events/${eventId}/checkin/${registrationId}`),
}

export const notificationApi = {
  getAll:      (params) => api.get('/notifications', { params }),
  markRead:    (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead: ()       => api.put('/notifications/read-all'),
  delete:      (id)     => api.delete(`/notifications/${id}`),
}
