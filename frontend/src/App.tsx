import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import CasesPage from './pages/CasesPage'
import RegisterPage from './pages/RegisterPage'
    import UsersAdminPage from './pages/UsersAdminPage'
    import BucketsAdminPage from './pages/BucketsAdminPage'
import DocumentsPage from './pages/DocumentsPage'
import UsersPage from './pages/UsersPage'
import ProfilePage from './pages/ProfilePage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="cases" element={<CasesPage />} />
       <Route path="documents" element={<DocumentsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="/register" element={<RegisterPage />} />
    <Route path="/" element={<Layout />}>
      {/* rutas existentes... */}
      <Route path="users-admin" element={<UsersAdminPage />} />
      <Route path="buckets-admin" element={<BucketsAdminPage />} />
      </Route>
    </Routes>
  )
}

export default App
