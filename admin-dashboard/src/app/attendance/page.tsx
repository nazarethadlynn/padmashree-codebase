// src/app/attendance/page.tsx - UPDATED WITH LOCATION NAMES
'use client'
import { useState, useEffect } from 'react';

interface AttendanceRecord {
  id: string;
  user_id: string;
  employee_name?: string;
  employee_id?: string;
  department?: string;
  date: string;
  type: 'check-in' | 'check-out';
  time: string;
  location_type?: 'OFFICE' | 'SITE';
  location_name?: string; // ✅ NEW: Location name from backend
  latitude: number;
  longitude: number;
  location?: {
    type: string;
    distance_from_office: number;
    within_office_radius: boolean;
    validation_status: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  user?: {
    name?: string;
    employee_id?: string;
    department?: string;
  };
}

interface AttendanceSummary {
  summary: {
    today: {
      total_records: number;
      check_ins: number;
      check_outs: number;
      office_checkins: number;
      site_checkins: number;
    };
  };
  recent_records: AttendanceRecord[];
  office_location: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  validation_rules: {
    office_radius: string;
    office_validation: string;
    site_attendance: string;
  };
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary['summary'] | null>(null);
  const [officeLocation, setOfficeLocation] = useState<AttendanceSummary['office_location'] | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Helper function to get IST date for today
  const getISTDate = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (330 * 60 * 1000)); // Add 5.5 hours for IST
    return istTime.toISOString().split('T')[0];
  };

  const [filter, setFilter] = useState<{
    date: string;
    type: 'all' | 'check-in' | 'check-out';
    location_type: 'all' | 'OFFICE' | 'SITE';
  }>({
    date: getISTDate(), // ✅ Use IST date for today
    type: 'all',
    location_type: 'all'
  });

  const API_BASE_URL = 'http://localhost:3001/api';

  useEffect(() => {
    loadAttendanceData();
    loadSummary();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadAttendanceData();
    }
  }, [filter]);

  const loadSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/admin/summary`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Summary loaded:', data.data);
        setSummary(data.data.summary);
        setOfficeLocation(data.data.office_location);
      }
    } catch (error) {
      console.error('Error loading attendance summary:', error);
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Build URL with filters
      let url = `${API_BASE_URL}/attendance?`;
      const params = new URLSearchParams();
      
      if (filter.date) {
        params.append('date', filter.date);
      }
      if (filter.type !== 'all') {
        params.append('type', filter.type);
      }
      if (filter.location_type !== 'all') {
        params.append('location_type', filter.location_type);
      }
      
      url += params.toString();
      console.log('📡 Fetching from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Loaded attendance records:', data.data.length);
        setAttendanceRecords(data.data);
      } else {
        console.error('❌ Failed to load attendance records:', data.message);
      }
    } catch (error) {
      console.error('❌ Error loading attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLocationIcon = (locationType: string) => {
    return locationType === 'OFFICE' ? '🏢' : '📍';
  };

  const getLocationColor = (locationType: string) => {
    return locationType === 'OFFICE' 
      ? 'bg-blue-100 text-blue-800'
      : 'bg-orange-100 text-orange-800';
  };

  const getTypeColor = (type: string) => {
    return type === 'check-in' 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VALID':
        return 'bg-green-100 text-green-800';
      case 'INVALID':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ UPDATED: Proper IST time formatting
  const formatTime = (timeString: string) => {
    // Create date object from the time string
    const date = new Date(timeString);
    
    // Format in IST timezone
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata' // ✅ Force IST timezone
    });
  };

  // ✅ UPDATED: Proper IST date formatting
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Kolkata' // ✅ Force IST timezone
    });
  };

  // ✅ NEW: Format full date and time together
  const formatDateTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const openLocationOnMap = (lat: number, lng: number) => {
    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // ✅ NEW: Clear filters to today
  const clearFilters = () => {
    setFilter({
      date: getISTDate(),
      type: 'all',
      location_type: 'all'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading attendance records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600">Track employee check-ins and locations</p>
        </div>
        {/* ✅ NEW: Show current IST time */}
        <div className="text-right">
          <p className="text-sm text-gray-500">Current IST Time</p>
          <p className="text-lg font-semibold text-gray-900">
            {new Date().toLocaleString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
              timeZone: 'Asia/Kolkata'
            })}
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Records</h3>
            <p className="text-2xl font-bold text-gray-900">{summary.today.total_records}</p>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Check-ins</h3>
            <p className="text-2xl font-bold text-green-600">{summary.today.check_ins}</p>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Check-outs</h3>
            <p className="text-2xl font-bold text-red-600">{summary.today.check_outs}</p>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Office Check-ins</h3>
            <p className="text-2xl font-bold text-blue-600">{summary.today.office_checkins}</p>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500">Site Check-ins</h3>
            <p className="text-2xl font-bold text-orange-600">{summary.today.site_checkins}</p>
            <p className="text-xs text-gray-400 mt-1">Today</p>
          </div>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={filter.date}
              onChange={(e) => setFilter(prev => ({ ...prev, date: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as any }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Types</option>
              <option value="check-in">Check-in Only</option>
              <option value="check-out">Check-out Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Location</label>
            <select
              value={filter.location_type}
              onChange={(e) => setFilter(prev => ({ ...prev, location_type: e.target.value as any }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Locations</option>
              <option value="OFFICE">Office Only</option>
              <option value="SITE">Site Only</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                loadAttendanceData();
                loadSummary();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
            <button
              onClick={clearFilters}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
            >
              Today
            </button>
          </div>
        </div>
        
        {/* ✅ NEW: Show current filters */}
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span>Active filters:</span>
          <span className="bg-gray-100 px-2 py-1 rounded">📅 {filter.date}</span>
          {filter.type !== 'all' && (
            <span className="bg-blue-100 px-2 py-1 rounded">🔍 {filter.type}</span>
          )}
          {filter.location_type !== 'all' && (
            <span className="bg-orange-100 px-2 py-1 rounded">📍 {filter.location_type}</span>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Attendance Records ({attendanceRecords.length})
          </h2>
          {filter.date && (
            <p className="text-sm text-gray-500 mt-1">
              Showing records for {formatDate(filter.date)}
            </p>
          )}
        </div>
        
        {attendanceRecords.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No attendance records found for selected filters.</p>
            <div className="mt-4 space-x-2">
              <button
                onClick={() => {
                  loadAttendanceData();
                  loadSummary();
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Refresh Data
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Show Today's Records
              </button>
            </div>
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
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time (IST)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => {
                  const displayName = record.employee_name || record.user?.name || 'Unknown Employee';
                  const displayEmployeeId = record.employee_id || record.user?.employee_id || `...${record.user_id.slice(-8)}`;
                  const displayDepartment = record.department || record.user?.department || 'Unknown';
                  const locationType = record.location_type || record.location?.type || 'UNKNOWN';
                  const distance = record.location?.distance_from_office || 0;
                  
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>
                          <div className="font-semibold">{displayName}</div>
                          <div className="text-xs text-gray-500">{displayDepartment}</div>
                          <div className="text-xs text-gray-400">ID: {displayEmployeeId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(record.type)}`}>
                          {record.type.toUpperCase()}
                        </span>
                      </td>
                      {/* ✅ UPDATED: Location column with location names */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getLocationColor(locationType)}`}>
                            {getLocationIcon(locationType)}
                            <span className="ml-1">{locationType}</span>
                          </span>
                          {record.location && (
                            <button
                              onClick={() => openLocationOnMap(record.latitude, record.longitude)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                              title="View exact location on Google Maps"
                            >
                              📍 View Location
                            </button>
                          )}
                        </div>
                        
                        {/* ✅ NEW: Show location name instead of just coordinates */}
                        {record.location_name ? (
                          <div className="text-xs text-gray-600 mt-1 font-medium">
                            📍 {record.location_name}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">
                            {distance}m from office
                          </div>
                        )}
                        
                        {/* ✅ UPDATED: Show coordinates in smaller text */}
                        <div className="text-xs text-gray-400 mt-1">
                          <div>Lat: {record.latitude.toFixed(6)}</div>
                          <div>Lon: {record.longitude.toFixed(6)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          {/* ✅ UPDATED: Shows correct IST time */}
                          <div className="font-medium text-gray-900">{formatTime(record.time)}</div>
                          <div className="text-xs text-gray-400">
                            {formatDate(record.date)}
                          </div>
                          {/* ✅ NEW: Show full datetime on hover */}
                          <div className="text-xs text-gray-300" title={formatDateTime(record.time)}>
                            IST
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          {locationType === 'OFFICE' ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              VALID
                            </span>
                          ) : locationType === 'SITE' ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                              SITE
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              INVALID
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Office Location Settings */}
      {officeLocation && (
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">🏢 Office Location Settings</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Office Coordinates:</strong> {officeLocation.latitude}, {officeLocation.longitude}</p>
            <p><strong>Valid Radius:</strong> {officeLocation.radius} meters</p>
            <p><strong>Office Attendance:</strong> Employees must be within 200m radius. Attempts outside this radius will be rejected with error message.</p>
            <p><strong>Site Attendance:</strong> Can be marked from anywhere. Real-time location links are provided for verification.</p>
          </div>
        </div>
      )}

      {/* ✅ UPDATED: Location Link Features with location names */}
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-900 mb-2">📍 Location Features</h3>
        <div className="text-sm text-green-800 space-y-1">
          <p>📍 <strong>Location Names:</strong> Real location names displayed (e.g., "Hinjawadi IT Park, Pune")</p>
          <p>🗺️ <strong>View Location:</strong> Click "📍 View Location" to see exact position on Google Maps</p>
          <p>📱 <strong>Real-time Links:</strong> Links open employee's actual location when attendance was marked</p>
          <p>🔍 <strong>Verification:</strong> Supervisors can verify site attendance with precise location data</p>
          <p>🕐 <strong>IST Time Display:</strong> All times are shown in Indian Standard Time (IST)</p>
          <p>🌍 <strong>Geocoding:</strong> Automatic address lookup using OpenStreetMap</p>
        </div>
      </div>

      {/* ✅ UPDATED: API Status with location names */}
      <div className="bg-green-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-green-900 mb-2">✅ Live Attendance Tracking with Location Names</h3>
        <div className="text-sm text-green-800">
          <p><strong>Backend URL:</strong> {API_BASE_URL}</p>
          <p><strong>Features:</strong> Location validation, Office vs Site detection, Real-time updates, Location names</p>
          <p><strong>Office Location:</strong> 18.554397, 73.872530 (200m radius)</p>
          <p><strong>Timezone:</strong> Indian Standard Time (IST) - UTC +5:30</p>
          <p><strong>Geocoding:</strong> OpenStreetMap Nominatim API for location names</p>
          <p className="mt-2 text-xs">
            Connected to your Attendance Management API - all data is live with real location names displayed!
          </p>
        </div>
      </div>
    </div>
  );
}
