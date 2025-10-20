import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { useForm } from 'react-hook-form';
import { 
  ArrowLeft, 
  User, 
  Building2, 
  FileText, 
  Camera,
  CheckCircle
} from 'lucide-react';
import { companiesAPI, membersAPI, visitorsAPI, requestsAPI } from '../utils/api';
import ImageCapture from '../components/ImageCapture';
import LoadingSpinner from '../components/LoadingSpinner';
import { isValidEmail, isValidPhone } from '../utils/helpers';
import toast from 'react-hot-toast';

const VisitorRequest = () => {
  const { companyId, memberId } = useParams();
  const navigate = useNavigate();
  const [visitorPhoto, setVisitorPhoto] = useState(null);
  const [existingVisitor, setExistingVisitor] = useState(null);
  const [isCheckingVisitor, setIsCheckingVisitor] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      purpose: 'casual',
      duration: 30,
      purposeDescription: '',
      scheduledTime: '',
    }
  });

  const phoneValue = watch('phone');

  // Fetch company and member details
  const { data: companyData, isLoading: isLoadingCompany, error: companyError } = useQuery(
    ['company', companyId],
    () => companiesAPI.getById(companyId),
    { enabled: !!companyId }
  );

  const { data: memberData, isLoading: isLoadingMember, error: memberError } = useQuery(
    ['member', memberId],
    () => membersAPI.getById(memberId),
    { enabled: !!memberId }
  );

  // Check for existing visitor when phone number changes
  useEffect(() => {
    const checkExistingVisitor = async () => {
      if (phoneValue && phoneValue.length >= 10) {
        setIsCheckingVisitor(true);
        try {
          const response = await visitorsAPI.getByPhone(phoneValue);
          if (response.data.success) {
            const visitor = response.data.data.visitor;
            setExistingVisitor(visitor);
            
            // Pre-fill form with existing visitor data
            setValue('firstName', visitor.firstName);
            setValue('lastName', visitor.lastName);
            setVisitorPhoto(visitor.photo);
            
            toast.success('Found existing visitor profile!');
          } else {
            setExistingVisitor(null);
          }
        } catch (error) {
          setExistingVisitor(null);
        } finally {
          setIsCheckingVisitor(false);
        }
      } else {
        setExistingVisitor(null);
      }
    };

    const timeoutId = setTimeout(checkExistingVisitor, 500);
    return () => clearTimeout(timeoutId);
  }, [phoneValue, setValue]);

  // Create visitor mutation
  const createVisitorMutation = useMutation(visitorsAPI.create, {
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create visitor profile');
    }
  });

  // Upload visitor photo mutation
  const uploadPhotoMutation = useMutation(
    ({ visitorId, file }) => visitorsAPI.uploadPhoto(visitorId, file),
    {
      onError: (error) => {
        toast.error('Failed to upload photo');
      }
    }
  );

  // Create request mutation
  const createRequestMutation = useMutation(requestsAPI.create, {
    onSuccess: (response) => {
      if (response.data.success) {
        toast.success('Visit request submitted successfully!');
        navigate(`/status/${response.data.data.request.id}`);
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    }
  });

  const onSubmit = async (data) => {
    try {
      // Create or update visitor
      let visitorId;
      if (existingVisitor) {
        visitorId = existingVisitor.id;
      } else {
        const visitorData = {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        };
        
        const visitorResponse = await createVisitorMutation.mutateAsync(visitorData);
        visitorId = visitorResponse.data.data.visitor.id;
      }

      // Upload photo if captured
      if (visitorPhoto && !existingVisitor?.photo) {
        // Convert data URL to file
        const response = await fetch(visitorPhoto);
        const blob = await response.blob();
        const file = new File([blob], 'visitor-photo.jpg', { type: 'image/jpeg' });
        
        await uploadPhotoMutation.mutateAsync({ visitorId, file });
      }

      // Create request
      const requestData = {
        visitorId,
        companyId,
        memberId,
        purpose: data.purpose,
        duration: parseInt(data.duration),
        purposeDescription: data.purposeDescription || undefined,
        scheduledTime: data.scheduledTime || undefined,
      };

      await createRequestMutation.mutateAsync(requestData);
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const company = companyData?.data?.data?.company;
  const member = memberData?.data?.data?.member;

  // Show loader only while fetching; otherwise render with fallbacks
  if (isLoadingCompany || isLoadingMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const purposes = [
    { value: 'casual', label: 'Casual Visit' },
    { value: 'interview', label: 'Interview' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'other', label: 'Other' },
  ];

  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' },
    { value: 480, label: '8 hours' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <button
              onClick={() => navigate(`/companies/${companyId}/members`)}
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Members
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company and Member Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-4">
              {company?.logo ? (
                <img
                  src={company.logo}
                  alt={company?.name || 'Company'}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary-600" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{company?.name || 'Company'}</h2>
                <p className="text-gray-600">{company?.location || ''}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {member?.profilePicture ? (
                <img
                  src={member.profilePicture}
                  alt={`${member?.firstName || ''} ${member?.lastName || ''}`}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary-600" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {member?.firstName || ''} {member?.lastName || ''}
                </h2>
                <p className="text-gray-600">{member?.position || ''}{member?.department ? ` - ${member.department}` : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Request a Visit</h1>
            <p className="text-gray-600">
              Please fill in your details to request a visit with {member?.firstName || ''} {member?.lastName || ''}.
            </p>
          </div>

          {existingVisitor && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-800 font-medium">
                  Welcome back! We found your existing profile.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`input ${errors.firstName ? 'input-error' : ''}`}
                    {...register('firstName', { required: 'First name is required' })}
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`input ${errors.lastName ? 'input-error' : ''}`}
                    {...register('lastName', { required: 'Last name is required' })}
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="label">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      className={`input ${errors.phone ? 'input-error' : ''}`}
                      {...register('phone', { 
                        required: 'Phone number is required',
                        validate: (value) => isValidPhone(value) || 'Invalid phone number'
                      })}
                    />
                    {isCheckingVisitor && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
                {/* Email input removed intentionally */}
              </div>
            </div>

            {/* Photo Capture */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Photo
              </h3>
              <ImageCapture
                onImageCapture={setVisitorPhoto}
                initialImage={existingVisitor?.photo}
                required={!!company?.settings?.requirePhoto}
              />
            </div>

            {/* Visit Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Visit Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`input ${errors.purpose ? 'input-error' : ''}`}
                    {...register('purpose', { required: 'Purpose is required' })}
                  >
                    {purposes.map((purpose) => (
                      <option key={purpose.value} value={purpose.value}>
                        {purpose.label}
                      </option>
                    ))}
                  </select>
                  {errors.purpose && (
                    <p className="text-red-500 text-sm mt-1">{errors.purpose.message}</p>
                  )}
                </div>
                <div>
                  <label className="label">
                    Duration <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`input ${errors.duration ? 'input-error' : ''}`}
                    {...register('duration', { required: 'Duration is required' })}
                  >
                    {durationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Purpose Description (Optional)</label>
                <textarea
                  rows={3}
                  className={`input ${errors.purposeDescription ? 'input-error' : ''}`}
                  placeholder="Please provide additional details about your visit..."
                  {...register('purposeDescription', {
                    maxLength: { value: 200, message: 'Description cannot exceed 200 characters' }
                  })}
                />
                {errors.purposeDescription && (
                  <p className="text-red-500 text-sm mt-1">{errors.purposeDescription.message}</p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(`/companies/${companyId}/members`)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createRequestMutation.isLoading}
                className="btn-primary"
              >
                {createRequestMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default VisitorRequest;
