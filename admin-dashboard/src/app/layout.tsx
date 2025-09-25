// src/app/layout.tsx
import './globals.css'
import Sidebar from '@/components/ui/Sidebar'
import Header from '@/components/ui/Header'

export const metadata = {
  title: 'Padmashri Admin Dashboard',
  description: 'Admin dashboard for Padmashri Attendance System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
