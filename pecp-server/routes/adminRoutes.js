const express = require("express");
const supabase = require("../config/supabaseClient");
const router = express.Router();

// ✅ Add Employee (No Auth Required for Testing)
router.post("/employees", async (req, res) => {
  try {
    const { employeeId, name, phone, password } = req.body;
    
    // Basic validation
    if (!employeeId || !name || !phone || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    const { data, error } = await supabase
      .from("users")
      .insert([
        { employee_id: employeeId, name, phone, password, role: "employee" },
      ])
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, message: "Employee added successfully", data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ View All Employees
router.get("/employees", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, employee_id, name, phone, role")
      .eq("role", "employee")
      .order("name", { ascending: true });
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ View All Attendance
router.get("/attendance", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*, users(name, employee_id)")
      .order("date", { ascending: false });
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ View All Leave Requests (NEWLY ADDED!)
router.get("/leave", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*, users(name, employee_id)")
      .order("created_at", { ascending: false });
      
    if (error) throw error;
    
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Approve/Reject Leave (NEWLY ADDED!)
router.put("/leave/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }
    
    const { data, error } = await supabase
      .from("leave_requests")
      .update({ status })
      .eq("id", id)
      .select();
      
    if (error) throw error;
    
    res.json({ success: true, message: `Leave request ${status}`, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Dashboard (Enhanced with leave statistics)
router.get("/dashboard", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    
    // Count present employees today
    const { count: presentCount } = await supabase
      .from("attendance")
      .select("*", { count: "exact" })
      .eq("date", today)
      .eq("type", "check-in");
      
    // Count approved leaves for today
    const { count: leaveCount } = await supabase
      .from("leave_requests")
      .select("*", { count: "exact" })
      .eq("status", "approved")
      .lte("from_date", today)
      .gte("to_date", today);
      
    // Total employees
    const { count: totalEmployees } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .eq("role", "employee");
      
    res.json({
      success: true,
      data: {
        totalEmployees: totalEmployees || 0,
        present: presentCount || 0,
        onLeave: leaveCount || 0,
        absent: (totalEmployees || 0) - ((presentCount || 0) + (leaveCount || 0)),
        date: today
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
