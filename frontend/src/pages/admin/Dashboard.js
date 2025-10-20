import React from 'react';
import { useQuery } from 'react-query';
import { 
  Building2, 
  Users, 
  UserCheck, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDateTime, getRelativeDateText } from '../../utils/helpers';

const AdminDashboard = () => {
  const { user } = useAuth();

  const { data: dashboardData, isLoading } = useQuery(
    'admin-dashboard',
    adminAPI.getDashboard,
    {
      enabled: !!user,
    }
  );

  const overview = dashboardData?.data?.overview || {};
  const recentRequests = dashboardData?.data?.recentRequests || [];
  const requestsByStatus = dashboardData?.data?.requestsByStatus || [];
  const requestsByPurpose = dashboardData?.data?.requestsByPurpose || [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-warning-600" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-sm p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user.firstName}!
        </h1>
        <p className="text-primary-100">
          Here's an overview of your visitor management system.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Companies</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.totalCompanies || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.totalMembers || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-info-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Visitors</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.totalVisitors || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{overview.pendingRequests || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Recent Requests</h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
              <p className="text-gray-600">
                No visitor requests have been submitted yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRequests.map((request) => (
                <div
                  key={request._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(request.status)}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {request.visitor.firstName} {request.visitor.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {request.purpose} • {request.company.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {request.status}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRelativeDateText(request.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Requests by Status</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {requestsByStatus.map((item) => (
                <div key={item._id} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{item._id}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Requests by Purpose</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {requestsByPurpose.map((item) => (
                <div key={item._id} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{item._id}</span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
