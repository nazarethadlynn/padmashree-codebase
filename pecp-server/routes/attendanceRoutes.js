// routes/attendanceRoutes.js - FULLY CORRECTED & WORKING
const express = require('express');
const { body, validationResult, param } = require('express-validator');
const supabase = require('../config/supabaseClient');

const router = express.Router();

// Office location configuration
const OFFICE_LOCATION = {
  latitude: 18.554397,
  longitude: 73.872530,
  radius: 200 // meters
};

// Helper function to get IST time
const getISTTime = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (330 * 60 * 1000));
  return istTime.toISOString();
};

// Helper function to get IST date
const getISTDate = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (330 * 60 * 1000));
  return istTime.toISOString().split('T')[0];
};

// Helper function to get location name from coordinates
const getLocationName = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=16`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (data && data.display_name) {
      const address = data.address;
      let locationParts = [];
      
      if (address.building || address.shop || address.office) {
        locationParts.push(address.building || address.shop || address.office);
      }
      
      if (address.road) {
        locationParts.push(address.road);
      }
      
      if (address.suburb || address.neighbourhood) {
        locationParts.push(address.suburb || address.neighbourhood);
      }
      
      if (address.city || address.town || address.village) {
        locationParts.push(address.city || address.town || address.village);
      }
      
      if (address.state) {
        locationParts.push(address.state);
      }
      
      const formattedLocation = locationParts.slice(0, 3).join(', ');
      return formattedLocation || data.display_name.split(',').slice(0, 3).join(', ');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting location name:', error);
    return null;
  }
};

// Helper function to calculate distance using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // ✅ FIXED: Added null/undefined checks
  if (!lat1 || !lon1 || !lat2 || !lon2 || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.error('❌ Invalid coordinates for distance calculation:', { lat1, lon1, lat2, lon2 });
    return 999999; // Return large distance for safety
  }

  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance);
};

// Helper function to determine attendance location type
const determineLocationType = (latitude, longitude) => {
  const distanceFromOffice = calculateDistance(
    latitude, 
    longitude,
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude
  );

  return {
    isWithinOffice: distanceFromOffice <= OFFICE_LOCATION.radius,
    distance: distanceFromOffice,
    locationType: distanceFromOffice <= OFFICE_LOCATION.radius ? 'OFFICE' : 'SITE'
  };
};

// ✅ CORRECTED: Validation middleware
const validateAttendance = [
  body('employee_id')
    .trim()
    .notEmpty()
    .withMessage('Employee ID is required')
    .isString()
    .withMessage('Employee ID must be a string'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Type is required')
    .isIn(['check-in', 'check-out'])
    .withMessage('Type must be either check-in or check-out'),
  
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required (-90 to 90)'),
  
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required (-180 to 180)'),
  
  body('date')
    .optional()
    .trim()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Valid date is required (YYYY-MM-DD format)'),

  body('is_site_attendance')
    .optional()
    .isBoolean()
    .withMessage('is_site_attendance must be boolean')
];

// Validation middleware for ID parameters
const validateEmployeeParam = (paramName) => {
  return [
    param(paramName)
      .trim()
      .notEmpty()
      .withMessage(`Valid ${paramName} is required`)
  ];
};

// ========================================
// POST - Mark Attendance (Check-in/Check-out)
// ========================================
// POST - Mark Attendance (Check-in/Check-out) - OFFICE AND SITE COMBINED
router.post('/attendance', validateAttendance, async (req, res) => {
  try {
    console.log('📍 Processing attendance marking...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { employee_id, type, latitude, longitude, date, is_site_attendance } = req.body;
    const attendanceDate = date || getISTDate();

    console.log('📍 Request received:', { 
      employee_id, 
      type, 
      latitude, 
      longitude, 
      attendanceDate,
      is_site_attendance: is_site_attendance || false
    });

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, employee_id, department, position')
      .eq('employee_id', employee_id)
      .single();

    if (employeeError || !employee) {
      console.log('❌ Employee not found:', employeeError);
      return res.status(404).json({
        success: false,
        message: 'Employee not found',
        details: `No employee found with ID: ${employee_id}`
      });
    }

    console.log('✅ Employee found:', employee.name);

    // Determine location type and validate office attendance
    const locationInfo = determineLocationType(latitude, longitude);
    const locationName = await getLocationName(latitude, longitude);
    const istTime = getISTTime();
    
    console.log('📍 Location Analysis:', {
      employee: employee.name,
      distance: locationInfo.distance,
      isWithinOffice: locationInfo.isWithinOffice,
      coordinates: { latitude, longitude },
      location_name: locationName,
      is_site_attendance: is_site_attendance || false,
      ist_time: istTime
    });

    // ✅ ENHANCED: FLEXIBLE LOCATION VALIDATION
    // If NOT in office AND NOT marking as site attendance -> REJECT
    if (!locationInfo.isWithinOffice && !is_site_attendance) {
      console.log(`⚠️ Employee ${employee.name} attempting to mark attendance outside office premises (no site flag)`);
      return res.status(403).json({
        success: false,
        message: 'You are not in the office premises. Attendance can only be marked within 200 meters of the office location.',
        location_info: {
          your_distance_from_office: `${locationInfo.distance} meters`,
          location_name: locationName,
          office_location: {
            latitude: OFFICE_LOCATION.latitude,
            longitude: OFFICE_LOCATION.longitude
          },
          allowed_radius: `${OFFICE_LOCATION.radius} meters`,
          current_location: {
            latitude: latitude,
            longitude: longitude
          }
        },
        instructions: [
          'Move closer to the office premises (within 200 meters)',
          'Ensure your GPS location is accurate',
          'OR set is_site_attendance=true to mark attendance from site location'
        ],
        hint: 'To mark site attendance, send: {"is_site_attendance": true}'
      });
    }

    // ✅ ENHANCED: Log site attendance authorization
    if (is_site_attendance) {
      const siteStatus = locationInfo.isWithinOffice 
        ? `✅ Site attendance flag set (but employee IS within office - ${locationInfo.distance}m away)`
        : `✅ Site attendance authorized for ${employee.name} at distance ${locationInfo.distance}m - Location: ${locationName}`;
      console.log(siteStatus);
    }

    // Check for ANY attendance on the same day (ONE-ATTENDANCE-PER-DAY ENFORCEMENT)
    const { data: todayAttendance, error: todayError } = await supabase
      .from('attendance')
      .select('id, type, time, location_type')
      .eq('employee_id', employee_id)
      .eq('date', attendanceDate)
      .order('time', { ascending: false })
      .limit(1);

    if (todayError) {
      console.error('❌ Error checking today attendance:', todayError);
    } else if (todayAttendance && todayAttendance.length > 0) {
      console.log(`⚠️ Employee ${employee.name} already marked attendance today`);
      return res.status(409).json({
        success: false,
        message: 'You have already marked attendance once today. Only one attendance per day is allowed.',
        existing_attendance: {
          type: todayAttendance[0].type,
          time: todayAttendance[0].time,
          location_type: todayAttendance[0].location_type
        },
        contact_admin: 'Contact admin to modify or delete previous attendance record'
      });
    }

    // Check for duplicate attendance within 5 minutes (same type)
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance')
      .select('id, type, time')
      .eq('employee_id', employee_id)
      .eq('date', attendanceDate)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (checkError) {
      console.error('❌ Error checking existing attendance:', checkError);
    } else if (existingAttendance && existingAttendance.length > 0) {
      const lastAttendance = existingAttendance[0];
      const lastTime = new Date(lastAttendance.time);
      const now = new Date(istTime);
      const timeDiff = (now.getTime() - lastTime.getTime()) / (1000 * 60);

      if (timeDiff < 5) {
        return res.status(409).json({
          success: false,
          message: `You already marked ${type} ${Math.round(timeDiff)} minutes ago. Please wait before marking again.`,
          lastAttendance: {
            type: lastAttendance.type,
            time: lastAttendance.time
          },
          retry_after_seconds: Math.round((5 - timeDiff) * 60)
        });
      }
    }

    // ✅ ENHANCED: Determine final location type
    // If is_site_attendance=true, mark as SITE regardless of distance
    // Otherwise, use calculated location type
    const finalLocationType = is_site_attendance ? 'SITE' : locationInfo.locationType;

    // Insert attendance record with real-time location
    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          employee_id: employee_id,
          date: attendanceDate,
          type: type,
          latitude: latitude,  // ✅ Real-time GPS coordinates
          longitude: longitude,  // ✅ Real-time GPS coordinates
          location_type: finalLocationType,  // ✅ OFFICE or SITE
          location_name: locationName,  // ✅ Geocoded address name
          time: istTime,
          time_in: type === 'check-in' ? istTime : null,
          created_at: istTime
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to mark attendance',
        error: error.message
      });
    }

    // ✅ ENHANCED: Dynamic message based on location
    let attendanceMessage;
    if (is_site_attendance) {
      attendanceMessage = `${type === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully at SITE location (${locationInfo.distance}m from office)`;
    } else if (locationInfo.isWithinOffice) {
      attendanceMessage = `${type === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully at OFFICE premises`;
    } else {
      attendanceMessage = `${type === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully`;
    }

    console.log(`✅ Attendance marked: ${employee.name} - ${type} (${finalLocationType}) at ${locationName || 'Unknown location'} - IST: ${istTime}`);

    res.status(201).json({
      success: true,
      message: attendanceMessage,
      data: {
        id: data.id,
        employee: {
          id: employee.id,
          name: employee.name,
          employee_id: employee.employee_id,
          department: employee.department,
          position: employee.position
        },
        attendance: {
          date: data.date,
          type: data.type,
          time: data.time,
          location_type: data.location_type,  // ✅ OFFICE or SITE
          location_name: data.location_name,
          location: {
            coordinates: {
              latitude: data.latitude,  // ✅ Real GPS location visible to admin
              longitude: data.longitude  // ✅ Real GPS location visible to admin
            },
            distance_from_office: locationInfo.distance,  // ✅ Distance calculation
            within_office_radius: locationInfo.isWithinOffice,
            validation_status: is_site_attendance ? 'SITE_ATTENDANCE' : 
                              (locationInfo.isWithinOffice ? 'OFFICE_VALID' : 'SITE_AUTHORIZED')
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Error marking attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// ========================================
// GET - Get all attendance records (Admin view)
// ========================================
router.get('/attendance', async (req, res) => {
  try {
    console.log('📋 Admin fetching all attendance records...');
    
    const { 
      date, 
      employee_id, 
      type, 
      location_type,
      limit = 50, 
      offset = 0,
      sort_by = 'time',
      sort_order = 'desc'
    } = req.query;
    
    let query = supabase
      .from('attendance')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          name,
          employee_id,
          email,
          department,
          position
        )
      `, { count: 'exact' });
    
    if (date) {
      query = query.eq('date', date);
    }
    
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }
    
    if (type && ['check-in', 'check-out'].includes(type)) {
      query = query.eq('type', type);
    }

    if (location_type && ['OFFICE', 'SITE'].includes(location_type)) {
      query = query.eq('location_type', location_type);
    }
    
    const validSortFields = ['time', 'date', 'created_at', 'type', 'location_type'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'time';
    const sortAscending = sort_order.toLowerCase() === 'asc';
    
    query = query.order(sortField, { ascending: sortAscending });
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching attendance records:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching attendance records',
        error: error.message
      });
    }

    const enhancedRecords = data.map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        employee_name: record.employee?.name || 'Unknown',
        employee_id_display: record.employee?.employee_id || 'Unknown',
        department: record.employee?.department || 'Unknown',
        position: record.employee?.position || 'Unknown',
        location: {
          type: record.location_type || locationInfo.locationType,
          distance_from_office: locationInfo.distance,
          within_office_radius: locationInfo.isWithinOffice,
          coordinates: {
            latitude: record.latitude,
            longitude: record.longitude
          },
          validation_status: (record.location_type || locationInfo.locationType) === 'OFFICE' ? 'OFFICE_VALID' : 'SITE_ATTENDANCE'
        }
      };
    });

    console.log(`✅ Found ${enhancedRecords.length} attendance records`);

    res.json({
      success: true,
      message: `Found ${enhancedRecords.length} attendance record(s)`,
      data: enhancedRecords,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      },
      filters_applied: {
        date: date || 'all',
        employee_id: employee_id || 'all',
        type: type || 'all',
        location_type: location_type || 'all',
        sort_by: sortField,
        sort_order: sort_order
      }
    });
  } catch (error) {
    console.error('❌ Error fetching attendance records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records'
    });
  }
});

