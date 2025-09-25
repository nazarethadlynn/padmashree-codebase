// src/components/Header.tsx
export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-800">
          Admin Dashboard
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">Welcome, Admin</span>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
