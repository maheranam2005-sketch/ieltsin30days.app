
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

const ProtectedRoute = () => {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-teal-500">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-current border-t-transparent" />
      </div>
    )
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute
