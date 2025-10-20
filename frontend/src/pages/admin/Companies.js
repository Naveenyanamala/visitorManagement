import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MapPin,
  Mail,
  Phone,
  Users,
  Clock
} from 'lucide-react';
import { companiesAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminCompanies = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
    description: ''
  });

  // Debounced search
  const debouncedSearch = debounce((value) => {
    setDebouncedSearchTerm(value);
  }, 300);

  const { data: companiesData, isLoading } = useQuery(
    ['companies', { search: debouncedSearchTerm }],
    () => companiesAPI.getAll({ search: debouncedSearchTerm, limit: 50 }),
    {
      keepPreviousData: true,
    }
  );

  const deleteCompanyMutation = useMutation(companiesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('companies');
      toast.success('Company deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete company');
    },
  });

  const createCompanyMutation = useMutation(companiesAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('companies');
      toast.success('Company created successfully');
      setShowCreateModal(false);
      setCreateForm({ name: '', location: '', contactEmail: '', contactPhone: '', description: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create company');
    },
  });

  const companies = companiesData?.data?.data?.companies || companiesData?.data?.companies || [];

  const handleDelete = (companyId, companyName) => {
    if (window.confirm(`Are you sure you want to delete "${companyName}"?`)) {
      deleteCompanyMutation.mutate(companyId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">
            Manage companies and their settings
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No companies match your search.' : 'Get started by adding your first company.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company._id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4 mb-4">
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
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {company.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        {company.location}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="truncate">{company.contactEmail}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{company.contactPhone}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        {company.settings?.workingHours?.start} - {company.settings?.workingHours?.end}
                      </span>
                    </div>
                  </div>

                  {company.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {/* TODO: Implement edit */}}
                      className="btn-outline text-sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(company._id, company.name)}
                      disabled={deleteCompanyMutation.isLoading}
                      className="btn-danger text-sm"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Company</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      className="input"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input
                      type="text"
                      className="input"
                      value={createForm.location}
                      onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Contact Email</label>
                      <input
                        type="email"
                        className="input"
                        value={createForm.contactEmail}
                        onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Contact Phone</label>
                      <input
                        type="text"
                        className="input"
                        value={createForm.contactPhone}
                        onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Description (optional)</label>
                    <textarea
                      rows={3}
                      className="input"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createCompanyMutation.mutate(createForm)}
                    disabled={createCompanyMutation.isLoading || !createForm.name || !createForm.location || !createForm.contactEmail || !createForm.contactPhone}
                    className="btn-primary"
                  >
                    {createCompanyMutation.isLoading ? 'Creating...' : 'Create Company'}
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

export default AdminCompanies;
