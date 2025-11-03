const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseClient');
//const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Get all site assignments (for list/grid)
router.get('/site-assignments', async (req, res) => {
  const { data, error } = await supabase
    .from('site_assignments')
    .select('*');

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// Get assignments for a specific date
router.get('/site-assignments/date/:date', async (req, res) => {
  const { date } = req.params;
  const { data, error } = await supabase
    .from('site_assignments')
    .select('*')
    .eq('assignment_date', date);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// Get available employees
router.get('/site-assignments/employees/available', async (req, res) => {
  // Queries employees table for all employees
  // Adjust filter logic in frontend as needed for availability
  const { data, error } = await supabase
    .from('employees')
    .select('*');
  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// Create site assignment (Add Site & Assign Employees)
router.post('/site-assignments/create-and-assign', async (req, res) => {
  const {
    site_name, site_description, site_location,
    coordinates_lat, coordinates_lng,
    attendance_radius, project_type, is_active,
    employeeids, assignment_date, assignment_status, assignment_notes
  } = req.body;

  // employeeids is array of employee_id integers
  try {
    const assignmentsToInsert = employeeids.map(empId => ({
      site_name,
      site_description,
      site_location,
      coordinates_lat,
      coordinates_lng,
      attendance_radius,
      project_type,
      is_active: is_active ?? true,
      employee_id: parseInt(empId),
      assignment_date,
      assignment_status: assignment_status || 'assigned',
      assignment_notes,
    }));

    const { data, error } = await supabase
      .from('site_assignments')
      .insert(assignmentsToInsert)
      .select();

    if (error) return res.status(400).json({ success: false, message: error.message });
    res.json({ success: true, data: { assignments: data } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign employees to an existing site
router.post('/site-assignments/:siteId/assign-employees', async (req, res) => {
  const {
    employeeids, assignment_date, assignment_status, assignment_notes
  } = req.body;

  // Fetch site details from one of existing rows by siteId
  const { siteId } = req.params;
  const { data: site } = await supabase
    .from('site_assignments')
    .select('*')
    .eq('id', siteId)
    .single();

  if (!site) return res.status(404).json({ success: false, message: 'Site not found' });

  const assignmentsToInsert = employeeids.map(empId => ({
    site_name: site.site_name,
    site_description: site.site_description,
    site_location: site.site_location,
    coordinates_lat: site.coordinates_lat,
    coordinates_lng: site.coordinates_lng,
    attendance_radius: site.attendance_radius,
    project_type: site.project_type,
    is_active: site.is_active,
    employee_id: parseInt(empId),
    assignment_date,
    assignment_status: assignment_status || 'assigned',
    assignment_notes,
  }));

  const { data, error } = await supabase
    .from('site_assignments')
    .insert(assignmentsToInsert)
    .select();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data: { assignments: data } });
});

// Update assignment (Edit Assignment)
router.put('/site-assignments/assignment/:id', async (req, res) => {
  const { id } = req.params;
  const { assignment_status, assignment_date, assignment_notes } = req.body;

  const { data, error } = await supabase
    .from('site_assignments')
    .update({
      assignment_status,
      assignment_date,
      assignment_notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// Delete assignment (Remove Assignment)
router.delete('/site-assignments/assignment/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('site_assignments')
    .delete()
    .eq('id', id);

  if (error) return res.status(400).json({ success: false, message: error.message });
  res.json({ success: true });
});

// Dashboard statistics endpoint
router.get('/site-assignments/dashboardstats', async (req, res) => {
  const [{ data: sites }, { data: assignments }] = await Promise.all([
    supabase.from('site_assignments').select('site_name').neq('site_name', '').count(),
    supabase.from('site_assignments').select('id').count()
  ]);
  res.json({
    success: true,
    data: {
      totalsites: sites ? sites.length : 0,
      assignedtoday: assignments ? assignments.length : 0,
      notificationssent: 0, // Implement notifications logic as needed
      availableemployees: 0 // Implement available employee logic as needed
    }
  });
});

module.exports = router;
