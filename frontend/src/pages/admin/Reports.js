import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  Building2,
  FileText
} from 'lucide-react';
import { adminAPI } from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';

const AdminReports = () => {
  const [reportType, setReportType] = useState('visitor-summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: reportData, isLoading, refetch } = useQuery(
    ['admin-report', reportType, startDate, endDate],
    () => adminAPI.getReport(reportType, { startDate, endDate }),
    {
      enabled: false, // Only fetch when manually triggered
    }
  );

  const handleGenerateReport = () => {
    refetch();
  };

  const report = reportData?.data?.data;

  const reportTypes = [
    { value: 'visitor-summary', label: 'Visitor Summary', icon: Users },
    { value: 'company-performance', label: 'Company Performance', icon: Building2 },
    { value: 'member-activity', label: 'Member Activity', icon: FileText },
  ];

  const renderReportContent = () => {
    if (!report) return null;

    switch (reportType) {
      case 'visitor-summary':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-primary-600">{report.totalVisitors || 0}</div>
                  <div className="text-sm text-gray-600">Total Visitors</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-success-600">{report.uniqueVisitors || 0}</div>
                  <div className="text-sm text-gray-600">Unique Visitors</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-info-600">{report.completedVisits || 0}</div>
                  <div className="text-sm text-gray-600">Completed Visits</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-2xl font-bold text-warning-600">{Math.round(report.averageDuration || 0)}</div>
                  <div className="text-sm text-gray-600">Avg Duration (min)</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'company-performance':
        return (
          <div className="space-y-4">
            {report.map((company, index) => (
              <div key={index} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{company.companyName}</h3>
                    <span className="text-sm text-gray-500">
                      {Math.round(company.completionRate || 0)}% completion rate
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-primary-600">{company.totalRequests || 0}</div>
                      <div className="text-sm text-gray-600">Total Requests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-success-600">{company.completedRequests || 0}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-warning-600">{Math.round(company.averageWaitTime || 0)}</div>
                      <div className="text-sm text-gray-600">Avg Wait Time (min)</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'member-activity':
        return (
          <div className="space-y-4">
            {report.map((member, index) => (
              <div key={index} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{member.memberName}</h3>
                    <span className="text-sm text-gray-500">
                      {Math.round(member.acceptanceRate || 0)}% acceptance rate
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-primary-600">{member.totalRequests || 0}</div>
                      <div className="text-sm text-gray-600">Total Requests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-success-600">{member.acceptedRequests || 0}</div>
                      <div className="text-sm text-gray-600">Accepted</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        <div className="font-medium">{member.department}</div>
                        <div className="text-xs text-gray-500">{member.employeeId}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">
          Generate and view system reports and analytics
        </p>
      </div>

      {/* Report Configuration */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">Generate Report</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="input"
              >
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {reportTypes.find(t => t.value === reportType)?.label} Report
              </h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Generated: {formatDateTime(reportData.data.generatedAt)}
                </span>
                <button className="btn-outline text-sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {renderReportContent()}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="card-body text-center">
            <TrendingUp className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">Analytics</div>
            <div className="text-sm text-gray-600">System performance metrics</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <Calendar className="h-8 w-8 text-success-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">Reports</div>
            <div className="text-sm text-gray-600">Detailed activity reports</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <Download className="h-8 w-8 text-info-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">Export</div>
            <div className="text-sm text-gray-600">Download data in various formats</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
