// src/types/index.ts
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position?: string;
  salary?: number;
  hireDate?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminSettings {
  id: string;
  companyName: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
  };
  holidays: string[];
  notifications: {
    email: boolean;
    sms: boolean;
  };
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}
