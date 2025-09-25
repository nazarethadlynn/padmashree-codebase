// src/components/ui/Sidebar.tsx
'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊', current: pathname === '/' },
    { name: 'Employees', href: '/employees', icon: '👥', current: pathname.startsWith('/employees') },
    { name: 'Attendance', href: '/attendance', icon: '📍', current: pathname.startsWith('/attendance') },
    { name: 'Site Assignments', href: '/site-assignments', icon: '🏗️', current: pathname.startsWith('/site-assignments') },
    { name: 'Leave Requests', href: '/leave-requests', icon: '📝', current: pathname.startsWith('/leave-requests') }, // ← NEW LINE ADDED
    { name: 'Admin Settings', href: '/admin/settings', icon: '⚙️', current: pathname.startsWith('/admin/settings') },
    {name: 'Check-in/out', href: '/attendance/check-in', icon: '📍', current: pathname === '/attendance/check-in'}

  ];

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center h-16 px-4">
        <h1 className="text-xl font-bold text-white">Padmashri Admin</h1>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`${
              item.current
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors`}
          >
            <span className="mr-3">{item.icon}</span>
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
