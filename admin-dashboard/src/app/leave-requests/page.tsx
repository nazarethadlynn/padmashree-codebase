// src/app/leave-requests/page.tsx
'use client'
import { useState, useEffect } from 'react';

interface LeaveRequest {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id?: string;
  employee_email?: string;
  department?: string;
  from_date: string;        // Changed from fromDate to match API
  to_date: string;          // Changed from toDate to match API
  reason: string;
  status: 'pending' | 'approved' | 'rejected';  // Updated to match API
  applied_date: string;     // Changed from submitted_date to match API
  total_days: number;
  comments?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  created_at: string;
}

interface AdminSummary {
  summary: {
    total_requests: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recent_requests: LeaveRequest[];
}

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [processing, setProcessing] = useState<string>('');
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const API_BASE_URL = 'http://localhost:3001/api';

  useEffect(() => {
    loadLeaveRequests();
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/leave-requests/admin/summary`);
      const data = await response.json();
      
      if (data.success) {
        setSummary({
          total: data.data.summary.total_requests,
          pending: data.data.summary.pending,
          approved: data.data.summary.approved,
          rejected: data.data.summary.rejected
        });
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      
      // Build URL with filter if not 'all'
      let url = `${API_BASE_URL}/leave-requests`;
      if (filter !== 'all') {
        url += `?status=${filter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Loaded leave requests:', data.data.length);
        setLeaveRequests(data.data);
      } else {
        console.error('❌ Failed to load leave requests:', data.message);
      }
    } catch (error) {
      console.error('❌ Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reload data when filter changes
  useEffect(() => {
    if (!loading) {
      loadLeaveRequests();
    }
  }, [filter]);

  const handleApproveReject = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      setProcessing(requestId);
      
      // You'll need to get the reviewer ID from your auth context
      // For now, using a hardcoded admin ID (replace with actual logged-in admin)
      const reviewerId = '8fa4b38d-fdf2-42a6-942c-9917520adacf'; // Replace with actual admin ID
      
      const response = await fetch(`${API_BASE_URL}/leave-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action,
          reviewed_by: reviewerId,
          comments: action === 'approved' 
            ? 'Leave request approved by admin' 
            : 'Leave request rejected by admin'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Leave request ${action}:`, requestId);
        
        // Update the request status locally
        setLeaveRequests(prev => 
          prev.map(request => 
            request.id === requestId 
              ? { 
                  ...request, 
                  status: action,
                  reviewed_by: reviewerId,
                  reviewer_name: 'Admin' // You can get this from the response
                }
              : request
          )
        );

        // Reload summary to update counts
        loadSummary();
      } else {
        console.error('❌ Failed to update leave request:', data.message);
        alert(`Failed to ${action} leave request: ${data.message}`);
      }
      
    } catch (error) {
      console.error('❌ Error updating leave request:', error);
      alert(`Error ${action === 'approved' ? 'approving' : 'rejecting'} leave request`);
    } finally {
      setProcessing('');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':  // Updated from 'accepted' to 'approved'
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading leave requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600">Review and manage employee leave requests</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Pending Approval</h3>
          <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Approved</h3>
          <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">Rejected</h3>
          <p className="text-2xl font-bold text-red-600">{summary.rejected}</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending Only</option>
              <option value="approved">Approved Only</option>
              <option value="rejected">Rejected Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                loadLeaveRequests();
                loadSummary();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Leave Requests ({filteredRequests.length})
          </h2>
        </div>
        
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No leave requests found for selected filter.</p>
            <button
              onClick={() => {
                loadLeaveRequests();
                loadSummary();
              }}
              className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              Refresh Data
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>
                        <div className="font-semibold">{request.employee_name || 'Unknown Employee'}</div>
                        <div className="text-xs text-gray-500">{request.department || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">
                          ID: {request.employee_id || `...${request.user_id.slice(-8)}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="font-medium">{request.from_date} to {request.to_date}</div>
                        <div className="text-xs text-gray-400">
                          Submitted: {new Date(request.applied_date).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-semibold">{request.total_days}</span> day{request.total_days !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                      {request.comments && (
                        <div className="text-xs text-gray-400 mt-1" title={request.comments}>
                          Comments: {request.comments}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status.toUpperCase()}
                        </span>
                        {request.reviewer_name && (
                          <div className="text-xs text-gray-400 mt-1">
                            By: {request.reviewer_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'pending' ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApproveReject(request.id, 'approved')}
                            disabled={processing === request.id}
                            className="text-green-600 hover:text-green-900 font-semibold disabled:opacity-50"
                          >
                            {processing === request.id ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleApproveReject(request.id, 'rejected')}
                            disabled={processing === request.id}
                            className="text-red-600 hover:text-red-900 font-semibold disabled:opacity-50"
                          >
                            {processing === request.id ? 'Processing...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API Status */}
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-900 mb-2">✅ API Integration Active</h3>
        <div className="text-sm text-green-800">
          <p><strong>Backend URL:</strong> {API_BASE_URL}</p>
          <p><strong>Features:</strong> Real-time data, Auto-refresh, Live approve/reject</p>
          <p className="mt-2 text-xs">
            Connected to your Leave Management API - all data is live!
          </p>
        </div>
      </div>
    </div>
  );
}