// ========================================
// GET - Get attendance summary/statistics
// ========================================
router.get('/attendance/admin/summary', async (req, res) => {
  try {
    console.log('📊 Admin fetching attendance summary...');
    
    const today = getISTDate();
    
    const { data: todayAttendance, error: todayError } = await supabase
      .from('attendance')
      .select('type, latitude, longitude, location_type, location_name')
      .eq('date', today);

    if (todayError) {
      console.error('❌ Error fetching today\'s attendance:', todayError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching summary data'
      });
    }

    const summary = {
      today: {
        total_records: todayAttendance.length,
        check_ins: todayAttendance.filter(a => a.type === 'check-in').length,
        check_outs: todayAttendance.filter(a => a.type === 'check-out').length,
        office_checkins: 0,
        site_checkins: 0
      }
    };

    todayAttendance.forEach(record => {
      if (record.type === 'check-in') {
        const locationType = record.location_type || 
          determineLocationType(
            parseFloat(record.latitude), 
            parseFloat(record.longitude)
          ).locationType;
        
        if (locationType === 'OFFICE') {
          summary.today.office_checkins++;
        } else {
          summary.today.site_checkins++;
        }
      }
    });

    const { data: recentRecords, error: recentError } = await supabase
      .from('attendance')
      .select(`
        id,
        date,
        type,
        time,
        latitude,
        longitude,
        location_type,
        location_name,
        employee_id,
        employee:employees!employee_id (
          name,
          employee_id,
          department
        )
      `)
      .order('time', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ Error fetching recent records:', recentError);
    }

    const enhancedRecentRecords = (recentRecords || []).map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        employee_name: record.employee?.name || 'Unknown',
        location: {
          type: record.location_type || locationInfo.locationType,
          distance_from_office: locationInfo.distance,
          validation_status: (record.location_type || locationInfo.locationType) === 'OFFICE' ? 'OFFICE_VALID' : 'SITE_ATTENDANCE'
        }
      };
    });

    console.log('✅ Attendance summary data fetched successfully');

    res.json({
      success: true,
      message: 'Attendance summary fetched successfully',
      data: {
        summary,
        recent_records: enhancedRecentRecords,
        office_location: {
          latitude: OFFICE_LOCATION.latitude,
          longitude: OFFICE_LOCATION.longitude,
          radius: OFFICE_LOCATION.radius
        },
        validation_rules: {
          office_radius: `${OFFICE_LOCATION.radius} meters`,
          office_validation: 'STRICT - Must be within office premises',
          site_attendance: 'Available via explicit site check-in',
          daily_limit: 'ONE attendance per day - Employee cannot mark attendance more than once per day'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching attendance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary data'
    });
  }
});

