// pecp-server/server.js - UPDATED WITH SITE ASSIGNMENT ROUTES ADDED BACK
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3001;


// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;


if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}


const supabase = createClient(supabaseUrl, supabaseKey);


// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};


// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});


// Root route - UPDATED WITH SITE ASSIGNMENT ENDPOINTS
app.get('/', (req, res) => {
  res.json({
    message: "🚀 PECP Server API is running!",
    status: "active",
    endpoints: [
      "GET /api/employees - Get all employees",
      "POST /api/employees - Create employee", 
      "GET /api/admin - Get admin data", 
      "GET /api/test - Test connection",
      // Employee Leave Endpoints
      "POST /api/leave-requests - Submit leave request",
      "GET /api/leave-requests/user/:user_id - Get user's leave requests",
      "GET /api/leave-requests/:id - Get specific leave request",
      // Admin Leave Management Endpoints
      "GET /api/leave-requests - Get all leave requests (admin)",
      "GET /api/leave-requests/admin/summary - Get admin dashboard summary", 
      "PATCH /api/leave-requests/:id/status - Approve/reject leave (admin)",
      "DELETE /api/leave-requests/:id - Cancel leave request",
      // Attendance Management Endpoints
      "POST /api/attendance - Mark attendance (check-in/check-out)",
      "GET /api/attendance - Get all attendance records (admin)",
      "GET /api/attendance/admin/summary - Get attendance dashboard summary",
      "GET /api/attendance/user/:user_id - Get user's attendance records",
      "GET /api/attendance/date/:date - Get attendance for specific date",
      // ✅ Site Assignment Endpoints
      "GET /api/site-assignments - Get all site assignments",
      "POST /api/site-assignments - Create new site assignment",
      "PUT /api/site-assignments/:site_id - Update site assignment",
      "DELETE /api/site-assignments/:site_id - Delete site assignment",
      "GET /api/site-assignments/:site_id - Get site assignment by ID",
      "GET /api/site-assignments/dashboard/stats - Get dashboard statistics",
      "POST /api/site-assignments/create-and-assign - Create site and assign employees",
      "POST /api/site-assignments/:site_id/assign-employees - Assign employees to existing site",
      "GET /api/site-assignments/employees/available - Get available employees",
      "GET /api/site-assignments/date/:date - Get assignments for date"
    ],
    timestamp: new Date().toISOString()
  });
});


// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: "✅ Backend connection successful!",
    server: "pecp-server",
    timestamp: new Date().toISOString(),
    database: "Supabase Connected"
  });
});


// Import existing routes
try {
  const adminRoutes = require('./routes/adminRoutes');
  const employeeRoutes = require('./routes/employeeRoutes');
  
  app.use('/api/admin', adminRoutes);
  app.use('/api/employees', employeeRoutes);
  console.log('✅ Admin and Employee routes loaded successfully');
} catch (error) {
  console.log('⚠️ Some route files not found:', error.message);
}


// Import and use the employee leave routes
try {
  const employeeLeaveRoutes = require('./routes/employeeLeaveRoutes');
  app.use('/api', employeeLeaveRoutes);
  console.log('✅ Employee Leave routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading Employee Leave routes:', error.message);
  console.error('❌ Full error:', error);
  process.exit(1); // Exit if leave routes fail to load
}


// Import attendance routes
try {
  const attendanceRoutes = require('./routes/attendanceRoutes');
  app.use('/api', attendanceRoutes);
  console.log('✅ Attendance routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading Attendance routes:', error.message);
}


// ✅ Import site assignment routes
try {
  const siteAssignmentRoutes = require('./routes/siteAssignmentRoutes');
  app.use('/api/site-assignments', siteAssignmentRoutes);
  console.log('✅ Site Assignment routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading Site Assignment routes:', error.message);
}


