import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Settings as SettingsIcon, 
  Save, 
  Bell, 
  Mail, 
  MessageSquare,
  Shield,
  Database,
  Globe
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
    },
    security: {
      maxLoginAttempts: 5,
      lockoutDuration: 2,
      sessionTimeout: 7,
    },
    limits: {
      maxFileSize: 5,
      maxRequestsPerHour: 100,
      maxVisitorsPerDay: 1000,
    }
  });

  const { data: settingsData, isLoading } = useQuery(
    'admin-settings',
    adminAPI.getSettings,
    {
      onSuccess: (response) => {
        if (response.data.success) {
          setSettings(response.data.data.settings);
        }
      }
    }
  );

  const updateSettingsMutation = useMutation(
    (newSettings) => adminAPI.updateSettings(newSettings),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-settings');
        toast.success('Settings updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update settings');
      },
    }
  );

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure system-wide settings and preferences
        </p>
      </div>

      {/* Notification Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Settings
          </h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">Enable email notifications for system events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.notifications.emailEnabled}
                  onChange={(e) => handleChange('notifications', 'emailEnabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                <p className="text-sm text-gray-500">Enable SMS notifications for urgent events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.notifications.smsEnabled}
                  onChange={(e) => handleChange('notifications', 'smsEnabled', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Security Settings
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Max Login Attempts</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.security.maxLoginAttempts}
                onChange={(e) => handleChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Lockout Duration (hours)</label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.security.lockoutDuration}
                onChange={(e) => handleChange('security', 'lockoutDuration', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Session Timeout (days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.security.sessionTimeout}
                onChange={(e) => handleChange('security', 'sessionTimeout', parseInt(e.target.value))}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Limits */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Database className="h-5 w-5 mr-2" />
            System Limits
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Max File Size (MB)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.limits.maxFileSize}
                onChange={(e) => handleChange('limits', 'maxFileSize', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Max Requests Per Hour</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={settings.limits.maxRequestsPerHour}
                onChange={(e) => handleChange('limits', 'maxRequestsPerHour', parseInt(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="label">Max Visitors Per Day</label>
              <input
                type="number"
                min="10"
                max="10000"
                value={settings.limits.maxVisitorsPerDay}
                onChange={(e) => handleChange('limits', 'maxVisitorsPerDay', parseInt(e.target.value))}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            System Information
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">System Name</label>
              <input
                type="text"
                value={settingsData?.data?.settings?.system?.name || 'Krishe Emerald Visitor Management'}
                disabled
                className="input bg-gray-50"
              />
            </div>
            <div>
              <label className="label">Version</label>
              <input
                type="text"
                value={settingsData?.data?.settings?.system?.version || '1.0.0'}
                disabled
                className="input bg-gray-50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateSettingsMutation.isLoading}
          className="btn-primary"
        >
          {updateSettingsMutation.isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
