import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Building2, Users, Clock, Shield, ArrowRight, Search } from 'lucide-react';
import { companiesAPI, requestsAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

const LandingPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: companiesData, isLoading, error } = useQuery(
    ['companies', { search: searchTerm }],
    () => companiesAPI.getAll({ search: searchTerm, limit: 12 }),
    {
      keepPreviousData: true,
    }
  );

  const companies = companiesData?.data?.data?.companies || [];

  const { data: publicReqData, isFetching: isFetchingRequests } = useQuery(
    ['public-requests', page],
    () => requestsAPI.getPublic({ page, limit: 10 })
  );
  const visitorRequests = publicReqData?.data?.data?.requests || publicReqData?.data?.requests || [];

  const features = [
    {
      icon: Building2,
      title: 'Company Management',
      description: 'Efficiently manage multiple companies and their members in one centralized system.',
    },
    {
      icon: Users,
      title: 'Member Directory',
      description: 'Easy access to company members with search and filter capabilities.',
    },
    {
      icon: Clock,
      title: 'Queue Management',
      description: 'Real-time queue tracking with estimated wait times for visitors.',
    },
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Secure visitor registration with photo capture and ID verification.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Krishe Emerald</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to{' '}
            <span className="text-primary-600">Krishe Emerald</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Streamline your visitor management process with our comprehensive system. 
            From registration to queue management, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/companies"
              className="btn-primary text-lg px-8 py-3 inline-flex items-center"
            >
              Start Your Visit
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/login"
              className="btn-outline text-lg px-8 py-3"
            >
              Member Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Our System?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our visitor management system is designed to make your experience seamless and efficient.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Select Your Company
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose from our registered companies to start your visit request.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Companies Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No companies found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <Link
                  key={company._id}
                  to={`/companies/${company._id}/members`}
                  className="card hover:shadow-lg transition-shadow duration-200 group"
                >
                  <div className="card-body">
                    <div className="flex items-start space-x-4">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {company.name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {company.location}
                        </p>
                        {company.description && (
                          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                            {company.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        {company.settings?.workingHours?.start} - {company.settings?.workingHours?.end}
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* View All Button */}
          {companies.length > 0 && (
            <div className="text-center mt-8">
              <Link
                to="/companies"
                className="btn-outline inline-flex items-center"
              >
                View All Companies
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recent Visitor Requests (public) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Recent Visitor Requests
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A snapshot of the latest requests across companies. Click view to see full status.
            </p>
          </div>

          <div className="max-w-2xl mx-auto card">
            <div className="card-body">
              {isFetchingRequests ? (
                <div className="flex justify-center py-6"><span className="text-gray-500">Loading...</span></div>
              ) : visitorRequests.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-600">No recent requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visitorRequests.map((req) => (
                    <div key={req._id} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Company</p>
                        <p className="text-gray-900 font-medium">{req.company?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Host</p>
                        <p className="text-gray-900 font-medium">{req.member?.firstName} {req.member?.lastName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Purpose</p>
                        <p className="text-gray-900 font-medium capitalize">{req.purpose}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className="badge badge-info capitalize">{req.status}</span>
                      </div>
                      <div>
                        <a href={`/status/${req._id}`} className="btn-outline">View</a>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2 pt-2">
                    <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-outline">Prev</button>
                    <button onClick={() => setPage((p) => p + 1)} className="btn-outline">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building2 className="h-6 w-6 text-primary-400" />
                <h3 className="ml-2 text-lg font-semibold">Krishe Emerald</h3>
              </div>
              <p className="text-gray-400">
                Streamlining visitor management for modern businesses.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/companies" className="text-gray-400 hover:text-white transition-colors">
                    Companies
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors">
                    Login
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                For support and inquiries, please contact your company administrator.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Krishe Emerald. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