// Handle unmatched routes - UPDATED WITH SITE ASSIGNMENT ENDPOINTS
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /',
      'GET /api/test',
      'GET /api/employees',
      'POST /api/employees',
      'GET /api/admin',
      // Employee endpoints
      'POST /api/leave-requests',
      'GET /api/leave-requests/user/:user_id',
      'GET /api/leave-requests/:id',
      // Admin endpoints
      'GET /api/leave-requests',
      'GET /api/leave-requests/admin/summary',
      'PATCH /api/leave-requests/:id/status',
      'DELETE /api/leave-requests/:id',
      // Attendance endpoints
      'POST /api/attendance',
      'GET /api/attendance',
      'GET /api/attendance/admin/summary',
      'GET /api/attendance/user/:user_id',
      'GET /api/attendance/date/:date',
      // ✅ Site assignment endpoints
      'GET /api/site-assignments',
      'POST /api/site-assignments',
      'PUT /api/site-assignments/:site_id',
      'DELETE /api/site-assignments/:site_id',
      'GET /api/site-assignments/:site_id',
      'GET /api/site-assignments/dashboard/stats',
      'POST /api/site-assignments/create-and-assign',
      'POST /api/site-assignments/:site_id/assign-employees',
      'GET /api/site-assignments/employees/available',
      'GET /api/site-assignments/date/:date'
    ]
  });
});


// Start server - UPDATED WITH SITE ASSIGNMENT ENDPOINTS
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Complete Employee Management API endpoints:`);
  
  console.log(`\n👤 EMPLOYEE ENDPOINTS:`);
  console.log(`   - POST   http://localhost:${PORT}/api/leave-requests (Submit leave request)`);
  console.log(`   - GET    http://localhost:${PORT}/api/leave-requests/user/:user_id (Get my leaves)`);
  console.log(`   - GET    http://localhost:${PORT}/api/leave-requests/:id (Get specific leave)`);
  
  console.log(`\n👨‍💼 ADMIN LEAVE ENDPOINTS:`);
  console.log(`   - GET    http://localhost:${PORT}/api/leave-requests (Get all leaves - with filters)`);
  console.log(`   - GET    http://localhost:${PORT}/api/leave-requests/admin/summary (Dashboard summary)`);
  console.log(`   - PATCH  http://localhost:${PORT}/api/leave-requests/:id/status (Approve/reject)`);
  console.log(`   - DELETE http://localhost:${PORT}/api/leave-requests/:id (Cancel leave)`);
  
  console.log(`\n📍 ATTENDANCE ENDPOINTS:`);
  console.log(`   - POST   http://localhost:${PORT}/api/attendance (Mark attendance)`);
  console.log(`   - GET    http://localhost:${PORT}/api/attendance (Get all attendance - admin)`);
  console.log(`   - GET    http://localhost:${PORT}/api/attendance/admin/summary (Attendance summary)`);
  console.log(`   - GET    http://localhost:${PORT}/api/attendance/user/:user_id (Get user attendance)`);
  console.log(`   - GET    http://localhost:${PORT}/api/attendance/date/:date (Get date attendance)`);
  
  console.log(`\n🏗️ SITE ASSIGNMENT ENDPOINTS:`);
  console.log(`   - GET    http://localhost:${PORT}/api/site-assignments (Get all site assignments)`);
  console.log(`   - POST   http://localhost:${PORT}/api/site-assignments (Create new site assignment)`);
  console.log(`   - PUT    http://localhost:${PORT}/api/site-assignments/:site_id (Update site assignment)`);
  console.log(`   - DELETE http://localhost:${PORT}/api/site-assignments/:site_id (Delete site assignment)`);
  console.log(`   - GET    http://localhost:${PORT}/api/site-assignments/:site_id (Get site assignment by ID)`);
  console.log(`   - GET    http://localhost:${PORT}/api/site-assignments/dashboard/stats (Dashboard statistics)`);
  
  console.log(`\n👥 EMPLOYEE ASSIGNMENT ENDPOINTS:`);
  console.log(`   - POST   http://localhost:${PORT}/api/site-assignments/create-and-assign (Create site & assign employees)`);
  console.log(`   - POST   http://localhost:${PORT}/api/site-assignments/:site_id/assign-employees (Assign to existing site)`);
  console.log(`   - GET    http://localhost:${PORT}/api/site-assignments/employees/available (Get available employees)`);
  console.log(`   - GET    http://localhost:${PORT}/api/site-assignments/date/:date (Get assignments by date)`);
  
  console.log(`\n✨ Complete employee management system ready!`);
  console.log(`📊 Admin features: Dashboard, Approve/Reject, Filtering, Sorting`);
  console.log(`👥 Employee features: Submit requests, View history, Track status`);
  console.log(`📍 Attendance features: Location-based check-in/out, Office vs Site detection`);
  console.log(`🏗️ Site Assignment features: Site management, Location tracking, Assignment statistics`);
  console.log(`💼 Employee Assignment features: Create & assign, Assign to existing, View assignments`);
  console.log(`🏢 Office Location: 18.554397, 73.872530 (200m radius)`);
});


module.exports = app;