// routes/attendanceRoutes.js - UPDATED WITH REVERSE GEOCODING
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
  // Add 5.5 hours (330 minutes) for IST
  const istTime = new Date(now.getTime() + (330 * 60 * 1000));
  return istTime.toISOString();
};

// Helper function to get IST date
const getISTDate = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (330 * 60 * 1000));
  return istTime.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// ✅ NEW: Helper function to get location name from coordinates
const getLocationName = async (latitude, longitude) => {
  try {
    // Using OpenStreetMap Nominatim (free reverse geocoding)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&zoom=16`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding service unavailable');
    }
    
    const data = await response.json();
    
    if (data && data.display_name) {
      // Extract useful parts from the full address
      const address = data.address;
      let locationParts = [];
      
      // Add building/shop name if available
      if (address.building || address.shop || address.office) {
        locationParts.push(address.building || address.shop || address.office);
      }
      
      // Add road/street
      if (address.road) {
        locationParts.push(address.road);
      }
      
      // Add area/suburb
      if (address.suburb || address.neighbourhood) {
        locationParts.push(address.suburb || address.neighbourhood);
      }
      
      // Add city
      if (address.city || address.town || address.village) {
        locationParts.push(address.city || address.town || address.village);
      }
      
      // Add state
      if (address.state) {
        locationParts.push(address.state);
      }
      
      // Return formatted location (first 3-4 parts to keep it concise)
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
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; // Distance in meters
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

// Validation middleware for attendance
const validateAttendance = [
  body('user_id')
    .isUUID(4)
    .withMessage('Valid user ID is required (UUID format)'),
  
  body('type')
    .isIn(['check-in', 'check-out'])
    .withMessage('Type must be either check-in or check-out'),
  
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Valid latitude is required (-90 to 90)'),
  
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Valid longitude is required (-180 to 180)'),
  
  body('date')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Valid date is required (YYYY-MM-DD format)'),

  // Site attendance flag for explicit site check-ins
  body('is_site_attendance')
    .optional()
    .isBoolean()
    .withMessage('is_site_attendance must be boolean')
];

// Validation middleware for UUID parameters
const validateUUID = (paramName) => {
  return [
    param(paramName)
      .isUUID(4)
      .withMessage(`Valid ${paramName} is required (UUID format)`)
  ];
};

// POST - Mark Attendance (Check-in/Check-out) - UPDATED WITH REVERSE GEOCODING
router.post('/attendance', validateAttendance, async (req, res) => {
  try {
    console.log('📍 Processing attendance marking...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id, type, latitude, longitude, date, is_site_attendance } = req.body;
    const attendanceDate = date || getISTDate(); // ✅ Use IST date

    // Check if user exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name, employee_id')
      .eq('id', user_id)
      .single();

    if (employeeError || !employee) {
      console.log('❌ Employee not found:', employeeError);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Determine location type and validate office attendance
    const locationInfo = determineLocationType(latitude, longitude);
    
    // ✅ NEW: Get location name from coordinates
    const locationName = await getLocationName(latitude, longitude);
    
    const istTime = getISTTime(); // ✅ Get current IST time
    console.log('📍 Location Analysis:', {
      employee: employee.name,
      location: locationInfo,
      coordinates: { latitude, longitude },
      location_name: locationName, // ✅ Log location name
      is_site_attendance: is_site_attendance || false,
      ist_time: istTime // ✅ Log IST time
    });

    // STRICT OFFICE VALIDATION - Block attendance if not in office premises
    if (!locationInfo.isWithinOffice && !is_site_attendance) {
      console.log(`⚠️ Employee ${employee.name} attempting to mark attendance outside office premises`);
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
          'Contact admin if you need to mark site attendance'
        ]
      });
    }

    // If it's explicit site attendance, allow it but log appropriately
    if (is_site_attendance && !locationInfo.isWithinOffice) {
      console.log(`✅ Site attendance authorized for ${employee.name} at distance ${locationInfo.distance}m - Location: ${locationName}`);
    }

    // Check for duplicate attendance on the same day
    const { data: existingAttendance, error: checkError } = await supabase
      .from('attendance')
      .select('id, type, time')
      .eq('user_id', user_id)
      .eq('date', attendanceDate)
      .eq('type', type)
      .order('created_at', { ascending: false });

    if (checkError) {
      console.error('❌ Error checking existing attendance:', checkError);
    } else if (existingAttendance && existingAttendance.length > 0) {
      const lastAttendance = existingAttendance[0];
      const lastTime = new Date(lastAttendance.time);
      const now = new Date(istTime); // ✅ Compare with IST time
      const timeDiff = (now.getTime() - lastTime.getTime()) / (1000 * 60); // minutes

      // Prevent marking same type within 5 minutes
      if (timeDiff < 5) {
        return res.status(409).json({
          success: false,
          message: `You already marked ${type} ${Math.round(timeDiff)} minutes ago. Please wait before marking again.`,
          lastAttendance: {
            type: lastAttendance.type,
            time: lastAttendance.time
          }
        });
      }
    }

    // ✅ UPDATED: Insert attendance record with location name
    const { data, error } = await supabase
      .from('attendance')
      .insert([
        {
          user_id: user_id,
          date: attendanceDate,
          type: type,
          latitude: latitude,
          longitude: longitude,
          location_type: locationInfo.locationType, // Store OFFICE or SITE
          location_name: locationName, // ✅ NEW: Store location name
          time: istTime, // ✅ IST time
          time_in: type === 'check-in' ? istTime : null, // ✅ IST time
          created_at: istTime // ✅ IST time
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

    const attendanceMessage = locationInfo.isWithinOffice 
      ? `${type === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully at OFFICE premises`
      : `${type === 'check-in' ? 'Check-in' : 'Check-out'} marked successfully at SITE location`;

    console.log(`✅ Attendance marked: ${employee.name} - ${type} (${data.location_type}) at ${locationName || 'Unknown location'} - IST: ${istTime}`);

    // ✅ UPDATED: Success response with location name
    res.status(201).json({
      success: true,
      message: attendanceMessage,
      data: {
        id: data.id,
        employee: {
          id: employee.id,
          name: employee.name,
          employee_id: employee.employee_id
        },
        attendance: {
          date: data.date,
          type: data.type,
          time: data.time, // ✅ This will be IST time
          location_type: data.location_type,
          location_name: data.location_name, // ✅ NEW: Include location name
          location: {
            coordinates: {
              latitude: data.latitude,
              longitude: data.longitude
            },
            distance_from_office: locationInfo.distance,
            within_office_radius: locationInfo.isWithinOffice,
            validation_status: locationInfo.isWithinOffice ? 'OFFICE_VALID' : 'SITE_AUTHORIZED'
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

// POST - Site Attendance (Explicit route for site check-ins)
router.post('/attendance/site', validateAttendance, async (req, res) => {
  try {
    console.log('📍 Processing SITE attendance marking...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Force site attendance flag and process through main route
    const modifiedBody = { ...req.body, is_site_attendance: true };
    const modifiedReq = { ...req, body: modifiedBody };
    
    // Recursively call the main attendance route with site flag
    return router.post('/attendance').call(this, modifiedReq, res);

  } catch (error) {
    console.error('❌ Error marking site attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET - Get all attendance records (Admin view) - UPDATED WITH LOCATION_NAME
router.get('/attendance', async (req, res) => {
  try {
    console.log('📋 Admin fetching all attendance records...');
    
    const { 
      date, 
      user_id, 
      type, 
      location_type, // NEW: Filter by location type
      limit = 50, 
      offset = 0,
      sort_by = 'time',
      sort_order = 'desc'
    } = req.query;
    
    // ✅ UPDATED: Build query with employee details including location_name
    let query = supabase
      .from('attendance')
      .select(`
        *,
        user:employees!user_id (
          name,
          employee_id,
          email,
          department
        )
      `);
    
    // Apply filters
    if (date) {
      query = query.eq('date', date);
    }
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    if (type && ['check-in', 'check-out'].includes(type)) {
      query = query.eq('type', type);
    }

    // NEW: Filter by location type
    if (location_type && ['OFFICE', 'SITE'].includes(location_type)) {
      query = query.eq('location_type', location_type);
    }
    
    // Apply sorting
    const validSortFields = ['time', 'date', 'created_at', 'type', 'location_type'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'time';
    const sortAscending = sort_order.toLowerCase() === 'asc';
    
    query = query.order(sortField, { ascending: sortAscending });
    
    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching attendance records:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching attendance records',
        error: error.message
      });
    }

    // ✅ UPDATED: Enhance data with location names
    const enhancedRecords = data.map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        employee_name: record.user?.name || 'Unknown',
        employee_id: record.user?.employee_id || 'Unknown',
        department: record.user?.department || 'Unknown',
        // Use database location_type as primary, fallback to calculated
        location_type_stored: record.location_type || locationInfo.locationType,
        location_name: record.location_name, // ✅ NEW: Include stored location name
        location: {
          type: record.location_type || locationInfo.locationType, // Prefer database value
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
        total: enhancedRecords.length
      },
      filters_applied: {
        date: date || 'all',
        user_id: user_id || 'all',
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

// GET - Get attendance summary/statistics - UPDATED WITH LOCATION_NAME
router.get('/attendance/admin/summary', async (req, res) => {
  try {
    console.log('📊 Admin fetching attendance summary...');
    
    const today = getISTDate(); // ✅ Use IST date for today
    
    // ✅ UPDATED: Get today's attendance with location names
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

    // Calculate summary statistics using stored location_type
    const summary = {
      today: {
        total_records: todayAttendance.length,
        check_ins: todayAttendance.filter(a => a.type === 'check-in').length,
        check_outs: todayAttendance.filter(a => a.type === 'check-out').length,
        office_checkins: 0,
        site_checkins: 0
      }
    };

    // Analyze location types using database values
    todayAttendance.forEach(record => {
      if (record.type === 'check-in') {
        // Use stored location_type first, fallback to calculation
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

    // ✅ UPDATED: Get recent attendance records with location names
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
        user:employees!user_id (
          name,
          employee_id
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
        employee_name: record.user?.name || 'Unknown',
        location_name: record.location_name, // ✅ NEW: Include location name
        location: {
          type: record.location_type || locationInfo.locationType, // Use stored value
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
          site_attendance: 'Available via explicit site check-in'
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

// GET - Get user's attendance records - UPDATED WITH LOCATION_NAME
router.get('/attendance/user/:user_id', validateUUID('user_id'), async (req, res) => {
  try {
    console.log('👤 Fetching user attendance records...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id } = req.params;
    const { date, type, limit = 30, offset = 0 } = req.query;
    
    let query = supabase
      .from('attendance')
      .select('*') // This now includes location_type and location_name columns
      .eq('user_id', user_id)
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
      console.error('❌ Error fetching user attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching attendance records'
      });
    }

    // ✅ UPDATED: Enhance with location information including location names
    const enhancedRecords = data.map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        location_name: record.location_name, // ✅ NEW: Include location name
        location: {
          type: record.location_type || locationInfo.locationType, // Use stored value first
          distance_from_office: locationInfo.distance,
          within_office_radius: locationInfo.isWithinOffice,
          validation_status: (record.location_type || locationInfo.locationType) === 'OFFICE' ? 'OFFICE_VALID' : 'SITE_ATTENDANCE'
        }
      };
    });

    console.log(`✅ Found ${enhancedRecords.length} attendance records for user:`, user_id);

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
    console.error('❌ Error fetching user attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance records'
    });
  }
});

// GET - Get attendance for specific date - UPDATED WITH LOCATION_NAME
router.get('/attendance/date/:date', async (req, res) => {
  try {
    console.log('📅 Fetching attendance for specific date...');
    
    const { date } = req.params;
    
    // Validate date format
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
        user:employees!user_id (
          name,
          employee_id,
          department
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

    // ✅ UPDATED: Enhance with location analysis including location names
    const enhancedRecords = data.map(record => {
      const locationInfo = determineLocationType(
        parseFloat(record.latitude), 
        parseFloat(record.longitude)
      );
      
      return {
        ...record,
        employee_name: record.user?.name || 'Unknown',
        employee_id: record.user?.employee_id || 'Unknown',
        department: record.user?.department || 'Unknown',
        location_name: record.location_name, // ✅ NEW: Include location name
        location: {
          type: record.location_type || locationInfo.locationType, // Use stored value
          distance_from_office: locationInfo.distance,
          within_office_radius: locationInfo.isWithinOffice,
          validation_status: (record.location_type || locationInfo.locationType) === 'OFFICE' ? 'OFFICE_VALID' : 'SITE_ATTENDANCE'
        }
      };
    });

    // Calculate daily statistics using stored location_type
    const stats = {
      total_records: enhancedRecords.length,
      check_ins: enhancedRecords.filter(r => r.type === 'check-in').length,
      check_outs: enhancedRecords.filter(r => r.type === 'check-out').length,
      office_checkins: enhancedRecords.filter(r => r.type === 'check-in' && (r.location_type || r.location.type) === 'OFFICE').length,
      site_checkins: enhancedRecords.filter(r => r.type === 'check-in' && (r.location_type || r.location.type) === 'SITE').length,
      unique_employees: [...new Set(enhancedRecords.map(r => r.user_id))].length
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

module.exports = router;
