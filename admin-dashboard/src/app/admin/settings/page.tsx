// src/app/settings/page.tsx
'use client'
import { useState } from 'react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'PECP Company',
    timezone: 'Asia/Kolkata',
    workingHours: { start: '09:00', end: '17:00' },
    emailNotifications: false,
    smsNotifications: false,
    officeLocation: { latitude: 18.554372, longitude: 73.872526 },
    attendanceRadius: 200,
    autoApproveLeaves: false,
    maxLeaveDays: 30,
    requireApprovalAbove: 3
  })

  const handleSave = () => {
    console.log('Settings saved:', settings)
    alert('Settings saved successfully!')
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">⚙️ Admin Settings</h1>
          <p className="text-gray-600 mt-2">Configure system-wide settings and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🏢 Company Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">⏰ Working Hours</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={settings.workingHours.start}
                onChange={(e) => setSettings({
                  ...settings, 
                  workingHours: {...settings.workingHours, start: e.target.value}
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={settings.workingHours.end}
                onChange={(e) => setSettings({
                  ...settings, 
                  workingHours: {...settings.workingHours, end: e.target.value}
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Office Location Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📍 Office Location & Attendance</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.officeLocation.latitude}
                  onChange={(e) => setSettings({
                    ...settings, 
                    officeLocation: {...settings.officeLocation, latitude: parseFloat(e.target.value)}
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={settings.officeLocation.longitude}
                  onChange={(e) => setSettings({
                    ...settings, 
                    officeLocation: {...settings.officeLocation, longitude: parseFloat(e.target.value)}
                  })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attendance Radius (meters)
              </label>
              <input
                type="number"
                value={settings.attendanceRadius}
                onChange={(e) => setSettings({...settings, attendanceRadius: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="50"
                max="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Employees must be within this radius to mark office attendance
              </p>
            </div>
          </div>
        </div>

        {/* Leave Management Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 Leave Management</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Leave Days per Year
              </label>
              <input
                type="number"
                value={settings.maxLeaveDays}
                onChange={(e) => setSettings({...settings, maxLeaveDays: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="10"
                max="50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Require Approval for Leaves Above (days)
              </label>
              <input
                type="number"
                value={settings.requireApprovalAbove}
                onChange={(e) => setSettings({...settings, requireApprovalAbove: parseInt(e.target.value)})}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                min="1"
                max="10"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoApprove"
                checked={settings.autoApproveLeaves}
                onChange={(e) => setSettings({...settings, autoApproveLeaves: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="autoApprove" className="text-sm text-gray-700">
                Auto-approve leaves under 2 days
              </label>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔔 Notification Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailNotifications"
                checked={settings.emailNotifications}
                onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="emailNotifications" className="text-sm text-gray-700">
                Enable Email Notifications
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="smsNotifications"
                checked={settings.smsNotifications}
                onChange={(e) => setSettings({...settings, smsNotifications: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="smsNotifications" className="text-sm text-gray-700">
                Enable SMS Notifications
              </label>
            </div>
            
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <p><strong>Email notifications will be sent for:</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>New leave requests</li>
                <li>Late check-ins</li>
                <li>Missing attendance</li>
                <li>Leave approvals/rejections</li>
              </ul>
            </div>
          </div>
        </div>

        {/* System Security */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🔒 Security & Access</h2>
          
          <div className="space-y-4">
            <button className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors">
              Reset All Employee Passwords
            </button>
            
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Export System Logs
            </button>
            
            <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
              Backup Database
            </button>
          </div>
        </div>
      </div>

      {/* Current System Status */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">📊 Current System Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-blue-800">
            <p><strong>Total Employees:</strong> 6</p>
            <p><strong>Active Today:</strong> 4</p>
          </div>
          <div className="text-blue-800">
            <p><strong>Pending Leaves:</strong> 2</p>
            <p><strong>On Leave Today:</strong> 1</p>
          </div>
          <div className="text-blue-800">
            <p><strong>Office Check-ins:</strong> 3</p>
            <p><strong>Site Check-ins:</strong> 1</p>
          </div>
          <div className="text-blue-800">
            <p><strong>System Status:</strong> <span className="text-green-600 font-semibold">Active</span></p>
            <p><strong>Last Backup:</strong> 2 hours ago</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
