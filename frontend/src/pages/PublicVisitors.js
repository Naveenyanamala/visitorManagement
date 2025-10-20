import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { requestsAPI } from '../utils/api';
import { Calendar, User } from 'lucide-react';
import { formatDateTime } from '../utils/helpers';

const PublicVisitors = () => {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery(
    ['public-requests', page],
    () => requestsAPI.getPublic({ page, limit: 20 })
  );

  const requests = data?.data?.requests || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Recent Visitor Requests</h1>
          <p className="text-gray-600">Public view of the latest requests across companies</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="card-body">
            {isFetching ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 text-gray-600">No recent requests.</div>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <div key={req._id} className="border rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="text-gray-900 font-medium">{req.company?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Host</p>
                      <p className="text-gray-900 font-medium">{req.member?.firstName} {req.member?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Visitor</p>
                      <p className="text-gray-900 font-medium flex items-center"><User className="h-4 w-4 mr-1" />{req.visitor?.firstName} {req.visitor?.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Requested</p>
                      <p className="text-gray-900 font-medium flex items-center"><Calendar className="h-4 w-4 mr-1" />{formatDateTime(req.createdAt)}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span className="badge badge-info capitalize">{req.status}</span>
                      <a href={`/status/${req._id}`} className="btn-outline">View</a>
                    </div>
                  </div>
                ))}
                {!!pagination && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="btn-outline"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page >= pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-outline"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicVisitors;


