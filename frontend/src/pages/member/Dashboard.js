import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ArrowRight,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { requestsAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getStatusText, getRelativeDateText } from '../../utils/helpers';

const MemberDashboard = () => {
  const { user } = useAuth();
  const memberId = user?.id || user?._id;

  const { data: requestsData, isLoading } = useQuery(
    ['member-requests', memberId],
    () => requestsAPI.getByMember(memberId, { limit: 10 }),
    {
      enabled: !!memberId,
    }
  );

  const requests = requestsData?.data?.requests || requestsData?.data?.data?.requests || [];

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  const recentRequests = requests.slice(0, 5);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-warning-600" />;
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'declined':
        return <XCircle className="h-5 w-5 text-danger-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-600" />;
      case 'in-progress':
        return <AlertCircle className="h-5 w-5 text-primary-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
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
          Here's an overview of your visitor requests and recent activity.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Accepted</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.accepted}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-info-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Recent Requests</h2>
            <Link
              to="/member/requests"
              className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
            >
              View all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : recentRequests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests yet</h3>
              <p className="text-gray-600">
                You haven't received any visitor requests yet.
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
                        {request.purpose} • {request.duration} minutes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {getStatusText(request.status)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getRelativeDateText(request.createdAt)}
                      </p>
                    </div>
                    <Link
                      to={`/member/requests/${request._id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/member/requests"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Manage Requests</p>
                  <p className="text-xs text-gray-500">View and respond to visitor requests</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
              </Link>
              <Link
                to="/member/profile"
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Calendar className="h-5 w-5 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Update Profile</p>
                  <p className="text-xs text-gray-500">Manage your profile and preferences</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
              </Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Employee ID</p>
                <p className="text-sm text-gray-900">{user.employeeId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="text-sm text-gray-900">{user.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Position</p>
                <p className="text-sm text-gray-900">{user.position}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Companies</p>
                <p className="text-sm text-gray-900">
                  {user.companies?.length || 0} company(ies)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDashboard;
