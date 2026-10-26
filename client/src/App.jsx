import React from 'react';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import StaffRegister from './pages/StaffRegister';
import RegisterVisit from './pages/RegisterVisit';
import PassView from './pages/PassView';
import PassLookup from './pages/PassLookup';

// Host Pages
import HostDashboard from './pages/host/HostDashboard';
import HostRequestDetail from './pages/host/HostRequestDetail';

// Security Pages
import SecurityTerminal from './pages/security/SecurityTerminal';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManager from './pages/admin/UserManager';
import BuildingManager from './pages/admin/BuildingManager';
import BlacklistManager from './pages/admin/BlacklistManager';
import AuditLogsReport from './pages/admin/AuditLogsReport';

// Error Pages
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';

/**
 * Public Layout wrapper that includes top Navbar and bottom Footer
 */
function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* ========================================================== */}
          {/* 1. PUBLIC ROUTES (Self-Service & Info)                     */}
          {/* ========================================================== */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/staff-register" element={<StaffRegister />} />
            <Route path="/register-visit" element={<RegisterVisit />} />
            <Route path="/pass-lookup" element={<PassLookup />} />
            <Route path="/status-lookup" element={<PassLookup />} />
            <Route path="/pass/:referenceCode" element={<PassView />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ========================================================== */}
          {/* 2. AUTHENTICATED DASHBOARD ROUTES (Role-Guarded)            */}
          {/* ========================================================== */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Host Portal Routes */}
            <Route
              path="/host/requests"
              element={
                <ProtectedRoute allowedRoles={['host', 'admin']}>
                  <HostDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/requests/:id"
              element={
                <ProtectedRoute allowedRoles={['host', 'admin']}>
                  <HostRequestDetail />
                </ProtectedRoute>
              }
            />

            {/* Security Checkpoint Terminal */}
            <Route
              path="/security/terminal"
              element={
                <ProtectedRoute allowedRoles={['security', 'admin']}>
                  <SecurityTerminal />
                </ProtectedRoute>
              }
            />

            {/* Administrator Management Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/buildings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BuildingManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/blacklist"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <BlacklistManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogsReport />
                </ProtectedRoute>
              }
            />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
