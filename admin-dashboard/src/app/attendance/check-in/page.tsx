// src/app/attendance/check-in/page.tsx
'use client'
import { useState } from 'react';

export default function CheckInPage() {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [message, setMessage] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<any>(null);

  const API_BASE_URL = 'http://localhost:3001/api';
  
  // Replace with actual logged-in user ID
  const userId = '8fa4b38d-fdf2-42a6-942c-9917520adacf';

  const getCurrentLocation = () => {
    return new Promise<{latitude: number, longitude: number}>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  const markAttendance = async (type: 'check-in' | 'check-out') => {
    try {
      setLoading(true);
      setMessage('Getting your location...');
      
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      setMessage('Marking attendance...');
      
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          type: type,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        })
      });

      const data = await response.json();
      setLastResponse(data);
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error marking attendance:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const markSiteAttendance = async (type: 'check-in' | 'check-out') => {
    try {
      setLoading(true);
      setMessage('Getting your location for site attendance...');
      
      const currentLocation = await getCurrentLocation();
      setLocation(currentLocation);
      
      setMessage('Marking site attendance...');
      
      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          type: type,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          is_site_attendance: true
        })
      });

      const data = await response.json();
      setLastResponse(data);
      
      if (data.success) {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`❌ ${data.message}`);
      }
      
    } catch (error: any) {
      console.error('❌ Error marking site attendance:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Employee Check-in System</h1>
      
      {/* Office Check-in */}
      <div className="mb-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
        <h2 className="text-lg font-semibold mb-3 text-blue-900">🏢 Office Attendance</h2>
        <p className="text-sm text-blue-700 mb-4">Must be within 200 meters of office location</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => markAttendance('check-in')}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : '📍 Office Check In'}
          </button>
          
          <button
            onClick={() => markAttendance('check-out')}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : '📍 Office Check Out'}
          </button>
        </div>
      </div>

      {/* Site Check-in */}
      <div className="mb-6 p-4 border border-orange-200 rounded-lg bg-orange-50">
        <h2 className="text-lg font-semibold mb-3 text-orange-900">📍 Site Attendance</h2>
        <p className="text-sm text-orange-700 mb-4">Can be marked from any location</p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => markSiteAttendance('check-in')}
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : '📍 Site Check In'}
          </button>
          
          <button
            onClick={() => markSiteAttendance('check-out')}
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : '📍 Site Check Out'}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.startsWith('✅') ? 'bg-green-100 text-green-800' : 
          message.startsWith('❌') ? 'bg-red-100 text-red-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      {/* Location Info */}
      {location && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-700 mb-2">
            <strong>Your Location:</strong> {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </p>
          <button
            onClick={() => window.open(`https://maps.google.com/maps?q=${location.latitude},${location.longitude}`, '_blank')}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            📍 View on Google Maps
          </button>
        </div>
      )}

      {/* Response Details */}
      {lastResponse && (
        <div className="p-3 bg-gray-50 rounded-md">
          <p className="text-xs text-gray-600 mb-2"><strong>Response Details:</strong></p>
          {lastResponse.success && lastResponse.data && (
            <div className="text-xs text-gray-700 space-y-1">
              <p><strong>Location Type:</strong> {lastResponse.data.attendance.location_type}</p>
              <p><strong>Distance from Office:</strong> {lastResponse.data.attendance.location?.distance_from_office}m</p>
              <p><strong>Validation:</strong> {lastResponse.data.attendance.location?.validation_status}</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Instructions:</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• <strong>Office Check-in:</strong> Only works within 200m of office premises</li>
          <li>• <strong>Site Check-in:</strong> Works from any location for field work</li>
          <li>• <strong>GPS Required:</strong> Please allow location access for accurate tracking</li>
          <li>• <strong>Duplicate Prevention:</strong> Cannot mark same type within 5 minutes</li>
        </ul>
      </div>
    </div>
  );
}
