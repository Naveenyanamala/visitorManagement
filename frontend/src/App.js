import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Public pages
import LandingPage from './pages/LandingPage';
import CompanySelection from './pages/CompanySelection';
import MemberSelection from './pages/MemberSelection';
import VisitorRequest from './pages/VisitorRequest';
import RequestStatus from './pages/RequestStatus';
import PublicVisitors from './pages/PublicVisitors';

// Auth pages
import Login from './pages/auth/Login';

// Member pages
import MemberDashboard from './pages/member/Dashboard';
import MemberRequests from './pages/member/Requests';
import MemberProfile from './pages/member/Profile';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCompanies from './pages/admin/Companies';
import AdminMembers from './pages/admin/Members';
import AdminVisitors from './pages/admin/Visitors';
import AdminRequests from './pages/admin/Requests';
import AdminReports from './pages/admin/Reports';
import AdminSettings from './pages/admin/Settings';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/companies" element={<CompanySelection />} />
              <Route path="/companies/:companyId/members" element={<MemberSelection />} />
              <Route path="/request/:companyId/:memberId" element={<VisitorRequest />} />
              <Route path="/status/:requestId" element={<RequestStatus />} />
              <Route path="/public/visitors" element={<PublicVisitors />} />
              
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Member routes */}
              <Route path="/member" element={
                <ProtectedRoute allowedRoles={['member']}>
                  <Layout>
                    <MemberDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/member/requests" element={
                <ProtectedRoute allowedRoles={['member']}>
                  <Layout>
                    <MemberRequests />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/member/profile" element={
                <ProtectedRoute allowedRoles={['member']}>
                  <Layout>
                    <MemberProfile />
                  </Layout>
                </ProtectedRoute>
              } />
              
              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/companies" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminCompanies />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/members" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminMembers />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/visitors" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminVisitors />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/requests" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminRequests />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminReports />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Layout>
                    <AdminSettings />
                  </Layout>
                </ProtectedRoute>
              } />
              {/* Fallback to Landing for any unknown route */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
