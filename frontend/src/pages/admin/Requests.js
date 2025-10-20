import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  FileText, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Building2,
  Phone,
  Mail,
  Calendar,
  Timer
} from 'lucide-react';
import { requestsAPI, adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { debounce, formatDateTime, getStatusText, getPurposeText } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminRequests = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounced search
  const debouncedSearch = debounce((value) => {
    setDebouncedSearchTerm(value);
  }, 300);

  const { data: requestsData, isLoading } = useQuery(
    ['admin-requests', { search: debouncedSearchTerm, status: statusFilter }],
    () => requestsAPI.getByCompany('all', { search: debouncedSearchTerm, status: statusFilter, limit: 50 }),
    {
      keepPreviousData: true,
    }
  );

  const forceAcceptMutation = useMutation(adminAPI.forceAcceptRequest, {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-requests');
      toast.success('Request force accepted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to force accept request');
    },
  });

  const requests = requestsData?.data?.requests || [];

  const handleForceAccept = (requestId) => {
    if (window.confirm('Are you sure you want to force accept this request?')) {
      forceAcceptMutation.mutate(requestId);
    }
  };

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
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'declined', label: 'Declined' },
    { value: 'completed', label: 'Completed' },
    { value: 'in-progress', label: 'In Progress' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visitor Requests</h1>
        <p className="text-gray-600 mt-1">
          Monitor and manage all visitor requests across companies
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by visitor name or purpose..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter 
                  ? 'No requests match your current filters.' 
                  : 'No visitor requests have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {getStatusIcon(request.status)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.visitor.firstName} {request.visitor.lastName}
                          </h3>
                          <span className={`badge badge-${request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'danger'}`}>
                            {getStatusText(request.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                              <span>{getPurposeText(request.purpose)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Timer className="h-4 w-4 mr-2" />
                              <span>{request.duration} minutes</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{formatDateTime(request.createdAt)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center text-sm text-gray-600">
                              <Building2 className="h-4 w-4 mr-2" />
                              <span>{request.company.name}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <User className="h-4 w-4 mr-2" />
                              <span>{request.member.firstName} {request.member.lastName}</span>
                            </div>
                            {request.visitor.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                <span>{request.visitor.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {request.purposeDescription && (
                          <div className="mb-4">
                            <p className="text-sm text-gray-600">
                              <strong>Description:</strong> {request.purposeDescription}
                            </p>
                          </div>
                        )}

                        {request.memberResponse && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">
                              <strong>Member Response:</strong> {request.memberResponse.action} - {request.memberResponse.message}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleForceAccept(request._id)}
                        disabled={forceAcceptMutation.isLoading}
                        className="btn-success text-sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Force Accept
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequests;
