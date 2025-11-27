// pecp-server/routes/admin/employeeRoute.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SALT_ROUNDS = 10;

// ========================================
// EMPLOYEE CRUD ROUTES
// ========================================

// 1️⃣ CREATE Employee
// POST /api/employee
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /api/employee - Request body:", JSON.stringify(req.body, null, 2));

    const {
      employee_id,
      name,
      email,
      phone,
      department,
      position,
      salary,
      hire_date,
      password,
      role,
      status
    } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    // Generate employee_id if not provided
    const finalEmployeeId = employee_id || `EMP${Date.now().toString().slice(-8)}`;

    // Hash password with bcrypt
    const passwordToHash = password && password.trim() ? password : "employee123";
    const hashedPassword = await bcrypt.hash(passwordToHash, SALT_ROUNDS);

    const insertData = {
      employee_id: finalEmployeeId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone && phone.trim() ? phone.trim() : null,
      department: department && department.trim() ? department.trim() : null,
      position: position && position.trim() ? position.trim() : null,
      salary: salary && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null,
      hire_date: hire_date && hire_date.trim() ? hire_date.trim() : null,
      password_hash: hashedPassword,
      role: role || "employee",
      status: status || "active"
    };

    console.log("💾 Inserting employee with hashed password");

    const { data, error } = await supabase
      .from("employees")
      .insert([insertData])
      .select("id, employee_id, name, email, phone, department, position, salary, hire_date, role, status, created_at, updated_at");

    if (error) {
      console.error("❌ Database error:", error);
      
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("email") || msg.includes("employees_email_key")) {
        return res.status(409).json({ success: false, error: "Email already exists" });
      }
      if (msg.toLowerCase().includes("phone") || msg.includes("employees_phone_key")) {
        return res.status(409).json({ success: false, error: "Phone number already exists" });
      }
      if (msg.toLowerCase().includes("employee_id") || msg.includes("employees_employee_id_key")) {
        return res.status(409).json({ success: false, error: "Employee ID already exists" });
      }

      return res.status(500).json({ success: false, error: `Database error: ${msg}` });
    }

    console.log("✅ Employee created successfully");

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ POST /api/employee error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 2️⃣ READ All Employees
// GET /api/employee
router.get("/", async (req, res) => {
  try {
    console.log("📋 GET /api/employee - Fetching all employees");

    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_id, name, email, phone, department, position, salary, hire_date, role, status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} employees`);

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (err) {
    console.error("❌ GET /api/employee error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 3️⃣ READ Single Employee
// GET /api/employee/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/employee/${id}`);

    // Check if id is numeric (database id) or string (employee_id)
    const isNumeric = /^\d+$/.test(id);

    let query = supabase
      .from("employees")
      .select("id, employee_id, name, email, phone, department, position, salary, hire_date, role, status, created_at, updated_at");

    if (isNumeric) {
      query = query.eq("id", parseInt(id));
    } else {
      query = query.eq("employee_id", id);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("❌ Employee not found:", error);
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    console.log("✅ Employee found");

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error(`❌ GET /api/employee/:id error:`, err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 4️⃣ UPDATE Employee
// PUT /api/employee/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 PUT /api/employee/${id}`);
    console.log("Update data:", JSON.stringify(req.body, null, 2));

    const {
      employee_id,
      name,
      email,
      phone,
      department,
      position,
      salary,
      hire_date,
      password,
      role,
      status
    } = req.body;

    // Build update object
    const updateData = {};

    if (employee_id !== undefined && employee_id.trim()) updateData.employee_id = employee_id.trim();
    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (email !== undefined && email.trim()) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone && phone.trim() ? phone.trim() : null;
    if (department !== undefined) updateData.department = department && department.trim() ? department.trim() : null;
    if (position !== undefined) updateData.position = position && position.trim() ? position.trim() : null;
    if (salary !== undefined) updateData.salary = salary && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null;
    if (hire_date !== undefined) updateData.hire_date = hire_date && hire_date.trim() ? hire_date.trim() : null;
    if (password !== undefined && password.trim()) {
      updateData.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    }
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    console.log("💾 Updating employee");

    const isNumeric = /^\d+$/.test(id);

    let query = supabase
      .from("employees")
      .update(updateData)
      .select("id, employee_id, name, email, phone, department, position, salary, hire_date, role, status, created_at, updated_at");

    if (isNumeric) {
      query = query.eq("id", parseInt(id));
    } else {
      query = query.eq("employee_id", id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Database error:", error);
      
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("email") || msg.includes("employees_email_key")) {
        return res.status(409).json({ success: false, error: "Email already exists" });
      }
      if (msg.toLowerCase().includes("phone") || msg.includes("employees_phone_key")) {
        return res.status(409).json({ success: false, error: "Phone number already exists" });
      }
      if (msg.toLowerCase().includes("employee_id") || msg.includes("employees_employee_id_key")) {
        return res.status(409).json({ success: false, error: "Employee ID already exists" });
      }
      
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    console.log("✅ Employee updated successfully");

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ PUT /api/employee/:id error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 5️⃣ DELETE Employee
// DELETE /api/employee/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/employee/${id}`);

    const isNumeric = /^\d+$/.test(id);

    let query = supabase
      .from("employees")
      .delete()
      .select("id, employee_id, name, email, phone, department, position, role, status");

    if (isNumeric) {
      query = query.eq("id", parseInt(id));
    } else {
      query = query.eq("employee_id", id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    console.log("✅ Employee deleted successfully");

    res.json({
      success: true,
      message: "Employee deleted successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ DELETE /api/employee/:id error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

module.exports = router;
