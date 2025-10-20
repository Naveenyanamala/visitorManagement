import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Building2, 
  Phone, 
  Mail,
  Calendar,
  Timer,
  FileText,
  RefreshCw
} from 'lucide-react';
import { requestsAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  formatDateTime, 
  formatDuration, 
  getStatusText, 
  getPurposeText,
  getRelativeDateText 
} from '../utils/helpers';
import { useSocket } from '../contexts/SocketContext';

const RequestStatus = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { on } = useSocket();

  const { data: requestData, isLoading, error, refetch } = useQuery(
    ['request', requestId],
    () => requestsAPI.getById(requestId),
    {
      enabled: !!requestId,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Listen for real-time updates
  useEffect(() => {
    const handleRequestUpdate = (data) => {
      if (data.request.id === requestId) {
        setLastUpdated(new Date());
        refetch();
      }
    };

    on('request-update', handleRequestUpdate);
  }, [on, requestId, refetch]);

  const request = requestData?.data?.data?.request || requestData?.data?.request || requestData?.data?.requests;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-6 w-6 text-warning-600" />;
      case 'accepted':
        return <CheckCircle className="h-6 w-6 text-success-600" />;
      case 'declined':
        return <XCircle className="h-6 w-6 text-danger-600" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-success-600" />;
      case 'cancelled':
        return <XCircle className="h-6 w-6 text-danger-600" />;
      case 'in-progress':
        return <Timer className="h-6 w-6 text-primary-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Your request is pending approval. You will be notified once the member responds.';
      case 'accepted':
        return 'Your request has been accepted! You can now proceed to the reception desk.';
      case 'declined':
        return 'Your request has been declined. Please contact the member directly or submit a new request.';
      case 'completed':
        return 'Your visit has been completed. Thank you for visiting!';
      case 'cancelled':
        return 'Your request has been cancelled.';
      case 'in-progress':
        return 'You have entered the premises. Your visit is in progress.';
      default:
        return 'Request status unknown.';
    }
  };

  const getNextSteps = (status) => {
    switch (status) {
      case 'pending':
        return [
          'Wait for the member to respond to your request',
          'You will receive an email/SMS notification when they respond',
          'Check back here for status updates'
        ];
      case 'accepted':
        return [
          'Proceed to the reception desk at the company',
          'Show this page or your phone number to the security personnel',
          'You will be directed to meet the member'
        ];
      case 'declined':
        return [
          'Contact the member directly if you have their contact information',
          'Submit a new request with a different purpose or time',
          'Try again later if the member is currently unavailable'
        ];
      case 'completed':
        return [
          'Thank you for your visit!',
          'You can submit a new request anytime for future visits',
          'Rate your experience if prompted'
        ];
      case 'in-progress':
        return [
          'Your visit is currently in progress',
          'Make sure to check out when you leave',
          'Contact security if you need assistance'
        ];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Not Found</h2>
          <p className="text-gray-600 mb-4">
            The request you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Home
            </button>
            <button
              onClick={() => refetch()}
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon(request.status)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {getStatusText(request.status)}
            </h1>
            <p className="text-gray-600 mb-4">
              {getStatusMessage(request.status)}
            </p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              <Clock className="h-4 w-4 mr-1" />
              Last updated: {getRelativeDateText(lastUpdated)}
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Visitor Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Visitor Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{request.visitor.firstName} {request.visitor.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {request.visitor.phone}
                </p>
              </div>
              {request.visitor.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {request.visitor.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Visit Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Visit Details
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Purpose</label>
                <p className="text-gray-900">{getPurposeText(request.purpose)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Duration</label>
                <p className="text-gray-900 flex items-center">
                  <Timer className="h-4 w-4 mr-1" />
                  {formatDuration(request.duration)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Requested At</label>
                <p className="text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDateTime(request.createdAt)}
                </p>
              </div>
              {request.purposeDescription && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900">{request.purposeDescription}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Company and Member Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Company Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Company</label>
                <p className="text-gray-900">{request.company.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Location</label>
                <p className="text-gray-900">{request.company.location}</p>
              </div>
              {request.company.contactPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Contact</label>
                  <p className="text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {request.company.contactPhone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Member Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Host Information
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900">{request.member.firstName} {request.member.lastName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Position</label>
                <p className="text-gray-900">{request.member.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Department</label>
                <p className="text-gray-900">{request.member.department}</p>
              </div>
              {request.member.phone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-gray-900 flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    {request.member.phone}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Queue Information */}
        {request.status === 'pending' && request.queuePosition > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{request.queuePosition}</div>
                <div className="text-sm text-gray-500">Position in Queue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning-600">
                  {request.estimatedWaitTime || 0}
                </div>
                <div className="text-sm text-gray-500">Estimated Wait (minutes)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {formatDateTime(request.createdAt, 'HH:mm')}
                </div>
                <div className="text-sm text-gray-500">Request Time</div>
              </div>
            </div>
          </div>
        )}

        {/* Member Response */}
        {request.memberResponse && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Response</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Action</label>
                <p className="text-gray-900 capitalize">{request.memberResponse.action}</p>
              </div>
              {request.memberResponse.message && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <p className="text-gray-900">{request.memberResponse.message}</p>
                </div>
              )}
              {request.memberResponse.proposedTime && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Proposed Time</label>
                  <p className="text-gray-900">{formatDateTime(request.memberResponse.proposedTime)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Responded At</label>
                <p className="text-gray-900">{formatDateTime(request.memberResponse.respondedAt)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Entry Details */}
        {request.entryDetails && (request.entryDetails.enteredAt || request.entryDetails.exitedAt) && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Entry Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {request.entryDetails.enteredAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Entry Time</label>
                  <p className="text-gray-900">{formatDateTime(request.entryDetails.enteredAt)}</p>
                </div>
              )}
              {request.entryDetails.exitedAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Exit Time</label>
                  <p className="text-gray-900">{formatDateTime(request.entryDetails.exitedAt)}</p>
                </div>
              )}
              {request.entryDetails.entryGate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Entry Gate</label>
                  <p className="text-gray-900">{request.entryDetails.entryGate}</p>
                </div>
              )}
              {request.totalDuration && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Duration</label>
                  <p className="text-gray-900">{formatDuration(request.totalDuration)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Steps */}
        {getNextSteps(request.status).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h2>
            <ul className="space-y-2">
              {getNextSteps(request.status).map((step, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">{index + 1}</span>
                  </div>
                  <p className="text-gray-700">{step}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={() => navigate('/')}
            className="btn-outline"
          >
            Back to Home
          </button>
          {request.status === 'declined' && (
            <button
              onClick={() => navigate(`/companies/${request.company._id}/members`)}
              className="btn-primary"
            >
              Submit New Request
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default RequestStatus;
