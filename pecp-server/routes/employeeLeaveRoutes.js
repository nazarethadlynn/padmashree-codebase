// routes/employeeLeaveRoutes.js
const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase (get from environment)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Validation middleware for leave requests
const validateLeaveRequest = [
  body('user_id')
    .isUUID(4)
    .withMessage('Valid user ID is required (UUID format)'),
  
  body('from_date')
    .isISO8601({ strict: true })
    .withMessage('Valid start date is required (YYYY-MM-DD format)')
    .custom((value) => {
      const today = new Date();
      const fromDate = new Date(value);
      if (fromDate < today.setHours(0, 0, 0, 0)) {
        throw new Error('Start date cannot be in the past');
      }
      return true;
    }),
  
  body('to_date')
    .isISO8601({ strict: true })
    .withMessage('Valid end date is required (YYYY-MM-DD format)')
    .custom((value, { req }) => {
      const fromDate = new Date(req.body.from_date);
      const toDate = new Date(value);
      if (toDate < fromDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10-500 characters'),
  
  body('comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters')
];

// Validation middleware for status updates (Admin)
const validateStatusUpdate = [
  param('id')
    .isUUID(4)
    .withMessage('Valid leave request ID is required'),
  
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be either approved or rejected'),
  
  body('reviewed_by')
    .isUUID(4)
    .withMessage('Valid reviewer ID is required'),
  
  body('comments')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Comments cannot exceed 1000 characters')
];

// Validation middleware for UUID parameters
const validateUUID = (paramName) => {
  return [
    param(paramName)
      .isUUID(4)
      .withMessage(`Valid ${paramName} is required (UUID format)`)
  ];
};

// Helper function to calculate total days
const calculateTotalDays = (fromDate, toDate) => {
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);
  const timeDifference = toDateObj.getTime() - fromDateObj.getTime();
  return Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
};

// CREATE - Submit new leave request
router.post('/leave-requests', validateLeaveRequest, async (req, res) => {
  try {
    console.log('📝 Processing leave request submission...');
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id, from_date, to_date, reason, comments } = req.body;

    // Check if user exists
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('id', user_id)
      .single();

    if (employeeError || !employee) {
      console.log('❌ Employee not found:', employeeError);
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check for overlapping leave requests
    const { data: overlapping, error: overlapError } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', user_id)
      .in('status', ['pending', 'approved'])
      .or(`and(from_date.lte.${to_date},to_date.gte.${from_date})`);

    if (overlapError) {
      console.error('Error checking overlapping requests:', overlapError);
    } else if (overlapping && overlapping.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Overlapping leave request found. You already have a pending or approved leave during this period.'
      });
    }

    // Calculate total days
    const totalDays = calculateTotalDays(from_date, to_date);

    // Insert leave request
    const { data, error } = await supabase
      .from('leave_requests')
      .insert([
        {
          user_id: user_id,
          from_date: from_date,
          to_date: to_date,
          reason: reason,
          comments: comments || null,
          status: 'pending'
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create leave request',
        error: error.message
      });
    }

    console.log('✅ Leave request created successfully:', data.id);

    // Success response
    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: {
        id: data.id,
        user_id: data.user_id,
        from_date: data.from_date,
        to_date: data.to_date,
        reason: data.reason,
        comments: data.comments,
        status: data.status,
        total_days: totalDays,
        applied_date: data.applied_date,
        created_at: data.created_at
      }
    });

  } catch (error) {
    console.error('❌ Error creating leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// ADMIN - Get all leave requests (Fixed joins with proper syntax)
router.get('/leave-requests', async (req, res) => {
  try {
    console.log('📋 Admin fetching all leave requests...');
    
    const { 
      status, 
      user_id, 
      limit = 50, 
      offset = 0,
      sort_by = 'applied_date',
      sort_order = 'desc'
    } = req.query;
    
    // Build query with proper joins using foreign key relationships
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        user:employees!user_id (
          name,
          employee_id,
          email,
          department
        ),
        reviewer:employees!reviewed_by (
          name,
          employee_id
        )
      `);
    
    // Apply filters
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    // Apply sorting
    const validSortFields = ['applied_date', 'from_date', 'to_date', 'status', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'applied_date';
    const sortAscending = sort_order.toLowerCase() === 'asc';
    
    query = query.order(sortField, { ascending: sortAscending });
    
    // Apply pagination
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching leave requests:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching leave requests',
        error: error.message
      });
    }

    // Calculate total days and enhance data for admin view
    const leaveRequests = data.map(request => ({
      ...request,
      total_days: calculateTotalDays(request.from_date, request.to_date),
      employee_name: request.user?.name || 'Unknown',
      employee_id: request.user?.employee_id || 'Unknown',
      employee_email: request.user?.email || 'Unknown',
      department: request.user?.department || 'Unknown',
      reviewer_name: request.reviewer?.name || null
    }));

    console.log(`✅ Admin found ${leaveRequests.length} leave requests`);

    res.json({
      success: true,
      message: `Found ${leaveRequests.length} leave request(s)`,
      data: leaveRequests,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: leaveRequests.length
      },
      filters_applied: {
        status: status || 'all',
        user_id: user_id || 'all',
        sort_by: sortField,
        sort_order: sort_order
      }
    });
  } catch (error) {
    console.error('❌ Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave requests'
    });
  }
});

// ADMIN - Get leave requests summary/statistics
router.get('/leave-requests/admin/summary', async (req, res) => {
  try {
    console.log('📊 Admin fetching leave requests summary...');
    
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('leave_requests')
      .select('status')
      .not('status', 'is', null);

    if (statusError) {
      console.error('❌ Error fetching status counts:', statusError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching summary data'
      });
    }

    // Calculate summary statistics
    const summary = {
      total_requests: statusCounts.length,
      pending: statusCounts.filter(req => req.status === 'pending').length,
      approved: statusCounts.filter(req => req.status === 'approved').length,
      rejected: statusCounts.filter(req => req.status === 'rejected').length
    };

    // Get recent requests (last 5) with fixed join syntax
    const { data: recentRequests, error: recentError } = await supabase
      .from('leave_requests')
      .select(`
        id,
        from_date,
        to_date,
        status,
        applied_date,
        user:employees!user_id (
          name,
          employee_id
        )
      `)
      .order('applied_date', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Error fetching recent requests:', recentError);
    }

    const enhancedRecentRequests = (recentRequests || []).map(request => ({
      ...request,
      total_days: calculateTotalDays(request.from_date, request.to_date),
      employee_name: request.user?.name || 'Unknown'
    }));

    console.log('✅ Admin summary data fetched successfully');

    res.json({
      success: true,
      message: 'Leave requests summary fetched successfully',
      data: {
        summary,
        recent_requests: enhancedRecentRequests
      }
    });

  } catch (error) {
    console.error('❌ Error fetching admin summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching summary data'
    });
  }
});

// Get specific leave request by ID (for detailed view)
router.get('/leave-requests/:id', validateUUID('id'), async (req, res) => {
  try {
    console.log('🔍 Fetching specific leave request...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        user:employees!user_id (
          name,
          employee_id,
          email,
          department
        ),
        reviewer:employees!reviewed_by (
          name,
          employee_id
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      console.log('❌ Leave request not found:', error);
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    console.log('✅ Leave request fetched successfully:', id);

    res.json({
      success: true,
      data: {
        ...data,
        total_days: calculateTotalDays(data.from_date, data.to_date),
        employee_name: data.user?.name || 'Unknown',
        employee_id: data.user?.employee_id || 'Unknown',
        employee_email: data.user?.email || 'Unknown',
        department: data.user?.department || 'Unknown',
        reviewer_name: data.reviewer?.name || null
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave request'
    });
  }
});

// ADMIN - Update leave request status (Approve/Reject) - Fixed
router.patch('/leave-requests/:id/status', validateStatusUpdate, async (req, res) => {
  try {
    console.log('🔄 Admin updating leave request status...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, reviewed_by, comments } = req.body;

    // Check if leave request exists
    const { data: existingRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingRequest) {
      console.log('❌ Leave request not found:', fetchError);
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    if (existingRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request is already ${existingRequest.status} and cannot be modified`
      });
    }

    // Check if reviewer exists
    const { data: reviewer, error: reviewerError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('id', reviewed_by)
      .single();

    if (reviewerError || !reviewer) {
      console.log('❌ Reviewer not found:', reviewerError);
      return res.status(404).json({
        success: false,
        message: 'Reviewer not found'
      });
    }

    // Update leave request status
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: status,
        reviewed_by: reviewed_by,
        reviewed_date: new Date().toISOString(),
        comments: comments || existingRequest.comments,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        user:employees!user_id (
          name,
          employee_id
        ),
        reviewer:employees!reviewed_by (
          name,
          employee_id
        )
      `)
      .single();

    if (error) {
      console.error('❌ Supabase update error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update leave request',
        error: error.message
      });
    }

    console.log(`✅ Leave request ${status} successfully:`, id);

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: {
        ...data,
        total_days: calculateTotalDays(data.from_date, data.to_date),
        employee_name: data.user?.name || 'Unknown',
        reviewer_name: data.reviewer?.name || 'Unknown'
      }
    });

  } catch (error) {
    console.error('❌ Error updating leave request status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating leave request status'
    });
  }
});

// Get user's leave requests
router.get('/leave-requests/user/:user_id', validateUUID('user_id'), async (req, res) => {
  try {
    console.log('👤 Fetching user leave requests...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;
    
    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        reviewer:employees!reviewed_by (
          name,
          employee_id
        )
      `)
      .eq('user_id', user_id)
      .order('applied_date', { ascending: false });
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('status', status);
    }
    
    query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching user leave requests:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching leave requests'
      });
    }

    // Calculate total days for each request
    const leaveRequests = data.map(request => ({
      ...request,
      total_days: calculateTotalDays(request.from_date, request.to_date),
      reviewer_name: request.reviewer?.name || null
    }));

    console.log(`✅ Found ${leaveRequests.length} leave requests for user:`, user_id);

    res.json({
      success: true,
      message: `Found ${leaveRequests.length} leave request(s)`,
      data: leaveRequests,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: leaveRequests.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leave requests'
    });
  }
});

module.exports = router;
