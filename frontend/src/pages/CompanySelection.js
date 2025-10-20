import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Building2, Search, ArrowRight, MapPin, Clock, Users } from 'lucide-react';
import { companiesAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { debounce } from '../utils/helpers';

const CompanySelection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  const debouncedSearch = debounce((value) => {
    setDebouncedSearchTerm(value);
  }, 300);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const { data: companiesData, isLoading, error } = useQuery(
    ['companies', { search: debouncedSearchTerm }],
    () => companiesAPI.getAll({ search: debouncedSearchTerm, limit: 20 }),
    {
      keepPreviousData: true,
    }
  );

  const companies = companiesData?.data?.data?.companies || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Krishe Emerald</h1>
            </Link>
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Select Your Company
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the company you want to visit from the list below.
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
              onChange={handleSearchChange}
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
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No companies found
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms.' : 'No companies are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Link
                key={company._id}
                to={`/companies/${company._id}/members`}
                className="card hover:shadow-lg transition-all duration-200 group hover:scale-105"
              >
                <div className="card-body">
                  <div className="flex items-start space-x-4 mb-4">
                    {company.logo ? (
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-primary-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">
                        {company.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        {company.location}
                      </div>
                    </div>
                  </div>

                  {company.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        {company.settings?.workingHours?.start} - {company.settings?.workingHours?.end}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        {company.settings?.allowWalkIns ? 'Walk-ins allowed' : 'Appointment only'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Click to select members
                    </span>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
          >
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
};

export default CompanySelection;
