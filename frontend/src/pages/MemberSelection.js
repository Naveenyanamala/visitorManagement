import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  ArrowLeft, 
  Search, 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Briefcase,
  ArrowRight 
} from 'lucide-react';
import { companiesAPI, membersAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { debounce, getInitials } from '../utils/helpers';

const MemberSelection = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
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

  // Fetch company details
  const { data: companyData } = useQuery(
    ['company', companyId],
    () => companiesAPI.getById(companyId),
    {
      enabled: !!companyId,
    }
  );

  // Fetch members for the company
  const { data: membersData, isLoading, error } = useQuery(
    ['members', companyId, { search: debouncedSearchTerm }],
    () => membersAPI.getByCompany(companyId, { search: debouncedSearchTerm, limit: 20 }),
    {
      enabled: !!companyId,
      keepPreviousData: true,
    }
  );

  const company = companyData?.data?.data?.company;
  const members = membersData?.data?.data?.members || [];

  const handleMemberSelect = (memberId) => {
    navigate(`/request/${companyId}/${memberId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/companies" className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Krishe Emerald</h1>
            </Link>
            <Link
              to="/companies"
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Companies
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Info */}
        {company && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center space-x-4">
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <p className="text-gray-600">{company.location}</p>
                {company.description && (
                  <p className="text-gray-500 text-sm mt-1">{company.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Select a Member to Visit
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the person you want to meet from the company members list.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Members Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-600 font-medium">Failed to load members</p>
              <p className="text-red-500 text-sm mt-1">
                Please check your connection and try again.
              </p>
            </div>
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No members found
            </h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms.' : 'No members are currently available for this company.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member) => (
              <Link
                key={member._id}
                to={`/request/${companyId}/${member._id}`}
                className="card hover:shadow-lg transition-all duration-200 group hover:scale-105"
              >
                <div className="card-body">
                  <div className="flex items-start space-x-4 mb-4">
                    {member.profilePicture ? (
                      <img
                        src={member.profilePicture}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-primary-600">
                          {getInitials(member.firstName, member.lastName)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{member.employeeId}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <Briefcase className="h-4 w-4 mr-2" />
                      <span>{member.position}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Building2 className="h-4 w-4 mr-2" />
                      <span>{member.department}</span>
                    </div>
                    {member.email && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-2" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      Click to request visit
                    </span>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Back to Companies */}
        <div className="text-center mt-8">
          <Link
            to="/companies"
            className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Companies
          </Link>
        </div>
      </main>
    </div>
  );
};

export default MemberSelection;
