import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AuthCallback from './pages/AuthCallback'
import AcceptInvitation from './pages/AcceptInvitation'
import Dashboard from './pages/Dashboard'
import Tenders from './pages/Tenders'
import Users from './pages/Users'
import NotFound from './pages/NotFound'
import BidFeesPage from './pages/bid-fees/page'
import TaskTimelinePage from './pages/task-timeline/page'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/invitations/:token" element={<AcceptInvitation />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/tenders" element={
            <ProtectedRoute>
              <Tenders />
            </ProtectedRoute>
          } />

          <Route path="/task-timeline" element={
            <ProtectedRoute>
              <TaskTimelinePage />
            </ProtectedRoute>
          } />

          <Route path="/bid-fees" element={
            <ProtectedRoute requireAdmin>
              <BidFeesPage />
            </ProtectedRoute>
          } />
          
          <Route path="/users" element={
            <ProtectedRoute requireAdmin>
              <Users />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

