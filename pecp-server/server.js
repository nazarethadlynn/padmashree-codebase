// pecp-server/server.js
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


// Root route
app.get('/', (req, res) => {
  res.json({
    message: "🚀 PECP Server API is running!",
    status: "active",
    endpoints: {
      "Admin CRUD": [
        "POST /api/admin - Create admin",
        "GET /api/admin - Get all admins",
        "GET /api/admin/:id - Get single admin",
        "PUT /api/admin/:id - Update admin",
        "DELETE /api/admin/:id - Delete admin"
      ],
      "Employee CRUD": [
        "POST /api/employees - Create employee",
        "GET /api/employees - Get all employees",
        "GET /api/employees/:id - Get single employee",
        "PUT /api/employees/:id - Update employee",
        "DELETE /api/employees/:id - Delete employee"
      ],
      "Leave Requests": [
        "POST /api/employee/leave-request - Create leave request",
        "GET /api/employee/leaves/:employee_id - View my leaves",
        "GET /api/employee/leave/:leave_id - View single leave",
        "GET /api/employee/leave-balance/:employee_id - Check balance",
        "GET /api/admin/leaves - View all leaves",
        "GET /api/admin/leave/:leave_id - View single leave",
        "GET /api/admin/employee/:employee_id/leaves - View employee leaves",
        "PUT /api/admin/leave/:leave_id/approve - Approve leave",
        "PUT /api/admin/leave/:leave_id/reject - Reject leave"
      ],
      "Attendance Routes": [
        "POST /api/attendance - Mark check-in/check-out (office/site)",
        "GET /api/attendance - Get all attendance records (admin)",
        "GET /api/attendance/admin/summary - Get attendance summary",
        "GET /api/attendance/employee/:employee_id - Get employee attendance",
        "GET /api/attendance/date/:date - Get attendance by date (YYYY-MM-DD)",
        "DELETE /api/attendance/:id - Delete attendance record (admin)"
      ]
    },
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


// ========================================
// ROUTE LOADING - ORDER MATTERS!
// ========================================

// ✅ LOAD ADMIN ROUTES ONLY (TESTING)
try {
  console.log('🔍 Attempting to load admin routes...');
  const adminRoutes = require('./routes/admin/adminRoutes');
  console.log('✅ adminRoutes file loaded successfully');
  
  app.use('/api/admin', adminRoutes);
  console.log('✅ Admin routes mounted at /api/admin');
} catch (error) {
  console.error('❌ Admin routes error:', error.message);
  console.error('Stack:', error.stack);
}

// ✅ LOAD EMPLOYEE ROUTES
try {
  console.log('🔍 Attempting to load employee routes...');
  const employeeRoute = require('./routes/admin/employeeRoute');
  console.log('✅ employeeRoute file loaded successfully');
  
  app.use('/api/employee', employeeRoute);
  console.log('✅ Employee routes mounted at /api/employee');
} catch (error) {
  console.error('❌ Employee routes error:', error.message);
  console.error('Stack:', error.stack);
}

// ⚠️ TEMPORARILY COMMENTED OUT - OTHER ROUTES
/*
try {
  const adminSettings = require('./routes/admin/adminSettings');
  const employeeLeaveRoute = require('./routes/admin/employeeLeaveRoute');
  const employeeSiteManagement = require('./routes/admin/employeeSiteManagement');
  
  app.use('/api/adminSetting', adminSettings);
  app.use('/api/employeeLeave', employeeLeaveRoute);
  app.use('/api/employeeSite', employeeSiteManagement);
  
  console.log('✅ All admin routes loaded successfully');
} catch (error) {
  console.log('⚠️ Admin routes error:', error.message);
}
*/

// ⚠️ TEMPORARILY COMMENTED OUT - ATTENDANCE ROUTES
/*
try {
  const attendanceRoutes = require('./routes/attendanceRoutes');
  app.use('/api', attendanceRoutes);
  console.log('✅ Attendance routes loaded successfully');
} catch (error) {
  console.log('⚠️ Attendance routes error:', error.message);
}
*/


// Handle unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: {
      "Admin CRUD": [
        "POST /api/admin",
        "GET /api/admin",
        "GET /api/admin/:id",
        "PUT /api/admin/:id",
        "DELETE /api/admin/:id"
      ],
      "Employee CRUD": [
        "POST /api/employees",
        "GET /api/employees",
        "GET /api/employees/:id",
        "PUT /api/employees/:id",
        "DELETE /api/employees/:id"
      ],
      "Leave Requests": [
        "POST /api/employee/leave-request",
        "GET /api/employee/leaves/:employee_id",
        "GET /api/employee/leave/:leave_id",
        "GET /api/employee/leave-balance/:employee_id",
        "GET /api/admin/leaves",
        "GET /api/admin/leave/:leave_id",
        "GET /api/admin/employee/:employee_id/leaves",
        "PUT /api/admin/leave/:leave_id/approve",
        "PUT /api/admin/leave/:leave_id/reject"
      ],
      "Attendance": [
        "POST /api/attendance",
        "GET /api/attendance",
        "GET /api/attendance/admin/summary",
        "GET /api/attendance/employee/:employee_id",
        "GET /api/attendance/date/:date",
        "DELETE /api/attendance/:id"
      ]
    }
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
  
  console.log(`📡 API ENDPOINTS:\n`);
  
  console.log(`👨‍💼 ADMIN ROUTES (ACTIVE):`);
  console.log(`   POST   http://localhost:${PORT}/api/admin`);
  console.log(`   GET    http://localhost:${PORT}/api/admin`);
  console.log(`   GET    http://localhost:${PORT}/api/admin/:id`);
  console.log(`   PUT    http://localhost:${PORT}/api/admin/:id`);
  console.log(`   DELETE http://localhost:${PORT}/api/admin/:id`);
  

  console.log(`\n👤 EMPLOYEE ROUTES:`);
  console.log(`   POST   http://localhost:${PORT}/api/employees`);
  console.log(`   GET    http://localhost:${PORT}/api/employees`);
  console.log(`   GET    http://localhost:${PORT}/api/employees/:id`);
  console.log(`   PUT    http://localhost:${PORT}/api/employees/:id`);
  console.log(`   DELETE http://localhost:${PORT}/api/employees/:id`);
  
  /*
  console.log(`\n📋 EMPLOYEE LEAVE ROUTES:`);
  console.log(`   POST   http://localhost:${PORT}/api/employee/leave-request`);
  console.log(`   GET    http://localhost:${PORT}/api/employee/leaves/:employee_id`);
  console.log(`   GET    http://localhost:${PORT}/api/employee/leave/:leave_id`);
  console.log(`   GET    http://localhost:${PORT}/api/employee/leave-balance/:employee_id`);
  
  console.log(`\n👨‍💼 ADMIN LEAVE ROUTES:`);
  console.log(`   GET    http://localhost:${PORT}/api/admin/leaves`);
  console.log(`   GET    http://localhost:${PORT}/api/admin/leave/:leave_id`);
  console.log(`   GET    http://localhost:${PORT}/api/admin/employee/:employee_id/leaves`);
  console.log(`   PUT    http://localhost:${PORT}/api/admin/leave/:leave_id/approve`);
  console.log(`   PUT    http://localhost:${PORT}/api/admin/leave/:leave_id/reject`);

  console.log(`\n📍 ATTENDANCE ROUTES:`);
  console.log(`   POST   http://localhost:${PORT}/api/attendance`);
  console.log(`   GET    http://localhost:${PORT}/api/attendance`);
  console.log(`   GET    http://localhost:${PORT}/api/attendance/admin/summary`);
  console.log(`   GET    http://localhost:${PORT}/api/attendance/employee/:employee_id`);
  console.log(`   GET    http://localhost:${PORT}/api/attendance/date/:date`);
  console.log(`   DELETE http://localhost:${PORT}/api/attendance/:id`);
  */
  
  console.log(`\n✨ System ready for testing! (ADMIN ROUTES ONLY)`);
  console.log(`${'='.repeat(60)}\n`);
});


module.exports = app;