// ========================================
// GET - Get employee's attendance records
// ========================================
router.get('/attendance/employee/:employee_id', validateEmployeeParam('employee_id'), async (req, res) => {
  try {
    console.log('👤 Fetching employee attendance records...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { employee_id } = req.params;
    const { date, type, limit = 30, offset = 0 } = req.query;
    
    let query = supabase
      .from('attendance')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .eq('employee_id', employee_id)
      .order('time', { ascending: false });
    
    if (date) {
      query = query.eq('date', date);
    }
    
    if (type && ['check-in', 'check-out'].includes(type)) {
      query = query.eq('type', type);
    }
    
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching employee attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching attendance records'
      });
    }

    const enhancedRecords = data.map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        employee_name: record.employee?.name || 'Unknown',
        location: {
          type: record.location_type || locationInfo.locationType,
          distance_from_office: locationInfo.distance,
          within_office_radius: locationInfo.isWithinOffice,
          validation_status: (record.location_type || locationInfo.locationType) === 'OFFICE' ? 'OFFICE_VALID' : 'SITE_ATTENDANCE'
        }
      };
    });

    console.log(`✅ Found ${enhancedRecords.length} attendance records for employee:`, employee_id);

    res.json({
      success: true,
      message: `Found ${enhancedRecords.length} attendance record(s)`,
      data: enhancedRecords,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: enhancedRecords.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching employee attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records'
    });
  }
});

