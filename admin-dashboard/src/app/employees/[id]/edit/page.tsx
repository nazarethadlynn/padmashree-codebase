// src/app/employees/[id]/edit/page.tsx - COMPLETE WORKING EDIT PAGE
'use client'
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, type CreateEmployeeData, type FrontendEmployee } from '@/lib/api';

interface FormState {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salary: string;
  hireDate: string;
  status: 'active' | 'inactive';
  role: 'admin' | 'employee';
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [employee, setEmployee] = useState<FrontendEmployee | null>(null);
  
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    salary: '',
    hireDate: '',
    status: 'active',
    role: 'employee',
  });

  // Load employee data on page load
  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    if (!employeeId) {
      setErrorMessage('No employee ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      
      console.log('🔄 Loading employee data for ID:', employeeId);
      
      const employeeData = await apiClient.getEmployee(employeeId);
      
      console.log('✅ Employee data loaded:', employeeData);
      
      setEmployee(employeeData);
      
      // Populate form with existing data
      setFormData({
        name: employeeData.name,
        email: employeeData.email,
        phone: employeeData.phone,
        department: employeeData.department,
        position: employeeData.position,
        salary: employeeData.salary ? employeeData.salary.toString() : '',
        hireDate: employeeData.hireDate,
        status: employeeData.status,
        role: employeeData.role,
      });
      
    } catch (error: any) {
      console.error('❌ Error loading employee:', error);
      setErrorMessage(error.message || 'Failed to load employee data');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Full Name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email Address is required');
      }
      if (!formData.department) {
        throw new Error('Department is required');
      }

      // Create update payload
      const updatePayload: Partial<CreateEmployeeData> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        department: formData.department,
        position: formData.position.trim() || undefined,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        hire_date: formData.hireDate || undefined,
        status: formData.status,
        role: formData.role,
      };
      
      console.log('🔄 Updating employee with data:', updatePayload);
      
      const result = await apiClient.updateEmployee(employeeId, updatePayload);
      
      if (result && result.success) {
        setSuccessMessage(`✅ Employee "${formData.name}" updated successfully!`);
        
        // Reload employee data to reflect changes
        await loadEmployeeData();
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/employees');
        }, 2000);
      } else {
        throw new Error('Failed to update employee - invalid response');
      }
      
    } catch (error: any) {
      console.error('❌ Error updating employee:', error);
      
      let errorMsg = 'Failed to update employee. Please try again.';
      if (error.message?.includes('duplicate key')) {
        if (error.message.includes('email')) {
          errorMsg = 'This email address is already in use by another employee.';
        } else if (error.message.includes('phone')) {
          errorMsg = 'This phone number is already in use by another employee.';
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
            <p className="mt-2 text-gray-600">
              Update employee information below.
              {employee && (
                <span className="ml-2 text-blue-600 font-medium">
                  Editing: {employee.name} ({employee.employeeId})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => router.push('/employees')}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            ← Back to Employees
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <div className="flex items-center">
            <span className="mr-2">🎉</span>
            <div>
              <div className="font-medium">{successMessage}</div>
              <p className="text-sm mt-1">Redirecting to employee list in 2 seconds...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-2">❌</span>
              <div>
                <div className="font-medium">Error Loading/Updating Employee</div>
                <div className="text-sm">{errorMessage}</div>
              </div>
            </div>
            <button 
              onClick={() => setErrorMessage('')}
              className="text-red-500 hover:text-red-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Employee Info Display */}
      {employee && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Employee ID:</strong> {employee.employeeId}
            </div>
            <div>
              <strong>Database ID:</strong> {employee.id.slice(0, 8)}...
            </div>
            <div>
              <strong>Created:</strong> {new Date(employee.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Employee Information</h2>
        </div>
        
        <form onSubmit={submitUpdate} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name - Required */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={updateField}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter full name"
              />
            </div>

            {/* Email - Required */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={updateField}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter email address"
              />
            </div>

            {/* Phone - Optional */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={updateField}
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter phone number"
              />
            </div>

            {/* Department - Required */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={updateField}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Department</option>
                <option value="IT">Information Technology</option>
                <option value="HR">Human Resources</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="Operations">Operations</option>
                <option value="Sales">Sales</option>
                <option value="Administration">Administration</option>
                <option value="Engineering">Engineering</option>
                <option value="Customer Service">Customer Service</option>
              </select>
            </div>

            {/* Position - Optional */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                Position
              </label>
              <input
                type="text"
                id="position"
                name="position"
                value={formData.position}
                onChange={updateField}
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter position"
              />
            </div>

            {/* Salary - Optional */}
            <div>
              <label htmlFor="salary" className="block text-sm font-medium text-gray-700">
                Salary
              </label>
              <input
                type="number"
                id="salary"
                name="salary"
                value={formData.salary}
                onChange={updateField}
                min="0"
                step="0.01"
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                placeholder="Enter salary amount"
              />
            </div>

            {/* Hire Date - Optional */}
            <div>
              <label htmlFor="hireDate" className="block text-sm font-medium text-gray-700">
                Hire Date
              </label>
              <input
                type="date"
                id="hireDate"
                name="hireDate"
                value={formData.hireDate}
                onChange={updateField}
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>

            {/* Role - Editable */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={updateField}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="employee">Employee</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {/* Status - Required */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={updateField}
                required
                disabled={isSubmitting}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/employees')}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.email.trim() || !formData.department}
              className="px-6 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating Employee...
                </>
              ) : (
                'Update Employee'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Actions */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={loadEmployeeData}
            disabled={isLoading || isSubmitting}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Reload Data'}
          </button>
          <button
            onClick={() => router.push(`/employees/${employeeId}`)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}
