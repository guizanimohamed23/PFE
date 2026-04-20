import { Navigate, Route, Routes } from 'react-router-dom'
import App from './App'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ScanDetailsPage from './pages/ScanDetailsPage'
import ScanHistoryPage from './pages/ScanHistoryPage'
import ScannerPage from './pages/ScannerPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { PublicOnlyRoute } from './routes/PublicOnlyRoute'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<App />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/scans" element={<ScanHistoryPage />} />
        <Route path="/scans/:scanId" element={<ScanDetailsPage />} />
      </Route>

      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
