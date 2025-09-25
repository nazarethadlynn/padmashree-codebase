// src/lib/api.ts - COMPLETE WORKING VERSION
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Backend Employee interface matching your exact table schema
interface BackendEmployee {
  id: string;
  employee_id: string | null;
  name: string;
  phone: string | null;
  password: string | null;
  role: string;
  created_at: string | null;
  email: string | null;
  department: string | null;
  position: string | null;
  salary: number | null;
  hire_date: string | null;
  status: string | null;
  updated_at: string | null;
}

// Frontend Employee interface for display
interface FrontendEmployee {
  employeeId: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  salary: number | null;
  hireDate: string;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive';
  created_at: string;
}

// Create Employee Data interface
interface CreateEmployeeData {
  employee_id?: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  salary?: number;
  hire_date?: string;
  password?: string;
  role?: 'admin' | 'employee';
  status?: 'active' | 'inactive';
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  count?: number;
}

class ApiClient {
  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    try {
      console.log(`🔄 API Request: ${options.method || 'GET'} ${url}`);
      if (options.body) {
        console.log('📤 Request body:', options.body);
      }
      
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  async getEmployees(): Promise<FrontendEmployee[]> {
    try {
      const response = await this.request<ApiResponse<BackendEmployee[]>>('/employees');
      
      // Transform backend data to frontend format
      return response.data.map((emp: BackendEmployee) => ({
        employeeId: emp.employee_id || emp.id,
        id: emp.id,
        name: emp.name,
        email: emp.email || '',
        phone: emp.phone || '',
        department: emp.department || 'Not specified',
        position: emp.position || 'Not specified',
        salary: emp.salary,
        hireDate: emp.hire_date || '',
        role: (emp.role as 'admin' | 'employee') || 'employee',
        status: (emp.status as 'active' | 'inactive') || 'active',
        created_at: emp.created_at || ''
      }));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      return [];
    }
  }

  async getEmployee(employeeId: string): Promise<FrontendEmployee> {
    try {
      const response = await this.request<ApiResponse<BackendEmployee>>(`/employees/${employeeId}`);
      const emp = response.data;
      return {
        employeeId: emp.employee_id || emp.id,
        id: emp.id,
        name: emp.name,
        email: emp.email || '',
        phone: emp.phone || '',
        department: emp.department || '',
        position: emp.position || '',
        salary: emp.salary,
        hireDate: emp.hire_date || '',
        role: (emp.role as 'admin' | 'employee') || 'employee',
        status: (emp.status as 'active' | 'inactive') || 'active',
        created_at: emp.created_at || ''
      };
    } catch (error) {
      console.error(`Failed to fetch employee ${employeeId}:`, error);
      throw error;
    }
  }

  async createEmployee(data: CreateEmployeeData): Promise<{
    success: boolean;
    employeeId: string;
    id: string;
    message: string;
    data: BackendEmployee;
  }> {
    try {
      console.log('🔄 Creating employee with data:', JSON.stringify(data, null, 2));
      
      const response = await this.request<ApiResponse<BackendEmployee>>('/employees', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      console.log('✅ Employee created response:', response);
      return {
        success: response.success,
        employeeId: response.data.employee_id || response.data.id,
        id: response.data.id,
        message: response.message || 'Employee created successfully',
        data: response.data
      };
    } catch (error) {
      console.error('Failed to create employee:', error);
      throw error;
    }
  }

  async updateEmployee(employeeId: string, data: Partial<CreateEmployeeData>): Promise<{
    success: boolean;
    employeeId: string;
    message: string;
    data: BackendEmployee;
  }> {
    try {
      console.log('🔄 Updating employee:', employeeId, data);
      const response = await this.request<ApiResponse<BackendEmployee>>(`/employees/${employeeId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      console.log('✅ Employee updated:', response);
      return {
        success: response.success,
        employeeId: response.data.employee_id || response.data.id,
        message: response.message || 'Employee updated successfully',
        data: response.data
      };
    } catch (error) {
      console.error(`Failed to update employee ${employeeId}:`, error);
      throw error;
    }
  }

  async deleteEmployee(employeeId: string): Promise<{
    success: boolean;
    message: string;
    data: BackendEmployee;
  }> {
    try {
      console.log('🔄 Deleting employee:', employeeId);
      const response = await this.request<ApiResponse<BackendEmployee>>(`/employees/${employeeId}`, {
        method: 'DELETE',
      });

      return {
        success: response.success,
        message: response.message || 'Employee deleted successfully',
        data: response.data
      };
    } catch (error) {
      console.error(`Failed to delete employee ${employeeId}:`, error);
      throw error;
    }
  }

  async getAdminData(): Promise<{
    message: string;
    companyName: string;
    totalEmployees: number;
    activeEmployees: number;
    adminUsers: number;
    regularEmployees: number;
  }> {
    try {
      const employees = await this.getEmployees();
      return { 
        message: 'Admin data loaded',
        companyName: "PECP Company",
        totalEmployees: employees.length,
        activeEmployees: employees.filter((emp: FrontendEmployee) => emp.status === 'active').length,
        adminUsers: employees.filter((emp: FrontendEmployee) => emp.role === 'admin').length,
        regularEmployees: employees.filter((emp: FrontendEmployee) => emp.role === 'employee').length
      };
    } catch (error) {
      console.error('Failed to get admin data:', error);
      return { 
        message: 'Failed to load admin data',
        companyName: "PECP Company",
        totalEmployees: 0,
        activeEmployees: 0,
        adminUsers: 0,
        regularEmployees: 0
      };
    }
  }

  // Mock methods for other features
  async updateAdminSettings(data: any): Promise<any> { return { success: true, message: "Settings updated" }; }
  async getAttendanceRecords(): Promise<any[]> { return []; }
  async submitAttendance(): Promise<any> { return { success: true }; }
  async getAttendanceByEmployee(): Promise<any[]> { return []; }
  async getAttendanceStats(): Promise<any> { return {}; }
  async getLeaveRequests(): Promise<any[]> { return []; }
  async approveLeaveRequest(): Promise<any> { return { success: true }; }
  async rejectLeaveRequest(): Promise<any> { return { success: true }; }
  async getLeaveStats(): Promise<any> { return {}; }
}

export const apiClient = new ApiClient();
export type { FrontendEmployee, BackendEmployee, CreateEmployeeData, ApiResponse };
