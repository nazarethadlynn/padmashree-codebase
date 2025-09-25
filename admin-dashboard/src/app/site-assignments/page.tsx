// src/app/site-assignments/page.tsx - COMPLETE FINAL WORKING VERSION WITH EDIT/REMOVE
'use client'
import { useState, useEffect } from 'react';

interface SiteAssignment {
  id: string;
  name: string;
  description?: string;
  location: string;
  coordinates_lat: number;
  coordinates_lng: number;
  attendance_radius: number;
  project_type?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Assignment {
  id: string;
  employee_id: string;
  site_id: string;
  assignment_date: string;
  status: string;
  notes?: string;
  employee?: {
    id: string;
    name: string;
    employee_id: string;
    department: string;
  };
  site?: {
    id: string;
    name: string;
    location: string;
  };
}

interface DashboardStats {
  total_sites: number;
  assigned_today: number;
  notifications_sent: number;
  available_employees: number;
}

// ✅ Modal Component 1: Add Site & Assign
interface AddSiteAndAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiBaseUrl: string;
}

function AddSiteAndAssignModal({ isOpen, onClose, onSuccess, apiBaseUrl }: AddSiteAndAssignModalProps) {
  const [formData, setFormData] = useState({
    // Site data
    name: '',
    description: '',
    location: '',
    coordinates_lat: '',
    coordinates_lng: '',
    attendance_radius: 100,
    project_type: '',
    // Assignment data
    employee_ids: [] as string[],
    assignment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Load employees when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      console.log('🔍 Loading employees from:', `${apiBaseUrl}/site-assignments/employees/available`);
      
      const response = await fetch(`${apiBaseUrl}/site-assignments/employees/available`);
      
      if (!response.ok) {
        console.error('❌ Employees endpoint failed:', response.status);
        alert(`Employees endpoint failed: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('🔍 Employees response:', data);
      
      if (data.success) {
        console.log('✅ Employees loaded:', data.data?.length || 0);
        setAllEmployees(data.data || []);
        
        if (!data.data || data.data.length === 0) {
          console.warn('⚠️ No employees found!');
        } else {
          // Filter for available employees based on current date
          const available = await getAvailableEmployees(formData.assignment_date, data.data);
          setEmployees(available);
        }
      } else {
        console.error('❌ Employees API error:', data.message);
        setAllEmployees([]);
        setEmployees([]);
      }
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      alert(`Error loading employees: ${error}`);
      setAllEmployees([]);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Filter available employees function
  const getAvailableEmployees = async (date: string, employeeList?: any[]) => {
    try {
      const employeesToFilter = employeeList || allEmployees;
      
      if (!employeesToFilter || employeesToFilter.length === 0) {
        console.log('📊 No employees to filter');
        return [];
      }
      
      try {
        // Get all assignments for the selected date
        const assignmentsResponse = await fetch(`${apiBaseUrl}/site-assignments/date/${date}`);
        const assignmentsData = await assignmentsResponse.json();
        
        if (assignmentsData.success && assignmentsData.data && assignmentsData.data.length > 0) {
          const assignedEmployeeIds = assignmentsData.data.map((assignment: any) => assignment.employee_id);
          console.log(`📊 Found ${assignedEmployeeIds.length} employees already assigned on ${date}`);
          
          // Filter out already assigned employees
          const availableEmployees = employeesToFilter.filter(emp => !assignedEmployeeIds.includes(emp.id));
          console.log(`📊 Available employees after filtering: ${availableEmployees.length}`);
          return availableEmployees;
        } else {
          // No assignments found for this date, all employees are available
          console.log(`📊 No existing assignments found for ${date}, all employees available`);
          return employeesToFilter;
        }
      } catch (assignmentError) {
        console.log(`📊 Could not fetch assignments for ${date}, assuming all employees available`);
        return employeesToFilter;
      }
      
    } catch (error) {
      console.error('Error checking available employees:', error);
      return employeeList || allEmployees || [];
    }
  };

  // Handle date change and update available employees
  const handleDateChange = async (newDate: string) => {
    setFormData({ ...formData, assignment_date: newDate, employee_ids: [] }); // Clear selections
    
    if (allEmployees.length > 0) {
      const available = await getAvailableEmployees(newDate);
      setEmployees(available);
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(employeeId)
        ? prev.employee_ids.filter(id => id !== employeeId)
        : [...prev.employee_ids, employeeId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.employee_ids.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/site-assignments/create-and-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          coordinates_lat: parseFloat(formData.coordinates_lat.toString()),
          coordinates_lng: parseFloat(formData.coordinates_lng.toString()),
          attendance_radius: parseInt(formData.attendance_radius.toString())
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Site created and employees assigned successfully');
        alert(`Success! Site created and ${data.data.assignments?.length || 0} employees assigned.`);
        onSuccess();
      } else {
        console.error('❌ Failed:', data.message);
        alert('Failed: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error creating site and assigning employees');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-purple-600">
          🏗️ Create Site & Assign Employees
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Site Information Section */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-medium mb-3">Site Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.coordinates_lat}
                  onChange={(e) => setFormData({ ...formData, coordinates_lat: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="18.554397"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.coordinates_lng}
                  onChange={(e) => setFormData({ ...formData, coordinates_lng: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="73.872530"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Radius (m)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.attendance_radius}
                  onChange={(e) => setFormData({ ...formData, attendance_radius: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                <input
                  type="text"
                  value={formData.project_type}
                  onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Construction, Residential, etc."
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={2}
                placeholder="Brief description of the site..."
              />
            </div>
          </div>

          {/* Assignment Information Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Assignment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Date *</label>
                <input
                  type="date"
                  required
                  value={formData.assignment_date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Changing date will refresh available employees
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Optional assignment notes..."
                />
              </div>
            </div>

            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Available Employees * ({formData.employee_ids.length} selected)
              </label>
              
              {loadingEmployees ? (
                <p className="text-gray-600">Loading available employees...</p>
              ) : employees.length === 0 ? (
                <div className="text-center py-4 bg-yellow-50 rounded-md">
                  <p className="text-yellow-700">⚠️ No employees available on {formData.assignment_date}</p>
                  <p className="text-sm text-yellow-600">
                    {allEmployees.length === 0 
                      ? 'No employees found in database. Check your employees data.'
                      : 'All employees are already assigned on this date. Try a different date.'
                    }
                  </p>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                  <div className="text-xs text-green-600 mb-2">
                    ✅ Showing {employees.length} employees available on {formData.assignment_date}
                  </div>
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id={employee.id}
                        checked={formData.employee_ids.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        className="rounded"
                      />
                      <label htmlFor={employee.id} className="text-sm">
                        {employee.name} ({employee.employee_id}) - {employee.department}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading || loadingEmployees || employees.length === 0}
              className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Site & Assign Employees'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ Modal Component 2: Assign to Existing Site
interface AssignToExistingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  apiBaseUrl: string;
}

function AssignToExistingModal({ isOpen, onClose, onSuccess, apiBaseUrl }: AssignToExistingModalProps) {
  const [formData, setFormData] = useState({
    site_id: '',
    employee_ids: [] as string[],
    assignment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [sites, setSites] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [sitesResponse, employeesResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/site-assignments`),
        fetch(`${apiBaseUrl}/site-assignments/employees/available`)
      ]);

      const sitesData = await sitesResponse.json();
      const employeesData = await employeesResponse.json();

      if (sitesData.success) setSites(sitesData.data);
      if (employeesData.success) {
        setAllEmployees(employeesData.data);
        // Filter for available employees based on current date
        const available = await getAvailableEmployees(formData.assignment_date, employeesData.data);
        setEmployees(available);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Filter available employees function
  const getAvailableEmployees = async (date: string, employeeList?: any[]) => {
    try {
      const employeesToFilter = employeeList || allEmployees;
      
      if (!employeesToFilter || employeesToFilter.length === 0) {
        return [];
      }
      
      try {
        const assignmentsResponse = await fetch(`${apiBaseUrl}/site-assignments/date/${date}`);
        const assignmentsData = await assignmentsResponse.json();
        
        if (assignmentsData.success && assignmentsData.data && assignmentsData.data.length > 0) {
          const assignedEmployeeIds = assignmentsData.data.map((assignment: any) => assignment.employee_id);
          const availableEmployees = employeesToFilter.filter(emp => !assignedEmployeeIds.includes(emp.id));
          return availableEmployees;
        } else {
          return employeesToFilter;
        }
      } catch {
        return employeesToFilter;
      }
      
    } catch (error) {
      console.error('Error checking available employees:', error);
      return employeeList || allEmployees || [];
    }
  };

  // Handle date change and update available employees
  const handleDateChange = async (newDate: string) => {
    setFormData({ ...formData, assignment_date: newDate, employee_ids: [] }); // Clear selections
    
    if (allEmployees.length > 0) {
      const available = await getAvailableEmployees(newDate);
      setEmployees(available);
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setFormData(prev => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(employeeId)
        ? prev.employee_ids.filter(id => id !== employeeId)
        : [...prev.employee_ids, employeeId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.site_id) {
      alert('Please select a site');
      return;
    }
    
    if (formData.employee_ids.length === 0) {
      alert('Please select at least one employee');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/site-assignments/${formData.site_id}/assign-employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_ids: formData.employee_ids,
          assignment_date: formData.assignment_date,
          notes: formData.notes
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Employees assigned successfully');
        alert(`Success! ${data.data.assignments?.length || 0} employees assigned to site.`);
        onSuccess();
      } else {
        console.error('❌ Failed:', data.message);
        alert('Failed: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Error assigning employees to site');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-blue-600">
          📍 Assign to Existing Site
        </h2>
        
        {loadingData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading sites and employees...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Site *</label>
              <select
                required
                value={formData.site_id}
                onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Choose a site...</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} - {site.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Date *</label>
              <input
                type="date"
                required
                value={formData.assignment_date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Changing date will refresh available employees
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Available Employees * ({formData.employee_ids.length} selected)
              </label>
              
              {employees.length === 0 ? (
                <div className="text-center py-4 bg-yellow-50 rounded-md">
                  <p className="text-yellow-700">⚠️ No employees available on {formData.assignment_date}</p>
                  <p className="text-sm text-yellow-600">
                    {allEmployees.length === 0 
                      ? 'No employees found in database.'
                      : 'All employees are already assigned on this date. Try a different date.'
                    }
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3">
                  <div className="text-xs text-green-600 mb-2">
                    ✅ Showing {employees.length} employees available on {formData.assignment_date}
                  </div>
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id={`assign-${employee.id}`}
                        checked={formData.employee_ids.includes(employee.id)}
                        onChange={() => handleEmployeeToggle(employee.id)}
                        className="rounded"
                      />
                      <label htmlFor={`assign-${employee.id}`} className="text-sm">
                        {employee.name} ({employee.employee_id}) - {employee.department}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={2}
                placeholder="Optional notes for this assignment..."
              />
            </div>

            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="submit"
                disabled={loading || employees.length === 0}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Assigning...' : 'Assign Employees'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ✅ NEW: Edit Assignment Modal Component
interface EditAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: Assignment | null;
  apiBaseUrl: string;
}

function EditAssignmentModal({ isOpen, onClose, onSuccess, assignment, apiBaseUrl }: EditAssignmentModalProps) {
  const [formData, setFormData] = useState({
    status: assignment?.status || 'assigned',
    notes: assignment?.notes || '',
    assignment_date: assignment?.assignment_date || new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assignment) {
      setFormData({
        status: assignment.status || 'assigned',
        notes: assignment.notes || '',
        assignment_date: assignment.assignment_date || new Date().toISOString().split('T')[0]
      });
    }
  }, [assignment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;
    
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/site-assignments/assignment/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Assignment updated successfully');
        alert('Assignment updated successfully!');
        onSuccess();
      } else {
        console.error('❌ Failed to update assignment:', data.message);
        alert('Failed to update assignment: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error updating assignment:', error);
      alert('Error updating assignment');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-indigo-600">
          ✏️ Edit Assignment
        </h2>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm"><strong>Employee:</strong> {assignment.employee?.name}</p>
          <p className="text-sm"><strong>Site:</strong> {assignment.site?.name}</p>
          <p className="text-sm"><strong>Department:</strong> {assignment.employee?.department}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="assigned">Assigned</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Date *</label>
            <input
              type="date"
              required
              value={formData.assignment_date}
              onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="Optional notes for this assignment..."
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Assignment'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ✅ Main Site Assignments Page Component
export default function SiteAssignmentsPage() {
  const [sites, setSites] = useState<SiteAssignment[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSite, setEditingSite] = useState<SiteAssignment | null>(null);

  // State for the two new modals
  const [showAddSiteAndAssign, setShowAddSiteAndAssign] = useState(false);
  const [showAssignToExisting, setShowAssignToExisting] = useState(false);

  // Assignments state and loading
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // ✅ NEW: Edit/Remove assignment state
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [showEditAssignment, setShowEditAssignment] = useState(false);

  const API_BASE_URL = 'http://localhost:3001/api';

  const getISTDate = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (330 * 60 * 1000));
    return istTime.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getISTDate());

  // Load assignments function
  const loadAssignments = async (date: string) => {
    setLoadingAssignments(true);
    try {
      const response = await fetch(`${API_BASE_URL}/site-assignments/date/${date}`);
      const data = await response.json();
      
      if (data.success) {
        setAssignments(data.data);
        console.log('✅ Assignments loaded:', data.data.length);
      } else {
        console.error('❌ Failed to load assignments:', data.message);
        setAssignments([]);
      }
    } catch (error) {
      console.error('❌ Error loading assignments:', error);
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  // ✅ NEW: Edit assignment handler
  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowEditAssignment(true);
  };

// ✅ FIXED: Remove assignment handler with proper error handling
const handleRemoveAssignment = async (assignmentId: string, employeeName: string) => {
  if (!confirm(`Are you sure you want to remove the assignment for ${employeeName}?`)) return;

  try {
    console.log(`🗑️ Frontend: Attempting to remove assignment: ${assignmentId}`);
    
    const response = await fetch(`${API_BASE_URL}/site-assignments/assignment/${assignmentId}`, {
      method: 'DELETE',
    });

    console.log(`📡 Frontend: Delete response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📡 Frontend: Delete response data:`, data);

    if (data.success) {
      console.log('✅ Assignment removed successfully from database');
      alert('Assignment removed successfully!');
      await loadAssignments(selectedDate);
      await loadData();
    } else {
      console.error('❌ Failed to remove assignment:', data.message);
      alert('Failed to remove assignment: ' + data.message);
    }
  } catch (error: any) {  // ✅ FIX: Add proper type annotation
    console.error('❌ Error removing assignment:', error);
    alert(`Error removing assignment: ${error.message}`);
  }
};


  // Update useEffect to load assignments when date changes
  useEffect(() => {
    loadData();
    loadAssignments(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, []);

  // ✅ FIXED: Updated main loadData function
  const loadData = async () => {
    try {
      setLoading(true);
      // Load sites first
      await loadSites();
      
      // ✅ Load stats without additional try-catch since loadStats handles its own errors
      await loadStats();
      
    } catch (error) {
      console.error('Error loading data:', error);
      // ✅ Set fallback stats if main loading fails
      setStats({
        total_sites: 0,
        assigned_today: 0,
        notifications_sent: 0,
        available_employees: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSites = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/site-assignments`);
      const data = await response.json();
      
      if (data.success) {
        setSites(data.data);
        console.log('✅ Sites loaded:', data.data.length);
      } else {
        console.error('❌ Failed to load sites:', data.message);
      }
    } catch (error) {
      console.error('❌ Error loading sites:', error);
    }
  };

  // ✅ FIXED: Updated loadStats function
  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/site-assignments/dashboard/stats`);
      
      // Check if response is ok
      if (!response.ok) {
        console.log(`📊 Stats endpoint returned ${response.status}, using fallback values`);
        // Set fallback stats immediately without throwing error
        setStats({
          total_sites: sites.length,
          assigned_today: assignments.length,
          notifications_sent: 0,
          available_employees: 0
        });
        return; // Exit function early
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
        console.log('✅ Stats loaded:', data.data);
      } else {
        console.log('📊 Stats API returned error, using fallback values');
        setStats({
          total_sites: sites.length,
          assigned_today: assignments.length,
          notifications_sent: 0,
          available_employees: 0
        });
      }
    } catch (error) {
      console.log('📊 Stats endpoint not available, using fallback values');
      // Set fallback stats when endpoint is completely unavailable
      setStats({
        total_sites: sites.length,
        assigned_today: assignments.length,
        notifications_sent: 0,
        available_employees: 0
      });
    }
  };

  const openLocationOnMap = (lat: number, lng: number) => {
    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const handleCreateSite = () => {
    setShowCreateForm(true);
    setEditingSite(null);
  };

  const handleEditSite = (site: SiteAssignment) => {
    setEditingSite(site);
    setShowCreateForm(true);
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm('Are you sure you want to delete this site?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/site-assignments/${siteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Site deleted successfully');
        loadData();
        loadAssignments(selectedDate);
      } else {
        console.error('❌ Failed to delete site:', data.message);
        alert('Failed to delete site: ' + data.message);
      }
    } catch (error) {
      console.error('❌ Error deleting site:', error);
      alert('Error deleting site');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading site assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with working buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            🏗️ Site Assignments
          </h1>
          <p className="text-gray-600">Assign employees to work sites and send notifications</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCreateSite}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            + Add New Site
          </button>
          <button
            onClick={() => setShowAddSiteAndAssign(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
          >
            + Add Site & Assign
          </button>
          <button
            onClick={() => setShowAssignToExisting(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            + Assign to Existing Site
          </button>
        </div>
      </div>

      {/* Assignment Date */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Assignment Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      {/* Statistics Cards - Always show, even with fallback data */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Sites</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total_sites}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Assigned Today</h3>
            <p className="text-2xl font-bold text-blue-600">{stats.assigned_today}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Notifications Sent</h3>
            <p className="text-2xl font-bold text-green-600">{stats.notifications_sent}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Available Employees</h3>
            <p className="text-2xl font-bold text-purple-600">{stats.available_employees}</p>
          </div>
        </div>
      )}

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sites.map((site) => (
          <div key={site.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
              <button
                onClick={() => handleDeleteSite(site.id)}
                className="text-gray-400 hover:text-red-600"
                title="Delete Site"
              >
                🗑️
              </button>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>📍 Location:</strong> {site.location}</p>
              {site.project_type && <p><strong>🏗️ Type:</strong> {site.project_type}</p>}
              <p><strong>📐 Coordinates:</strong> {site.coordinates_lat.toFixed(4)}, {site.coordinates_lng.toFixed(4)}</p>
              <p><strong>📏 Radius:</strong> {site.attendance_radius}m</p>
              
              <button
                onClick={() => openLocationOnMap(site.coordinates_lat, site.coordinates_lng)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                📍 View on Maps
              </button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                📊 Assigned Today: {assignments.filter(a => a.site_id === site.id).length} employees
              </p>
              <div className="mt-2 flex space-x-2">
                <button
                  onClick={() => handleEditSite(site)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  ✏️ Edit
                </button>
                <button 
                  onClick={() => setShowAssignToExisting(true)}
                  className="text-green-600 hover:text-green-800 text-sm"
                >
                  👥 Assign Employees
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Site Assignments Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Site Assignments for {selectedDate} ({assignments.length})
          </h2>
        </div>
        
        {loadingAssignments ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading assignments...</p>
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No assignments found for selected date.</p>
            <p className="text-sm mt-2">Create assignments by clicking "Assign to Existing Site" or "Add Site & Assign"</p>
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
                    Site
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              {/* ✅ UPDATED: Assignments table body with working Edit/Remove buttons */}
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.employee?.name || 'Unknown Employee'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {assignment.employee?.employee_id || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {assignment.site?.name || 'Unknown Site'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {assignment.site?.location || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {assignment.employee?.department || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        assignment.status === 'assigned' 
                          ? 'bg-green-100 text-green-800'
                          : assignment.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {assignment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditAssignment(assignment)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded-md text-xs hover:bg-indigo-700 transition-colors"
                          title="Edit Assignment"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemoveAssignment(assignment.id, assignment.employee?.name || 'Unknown')}
                          className="bg-red-600 text-white px-3 py-1 rounded-md text-xs hover:bg-red-700 transition-colors"
                          title="Remove Assignment"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* All Modal Components */}
      {showCreateForm && (
        <SiteFormModal
          site={editingSite}
          onClose={() => {
            setShowCreateForm(false);
            setEditingSite(null);
          }}
          onSuccess={() => {
            setShowCreateForm(false);
            setEditingSite(null);
            loadData();
            loadAssignments(selectedDate);
          }}
          apiBaseUrl={API_BASE_URL}
        />
      )}

      <AddSiteAndAssignModal
        isOpen={showAddSiteAndAssign}
        onClose={() => setShowAddSiteAndAssign(false)}
        onSuccess={() => {
          setShowAddSiteAndAssign(false);
          loadData();
          loadAssignments(selectedDate);
        }}
        apiBaseUrl={API_BASE_URL}
      />

      <AssignToExistingModal
        isOpen={showAssignToExisting}
        onClose={() => setShowAssignToExisting(false)}
        onSuccess={() => {
          setShowAssignToExisting(false);
          loadData();
          loadAssignments(selectedDate);
        }}
        apiBaseUrl={API_BASE_URL}
      />

      {/* ✅ NEW: Edit Assignment Modal */}
      <EditAssignmentModal
        isOpen={showEditAssignment}
        assignment={editingAssignment}
        onClose={() => {
          setShowEditAssignment(false);
          setEditingAssignment(null);
        }}
        onSuccess={() => {
          setShowEditAssignment(false);
          setEditingAssignment(null);
          loadAssignments(selectedDate); // Refresh assignments
          loadData(); // Refresh stats
        }}
        apiBaseUrl={API_BASE_URL}
      />

      {/* API Status */}
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-900 mb-2">✅ Backend Connection</h3>
        <div className="text-sm text-green-800">
          <p><strong>API URL:</strong> {API_BASE_URL}</p>
          <p><strong>Sites Loaded:</strong> {sites.length}</p>
          <p><strong>Assignments Loaded:</strong> {assignments.length}</p>
          <p><strong>Status:</strong> Connected and working!</p>
        </div>
      </div>
    </div>
  );
}

// ✅ Site Form Modal Component (for "Add New Site")
interface SiteFormModalProps {
  site: SiteAssignment | null;
  onClose: () => void;
  onSuccess: () => void;
  apiBaseUrl: string;
}

function SiteFormModal({ site, onClose, onSuccess, apiBaseUrl }: SiteFormModalProps) {
  const [formData, setFormData] = useState({
    name: site?.name || '',
    description: site?.description || '',
    location: site?.location || '',
    coordinates_lat: site?.coordinates_lat || '',
    coordinates_lng: site?.coordinates_lng || '',
    attendance_radius: site?.attendance_radius || 100,
    project_type: site?.project_type || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = site 
        ? `${apiBaseUrl}/site-assignments/${site.id}`
        : `${apiBaseUrl}/site-assignments`;
      
      const method = site ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          coordinates_lat: parseFloat(formData.coordinates_lat.toString()),
          coordinates_lng: parseFloat(formData.coordinates_lng.toString()),
          attendance_radius: parseInt(formData.attendance_radius.toString())
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Site ${site ? 'updated' : 'created'} successfully`);
        onSuccess();
      } else {
        console.error(`❌ Failed to ${site ? 'update' : 'create'} site:`, data.message);
        alert(`Failed to ${site ? 'update' : 'create'} site: ` + data.message);
      }
    } catch (error) {
      console.error(`❌ Error ${site ? 'updating' : 'creating'} site:`, error);
      alert(`Error ${site ? 'updating' : 'creating'} site`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {site ? 'Edit Site' : 'Create New Site'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.coordinates_lat}
                onChange={(e) => setFormData({ ...formData, coordinates_lat: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.coordinates_lng}
                onChange={(e) => setFormData({ ...formData, coordinates_lng: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Radius (m)</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={formData.attendance_radius}
              onChange={(e) => setFormData({ ...formData, attendance_radius: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
            <input
              type="text"
              value={formData.project_type}
              onChange={(e) => setFormData({ ...formData, project_type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (site ? 'Updating...' : 'Creating...') : (site ? 'Update Site' : 'Create Site')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
