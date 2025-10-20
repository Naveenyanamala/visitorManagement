import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  UserCheck, 
  Search, 
  Edit, 
  Ban, 
  CheckCircle,
  User,
  Mail,
  Phone,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { visitorsAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { debounce, getInitials, formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminVisitors = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounced search
  const debouncedSearch = debounce((value) => {
    setDebouncedSearchTerm(value);
  }, 300);

  const { data: visitorsData, isLoading } = useQuery(
    ['visitors', { search: debouncedSearchTerm }],
    () => visitorsAPI.getAll({ search: debouncedSearchTerm, limit: 50 }),
    {
      keepPreviousData: true,
    }
  );

  const blacklistMutation = useMutation(
    ({ visitorId, isBlacklisted, reason }) => 
      visitorsAPI.blacklist(visitorId, isBlacklisted, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('visitors');
        toast.success('Visitor status updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update visitor status');
      },
    }
  );

  const visitors = visitorsData?.data?.visitors || [];

  const handleBlacklist = (visitorId, isBlacklisted, visitorName) => {
    const action = isBlacklisted ? 'blacklist' : 'unblacklist';
    const reason = isBlacklisted ? prompt(`Reason for blacklisting ${visitorName}:`) : '';
    
    if (isBlacklisted && !reason) {
      toast.error('Please provide a reason for blacklisting');
      return;
    }

    blacklistMutation.mutate({ visitorId, isBlacklisted, reason });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Visitors</h1>
        <p className="text-gray-600 mt-1">
          Manage visitor profiles and blacklist status
        </p>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search visitors..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Visitors List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : visitors.length === 0 ? (
            <div className="text-center py-8">
              <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No visitors found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No visitors match your search.' : 'No visitors have registered yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visitors.map((visitor) => (
                <div
                  key={visitor._id}
                  className={`p-4 border rounded-lg transition-colors ${
                    visitor.isBlacklisted 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {visitor.photo ? (
                        <img
                          src={visitor.photo}
                          alt={`${visitor.firstName} ${visitor.lastName}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {getInitials(visitor.firstName, visitor.lastName)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {visitor.firstName} {visitor.lastName}
                          </h3>
                          {visitor.isBlacklisted && (
                            <span className="badge badge-danger">
                              <Ban className="h-3 w-3 mr-1" />
                              Blacklisted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            <span>{visitor.phone}</span>
                          </div>
                          {visitor.email && (
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1" />
                              <span>{visitor.email}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>{visitor.visitCount} visits</span>
                          </div>
                        </div>
                        {visitor.lastVisitDate && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Last visit: {formatDateTime(visitor.lastVisitDate)}</span>
                          </div>
                        )}
                        {visitor.isBlacklisted && visitor.blacklistReason && (
                          <div className="flex items-center text-sm text-red-600 mt-1">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            <span>Reason: {visitor.blacklistReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {/* TODO: Implement edit */}}
                        className="btn-outline text-sm"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleBlacklist(
                          visitor._id, 
                          !visitor.isBlacklisted, 
                          `${visitor.firstName} ${visitor.lastName}`
                        )}
                        disabled={blacklistMutation.isLoading}
                        className={`text-sm ${
                          visitor.isBlacklisted ? 'btn-success' : 'btn-danger'
                        }`}
                      >
                        {visitor.isBlacklisted ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Unblacklist
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            Blacklist
                          </>
                        )}
                      </button>
                    </div>
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

export default AdminVisitors;
