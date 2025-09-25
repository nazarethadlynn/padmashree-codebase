// src/app/page.tsx
'use client'
import { useState, useEffect } from 'react';
import Dashboard from '@/components/ui/Dashboard';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  departments: number;
  loading: boolean;
}

interface Employee {
  employeeId: string;
  name: string;
  phone: string;
  department: string;
  status: 'active' | 'inactive';
  password?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    loading: true,
  });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Remove the API call that causes 404 error
      // Instead, use mock data matching your API format
      
      // Mock employee data based on your API structure
      const mockEmployees: Employee[] = [
        {
          employeeId: "EMP101",
          name: "John Doe", 
          phone: "8088312419",
          department: "IT",
          status: "active"
        },
        {
          employeeId: "EMP102",
          name: "Jane Smith", 
          phone: "8088312420",
          department: "HR",
          status: "active"
        },
        {
          employeeId: "EMP103",
          name: "Bob Wilson", 
          phone: "8088312421",
          department: "IT",
          status: "inactive"
        },
        {
          employeeId: "EMP104",
          name: "Alice Brown", 
          phone: "8088312422",
          department: "Finance",
          status: "active"
        },
        {
          employeeId: "EMP105",
          name: "Tom Davis", 
          phone: "8088312423",
          department: "Marketing",
          status: "active"
        },
        {
          employeeId: "EMP106",
          name: "Sarah Wilson", 
          phone: "8088312424",
          department: "Operations",
          status: "active"
        }
      ];

      // Calculate stats from mock data
      const activeEmployees = mockEmployees.filter((emp: Employee) => emp.status === 'active').length;
      const departments = [...new Set(mockEmployees.map((emp: Employee) => emp.department))].length;

      setStats({
        totalEmployees: mockEmployees.length,
        activeEmployees,
        departments,
        loading: false,
      });

    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  return <Dashboard stats={stats} />;
}
