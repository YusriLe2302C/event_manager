import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, lazy, Suspense } from 'react'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/shared/ProtectedRoute'
import GuestRoute from './components/shared/GuestRoute'

const LoginPage    = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'))
const AppShell     = lazy(() => import('./components/layout/AppShell'))
const DashboardPage             = lazy(() => import('./pages/DashboardPage'))
const CreateEventPage           = lazy(() => import('./pages/events/CreateEventPage'))
const EditEventPage             = lazy(() => import('./pages/events/EditEventPage'))
const EventAttendeesPage        = lazy(() => import('./pages/events/EventAttendeesPage'))
const MyEventsPage              = lazy(() => import('./pages/events/MyEventsPage'))
const EventAnalyticsPage        = lazy(() => import('./pages/events/EventAnalyticsPage'))
const EventFilesPage            = lazy(() => import('./pages/events/EventFilesPage'))
const FacultyAnalyticsDashboard = lazy(() => import('./pages/analytics/FacultyAnalyticsDashboard'))
const CollegeProfilePage        = lazy(() => import('./pages/college/CollegeProfilePage'))
const CreateCollegePage         = lazy(() => import('./pages/college/CreateCollegePage'))
const NotificationsPage         = lazy(() => import('./pages/NotificationsPage'))

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true } },
})

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>
)

let _sessionRestored = false

const SessionRestorer = ({ children }) => {
  const { restoreSession } = useAuth()
  useEffect(() => {
    if (_sessionRestored) return
    _sessionRestored = true
    restoreSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return children
}

const App = () => (
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <SessionRestorer>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<GuestRoute />}>
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard"            element={<DashboardPage />} />
                <Route path="/events"               element={<MyEventsPage />} />
                <Route path="/events/create"        element={<CreateEventPage />} />
                <Route path="/events/:id/edit"      element={<EditEventPage />} />
                <Route path="/events/:id/attendees" element={<EventAttendeesPage />} />
                <Route path="/events/:id/analytics" element={<EventAnalyticsPage />} />
                <Route path="/events/:id/files"     element={<EventFilesPage />} />
                <Route path="/analytics"            element={<FacultyAnalyticsDashboard />} />
                <Route path="/college"              element={<CollegeProfilePage />} />
                <Route path="/college/create"       element={<CreateCollegePage />} />
                <Route path="/notifications"        element={<NotificationsPage />} />
              </Route>
            </Route>

            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/unauthorized" element={
              <div className="min-h-screen flex items-center justify-center text-muted">
                Access denied. Faculty accounts only.
              </div>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </SessionRestorer>
    </BrowserRouter>
    <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px', borderRadius: '10px', border: '1px solid #e5e7eb' } }} />
  </QueryClientProvider>
)

export default App
