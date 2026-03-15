import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, lazy, Suspense } from 'react'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/shared/ProtectedRoute'
import GuestRoute from './components/shared/GuestRoute'
import AppShell from './components/layout/AppShell'
import LoginPage    from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import EventsPage   from './pages/events/EventsPage'
import EventDetailPage from './pages/events/EventDetailPage'

const MyRegistrationsPage = lazy(() => import('./pages/profile/MyRegistrationsPage'))
const BookmarksPage       = lazy(() => import('./pages/profile/BookmarksPage'))
const ProfilePage         = lazy(() => import('./pages/profile/ProfilePage'))
const NotificationsPage   = lazy(() => import('./pages/notifications/NotificationsPage'))

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: true },
  },
})

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
  </div>
)

let _sessionRestored = false

// Runs restoreSession exactly once on app boot — module-level flag prevents
// React StrictMode double-invoke from firing two refresh requests.
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

            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard"        element={<DashboardPage />} />
                <Route path="/events"           element={<EventsPage />} />
                <Route path="/events/:id"       element={<EventDetailPage />} />
                <Route path="/my-registrations" element={<MyRegistrationsPage />} />
                <Route path="/bookmarks"        element={<BookmarksPage />} />
                <Route path="/profile"          element={<ProfilePage />} />
                <Route path="/notifications"    element={<NotificationsPage />} />
              </Route>
            </Route>

            <Route path="/"             element={<Navigate to="/dashboard" replace />} />
            <Route path="/unauthorized" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </SessionRestorer>
    </BrowserRouter>

    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: { fontSize: '14px', borderRadius: '10px', border: '1px solid #e5e7eb' },
      }}
    />
  </QueryClientProvider>
)

export default App