// ========================================
// GET - Get attendance for specific date
// ========================================
router.get('/attendance/date/:date', async (req, res) => {
  try {
    console.log('📅 Fetching attendance for specific date...');
    
    const { date } = req.params;
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD'
      });
    }

    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employee:employees!employee_id (
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .eq('date', date)
      .order('time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching date attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching attendance records'
      });
    }

    const enhancedRecords = data.map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        employee_name: record.employee?.name || 'Unknown',
        employee_id_display: record.employee?.employee_id || 'Unknown',
        department: record.employee?.department || 'Unknown',
        position: record.employee?.position || 'Unknown',
        location: {
          type: record.location_type || locationInfo.locationType,
          distance_from_office: locationInfo.distance,
          within_office_radius: locationInfo.isWithinOffice,
          validation_status: (record.location_type || locationInfo.locationType) === 'OFFICE' ? 'OFFICE_VALID' : 'SITE_ATTENDANCE'
        }
      };
    });

    const stats = {
      total_records: enhancedRecords.length,
      check_ins: enhancedRecords.filter(r => r.type === 'check-in').length,
      check_outs: enhancedRecords.filter(r => r.type === 'check-out').length,
      office_checkins: enhancedRecords.filter(r => r.type === 'check-in' && (r.location_type || r.location.type) === 'OFFICE').length,
      site_checkins: enhancedRecords.filter(r => r.type === 'check-in' && (r.location_type || r.location.type) === 'SITE').length,
      unique_employees: [...new Set(enhancedRecords.map(r => r.employee_id))].length
    };

    console.log(`✅ Found ${enhancedRecords.length} attendance records for ${date}`);

    res.json({
      success: true,
      message: `Found ${enhancedRecords.length} attendance record(s) for ${date}`,
      data: enhancedRecords,
      statistics: stats,
      date: date
    });

  } catch (error) {
    console.error('❌ Error fetching date attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records'
    });
  }
});

// ========================================
// DELETE - Delete attendance record (Admin only)
// ========================================
router.delete('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting attendance record: ${id}`);

    // Validate ID is numeric
    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance ID format'
      });
    }

    const { data, error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error deleting attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting attendance record'
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    console.log('✅ Attendance record deleted successfully');

    res.json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('❌ Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance record'
    });
  }
});

module.exports = router;
