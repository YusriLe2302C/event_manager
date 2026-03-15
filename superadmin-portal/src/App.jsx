import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect, lazy, Suspense } from 'react'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/shared/ProtectedRoute'
import GuestRoute from './components/shared/GuestRoute'

const LoginPage               = lazy(() => import('./pages/auth/LoginPage'))
const AppShell                = lazy(() => import('./components/layout/AppShell'))
const AnalyticsDashboard      = lazy(() => import('./pages/analytics/AnalyticsDashboard'))
const CollegeVerificationPage = lazy(() => import('./pages/colleges/CollegeVerificationPage'))
const UsersPage               = lazy(() => import('./pages/users/UsersPage'))
const EventModerationPage     = lazy(() => import('./pages/events/EventModerationPage'))
const AdminLogsPage           = lazy(() => import('./pages/logs/AdminLogsPage'))

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
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route element={<AppShell />}>
                <Route path="/dashboard"       element={<AnalyticsDashboard />} />
                <Route path="/colleges" element={<CollegeVerificationPage />} />
                <Route path="/users"           element={<UsersPage />} />
                <Route path="/events"          element={<EventModerationPage />} />
                <Route path="/logs"            element={<AdminLogsPage />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </SessionRestorer>
    </BrowserRouter>
    <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: '14px', borderRadius: '10px', border: '1px solid #e5e7eb' } }} />
  </QueryClientProvider>
)

export default App
