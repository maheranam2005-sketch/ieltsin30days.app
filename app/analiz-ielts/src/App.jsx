import { Route, Routes, Navigate } from 'react-router-dom'
import ProtectedRoute from './auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import PlanPage from './pages/PlanPage'
import LessonPage from './pages/LessonPage'
import MockTestsPage from './pages/MockTestsPage'
import MockTestPlayerPage from './pages/MockTestPlayerPage'
import PerformancePage from './pages/PerformancePage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/lesson/:dayNumber" element={<LessonPage />} />
        <Route path="/mock-tests" element={<MockTestsPage />} />
        <Route path="/mock-tests/:testId" element={<MockTestPlayerPage />} />
        <Route path="/performance" element={<PerformancePage />} />
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}

export default App
