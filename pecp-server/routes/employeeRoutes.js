// pecp-server/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

// ========================================
// EMPLOYEE CRUD ROUTES
// ========================================

// 1️⃣ CREATE Employee
// POST /api/employees
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /api/employees - Request body:", JSON.stringify(req.body, null, 2));

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

    const insertData = {
      employee_id: finalEmployeeId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone && phone.trim() ? phone.trim() : null,
      department: department && department.trim() ? department.trim() : null,
      position: position && position.trim() ? position.trim() : null,
      salary: salary && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null,
      hire_date: hire_date && hire_date.trim() ? hire_date.trim() : null,
      password_hash: password || "password123",
      password: password || "password123",
      role: role || "employee",
      status: status || "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("💾 Inserting employee:", JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("employees")
      .insert([insertData])
      .select("*");

    if (error) {
      console.error("❌ Database error:", error);
      
      // Handle unique constraint errors
      const msg = String(error.message || "");
      if (msg.includes("email")) {
        return res.status(409).json({ success: false, error: "Email already exists" });
      }
      if (msg.includes("phone")) {
        return res.status(409).json({ success: false, error: "Phone number already exists" });
      }
      if (msg.includes("employee_id")) {
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
    console.error("❌ POST /api/employees error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 2️⃣ READ All Employees
// GET /api/employees
router.get("/", async (req, res) => {
  try {
    console.log("📋 GET /api/employees - Fetching all employees");

    const { data, error } = await supabase
      .from("employees")
      .select("*")
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
    console.error("❌ GET /api/employees error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 3️⃣ READ Single Employee
// GET /api/employees/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/employees/${id}`);

    // Check if id is numeric or string (employee_id)
    const isNumeric = /^\d+$/.test(id);

    let query = supabase.from("employees").select("*");

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
    console.error(`❌ GET /api/employees/:id error:`, err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 4️⃣ UPDATE Employee
// PUT /api/employees/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 PUT /api/employees/${id}`);
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

    if (employee_id !== undefined) updateData.employee_id = employee_id;
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone && phone.trim() ? phone.trim() : null;
    if (department !== undefined) updateData.department = department && department.trim() ? department.trim() : null;
    if (position !== undefined) updateData.position = position && position.trim() ? position.trim() : null;
    if (salary !== undefined) updateData.salary = salary && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null;
    if (hire_date !== undefined) updateData.hire_date = hire_date && hire_date.trim() ? hire_date.trim() : null;
    if (password !== undefined) {
      updateData.password = password;
      updateData.password_hash = password;
    }
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    updateData.updated_at = new Date().toISOString();

    console.log("💾 Update data:", JSON.stringify(updateData, null, 2));

    const isNumeric = /^\d+$/.test(id);

    let query = supabase.from("employees").update(updateData).select("*");

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

    console.log("✅ Employee updated successfully");

    res.json({
      success: true,
      message: "Employee updated successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ PUT /api/employees/:id error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 5️⃣ DELETE Employee
// DELETE /api/employees/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/employees/${id}`);

    const isNumeric = /^\d+$/.test(id);

    let query = supabase.from("employees").delete().select("*");

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
    console.error("❌ DELETE /api/employees/:id error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

module.exports = router;
