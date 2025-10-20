import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { requestsAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { 
  formatDateTime, 
  getStatusColor, 
  getStatusText, 
  getPurposeText,
  debounce 
} from '../../utils/helpers';
import toast from 'react-hot-toast';

const MemberRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseData, setResponseData] = useState({
    action: '',
    message: '',
    proposedTime: ''
  });

  // Debounced search
  const debouncedSearch = debounce((value) => {
    setSearchTerm(value);
  }, 300);

  const { data: requestsData, isLoading } = useQuery(
    ['member-requests', user.id, { search: searchTerm, status: statusFilter }],
    () => requestsAPI.getByMember(user.id, { 
      search: searchTerm, 
      status: statusFilter,
      limit: 50 
    }),
    {
      enabled: !!user.id,
    }
  );

  const updateRequestMutation = useMutation(
    ({ requestId, action, message, proposedTime }) =>
      requestsAPI.updateStatus(requestId, action, message, proposedTime),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['member-requests', user.id]);
        setShowResponseModal(false);
        setSelectedRequest(null);
        setResponseData({ action: '', message: '', proposedTime: '' });
        toast.success('Request updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update request');
      },
    }
  );

  const requests = (requestsData?.data?.requests || requestsData?.data?.data?.requests || []);

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

  const handleResponse = (request) => {
    setSelectedRequest(request);
    setShowResponseModal(true);
  };

  const handleSubmitResponse = () => {
    if (!responseData.action) {
      toast.error('Please select an action');
      return;
    }

    if (responseData.action === 'reschedule' && !responseData.proposedTime) {
      toast.error('Please provide a proposed time for rescheduling');
      return;
    }

    updateRequestMutation.mutate({
      requestId: selectedRequest._id,
      action: responseData.action,
      message: responseData.message,
      proposedTime: responseData.proposedTime || undefined,
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitor Requests</h1>
          <p className="text-gray-600 mt-1">
            Manage and respond to visitor requests
          </p>
        </div>
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
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter 
                  ? 'No requests match your current filters.' 
                  : 'You haven\'t received any visitor requests yet.'}
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
                          <span className={`badge badge-${getStatusColor(request.status)}`}>
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
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{request.duration} minutes</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2" />
                              <span>{formatDateTime(request.createdAt)}</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {request.visitor.phone && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Phone className="h-4 w-4 mr-2" />
                                <span>{request.visitor.phone}</span>
                              </div>
                            )}
                            {request.visitor.email && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Mail className="h-4 w-4 mr-2" />
                                <span>{request.visitor.email}</span>
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
                            <div className="flex items-center mb-2">
                              <MessageSquare className="h-4 w-4 text-gray-600 mr-2" />
                              <span className="text-sm font-medium text-gray-900">Your Response</span>
                            </div>
                            <p className="text-sm text-gray-600">
                              <strong>Action:</strong> {request.memberResponse.action}
                            </p>
                            {request.memberResponse.message && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Message:</strong> {request.memberResponse.message}
                              </p>
                            )}
                            {request.memberResponse.proposedTime && (
                              <p className="text-sm text-gray-600 mt-1">
                                <strong>Proposed Time:</strong> {formatDateTime(request.memberResponse.proposedTime)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleResponse(request)}
                        className="btn-primary text-sm"
                      >
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowResponseModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Respond to Request
                </h3>
                
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Visitor:</strong> {selectedRequest.visitor.firstName} {selectedRequest.visitor.lastName}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Purpose:</strong> {getPurposeText(selectedRequest.purpose)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Action</label>
                    <select
                      value={responseData.action}
                      onChange={(e) => setResponseData({ ...responseData, action: e.target.value })}
                      className="input"
                    >
                      <option value="">Select an action</option>
                      <option value="accept">Accept</option>
                      <option value="decline">Decline</option>
                      <option value="reschedule">Reschedule</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Message (Optional)</label>
                    <textarea
                      rows={3}
                      value={responseData.message}
                      onChange={(e) => setResponseData({ ...responseData, message: e.target.value })}
                      placeholder="Add a message for the visitor..."
                      className="input"
                    />
                  </div>

                  {responseData.action === 'reschedule' && (
                    <div>
                      <label className="label">Proposed Time</label>
                      <input
                        type="datetime-local"
                        value={responseData.proposedTime}
                        onChange={(e) => setResponseData({ ...responseData, proposedTime: e.target.value })}
                        className="input"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowResponseModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitResponse}
                    disabled={updateRequestMutation.isLoading}
                    className="btn-primary"
                  >
                    {updateRequestMutation.isLoading ? 'Sending...' : 'Send Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberRequests;
