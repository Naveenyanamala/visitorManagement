import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

// Format date and time
export const formatDateTime = (date, formatStr = 'dd/MM/yyyy HH:mm') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return 'Invalid Date';
  
  return format(dateObj, formatStr);
};

// Format date only
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return 'Invalid Date';
  
  return format(dateObj, formatStr);
};

// Format time only
export const formatTime = (date, formatStr = 'HH:mm') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return 'Invalid Date';
  
  return format(dateObj, formatStr);
};

// Relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) return 'Invalid Date';
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

// Format duration in minutes to human readable
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return 'N/A';
  
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format based on length
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Return original if can't format
};

// Capitalize first letter of each word
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Get status badge color
export const getStatusColor = (status) => {
  const statusColors = {
    pending: 'warning',
    accepted: 'success',
    declined: 'danger',
    completed: 'info',
    cancelled: 'danger',
    expired: 'danger',
    'in-progress': 'info',
  };
  
  return statusColors[status] || 'gray';
};

// Get status text
export const getStatusText = (status) => {
  const statusTexts = {
    pending: 'Pending',
    accepted: 'Accepted',
    declined: 'Declined',
    completed: 'Completed',
    cancelled: 'Cancelled',
    expired: 'Expired',
    'in-progress': 'In Progress',
  };
  
  return statusTexts[status] || status;
};

// Get purpose text
export const getPurposeText = (purpose) => {
  const purposeTexts = {
    interview: 'Interview',
    casual: 'Casual Visit',
    delivery: 'Delivery',
    meeting: 'Meeting',
    other: 'Other',
  };
  
  return purposeTexts[purpose] || purpose;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (basic validation)
export const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

// Generate random ID
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension
export const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Check if file is image
export const isImageFile = (file) => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(file.type);
};

// Get initials from name
export const getInitials = (firstName, lastName) => {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last;
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Calculate age from date of birth
export const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : dateOfBirth;
  
  if (!isValid(birthDate)) return null;
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Format currency
export const formatCurrency = (amount, currency = 'INR') => {
  if (amount === null || amount === undefined) return 'N/A';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Get time of day greeting
export const getTimeOfDayGreeting = () => {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

// Check if date is today
export const isToday = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  
  return dateObj.toDateString() === today.toDateString();
};

// Check if date is yesterday
export const isYesterday = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  return dateObj.toDateString() === yesterday.toDateString();
};

// Get relative date text
export const getRelativeDateText = (date) => {
  if (!date) return 'N/A';
  
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  
  return formatRelativeTime(date);
};
