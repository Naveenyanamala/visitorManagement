import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  User,
  Mail,
  Phone,
  Briefcase,
  Building2
} from 'lucide-react';
import { membersAPI, companiesAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { debounce, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminMembers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    position: '',
    companyId: ''
  });

  const { data: companiesData } = useQuery(
    ['companies-for-member'],
    () => companiesAPI.getAll({ limit: 100 }),
    { keepPreviousData: true }
  );

  // Debounced search
  const debouncedSearch = debounce((value) => {
    setDebouncedSearchTerm(value);
  }, 300);

  const { data: membersData, isLoading } = useQuery(
    ['members', { search: debouncedSearchTerm }],
    () => membersAPI.getAll({ search: debouncedSearchTerm, limit: 50 }),
    {
      keepPreviousData: true,
    }
  );

  const deleteMemberMutation = useMutation(membersAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('members');
      toast.success('Member deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete member');
    },
  });

  const createMemberMutation = useMutation(
    (payload) => membersAPI.create(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('members');
        toast.success('Member created successfully');
        setShowCreateModal(false);
        setCreateForm({ firstName: '', lastName: '', email: '', phone: '', employeeId: '', department: '', position: '', companyId: '' });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create member');
      },
    }
  );

  const members = membersData?.data?.data?.members || membersData?.data?.members || [];

  const handleDelete = (memberId, memberName) => {
    if (window.confirm(`Are you sure you want to delete "${memberName}"?`)) {
      deleteMemberMutation.mutate(memberId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600 mt-1">
            Manage company members and their access
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Member
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No members match your search.' : 'Get started by adding your first member.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {member.profilePicture ? (
                      <img
                        src={member.profilePicture}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {getInitials(member.firstName, member.lastName)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Briefcase className="h-4 w-4 mr-1" />
                          <span>{member.position}</span>
                        </div>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-1" />
                          <span>{member.department}</span>
                        </div>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          <span>{member.employeeId}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        {member.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            <span>{member.email}</span>
                          </div>
                        )}
                        {member.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>
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
                      onClick={() => handleDelete(member._id, `${member.firstName} ${member.lastName}`)}
                      disabled={deleteMemberMutation.isLoading}
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
      {/* Create Member Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add Member</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input className="input" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input className="input" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Employee ID</label>
                    <input className="input" value={createForm.employeeId} onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <input className="input" value={createForm.department} onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Position</label>
                    <input className="input" value={createForm.position} onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Company</label>
                    <select className="input" value={createForm.companyId} onChange={(e) => setCreateForm({ ...createForm, companyId: e.target.value })}>
                      <option value="">Select company</option>
                      {(companiesData?.data?.data?.companies || []).map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button onClick={() => setShowCreateModal(false)} className="btn-outline">Cancel</button>
                  <button
                    onClick={() => createMemberMutation.mutate({
                      firstName: createForm.firstName,
                      lastName: createForm.lastName,
                      email: createForm.email,
                      phone: createForm.phone,
                      employeeId: createForm.employeeId,
                      department: createForm.department,
                      position: createForm.position,
                      companies: [{ company: createForm.companyId, role: 'employee' }]
                    })}
                    disabled={createMemberMutation.isLoading || !createForm.firstName || !createForm.lastName || !createForm.email || !createForm.phone || !createForm.employeeId || !createForm.department || !createForm.position || !createForm.companyId}
                    className="btn-primary"
                  >
                    {createMemberMutation.isLoading ? 'Creating...' : 'Create Member'}
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

export default AdminMembers;
