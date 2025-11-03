// pecp-server/routes/employeeRoutes.js
const express = require("express");
const router = express.Router();

// Expecting ../config/supabaseClient.js to export: module.exports = { supabase }
const supabase = require("../config/supabaseClient");

// -----------------------------
// Employee CRUD routes
// -----------------------------

// GET All Employees
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Database error (GET /employees):", error);
      throw error;
    }

    console.log(`✅ Loaded ${Array.isArray(data) ? data.length : 0} employees from database`);

    res.json({
      success: true,
      count: Array.isArray(data) ? data.length : 0,
      data: data || []
    });
  } catch (err) {
    console.error("❌ GET /employees error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// POST Create Employee - stores all fields
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /employees - Full request body:");
    console.log(JSON.stringify(req.body, null, 2));

    const {
      employee_id,
      name,
      email,
      phone,
      department,
      position,
      salary,
      hire_date,
      password ,
      role,
      status
    } = req.body;

    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Name is required and cannot be empty" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Email is required and cannot be empty" });
    }
    if (!department || !department.trim()) {
      return res.status(400).json({ success: false, error: "Department is required and cannot be empty" });
    }

    // Generate unique employee_id if not provided
    const finalEmployeeId = employee_id || `EMP${Date.now().toString().slice(-8)}`;

    const insertData = {
      employee_id: finalEmployeeId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone && phone.trim() ? phone.trim() : null,
      department: department.trim(),
      position: position && position.trim() ? position.trim() : null,
      salary: salary !== undefined && salary !== null && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null,
      hire_date: hire_date && hire_date.trim() ? hire_date.trim() : null,
      password_hash : password|| "password123",
      role: role || "employee",
      status: status || "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log("💾 Final insert data being sent to database:");
    console.log(JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("employees")
      .insert([insertData])
      .select(
        "id, employee_id, name, email, phone, department, position, salary, hire_date, role, status, created_at, updated_at"
      );

    if (error) {
      console.error("❌ Database insertion error:", error);

      // Attempt to parse common unique constraint messages
      const msg = String(error.message || "");
      if (msg.includes("email")) {
        return res.status(409).json({ success: false, error: "Email address already exists. Please use a different email." });
      }
      if (msg.includes("phone")) {
        return res.status(409).json({ success: false, error: "Phone number already exists. Please use a different phone or leave it empty." });
      }
      if (msg.includes("employee_id")) {
        return res.status(409).json({ success: false, error: "Employee ID already exists. Please try again." });
      }

      return res.status(500).json({ success: false, error: `Database error: ${msg}` });
    }

    console.log("✅ Employee created successfully in database:");
    console.log(JSON.stringify(data[0], null, 2));

    res.status(201).json({
      success: true,
      message: "Employee created successfully with all data",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ POST /employees error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// NOTE: Register leave routes BEFORE routes that use `/:id` to avoid conflicts

// -----------------------------
// Leave Request Routes (mounted here under /api/employees/leave ...)
// -----------------------------

/**
 * Helper: create leave request
 * POST /api/employees/leave
 * body: { user_id, fromDate, toDate, reason }
 */
async function createLeaveRequest(req, res) {
  try {
    const { user_id, fromDate, toDate, reason } = req.body;

    console.log("Leave request data received:", { user_id, fromDate, toDate, reason });

    // Validation
    if (!user_id || !fromDate || !toDate || !reason) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: user_id, fromDate, toDate, reason"
      });
    }

    // Validate UUID format (basic)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user_id format. Must be a valid UUID"
      });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ success: false, error: "Invalid date format for fromDate or toDate" });
    }

    if (from > to) {
      return res.status(400).json({ success: false, error: "From date cannot be later than to date" });
    }

    // Check if user exists
    const { data: employee, error: employeeError } = await supabase.from("employees").select("id, name, employee_id").eq("id", user_id).single();

    if (employeeError || !employee) {
      console.log("Employee not found:", employeeError);
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    // Insert leave request
    const { data, error } = await supabase
      .from("leave_requests")
      .insert([
        {
          user_id,
          from_date: fromDate,
          to_date: toDate,
          reason,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        employees!user_id (
          id,
          name,
          employee_id
        )
      `)
      .single();

    if (error) {
      console.error("Supabase error (insert leave):", error);
      return res.status(500).json({ success: false, error: "Failed to create leave request", details: error.message || error });
    }

    return res.status(201).json({ success: true, message: "Leave request submitted successfully", data });
  } catch (error) {
    console.error("API error (createLeaveRequest):", error);
    return res.status(500).json({ success: false, error: "Internal server error", details: error.message || error });
  }
}

/**
 * Helper: get leave requests
 * GET /api/employees/leave?user_id=...&status=...
 */
async function getLeaveRequests(req, res) {
  try {
    const { user_id, status } = req.query;

    let query = supabase
      .from("leave_requests")
      .select(`
        *,
        employees!user_id (
          id,
          name,
          employee_id,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    if (user_id) query = query.eq("user_id", user_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error (getLeaveRequests):", error);
      return res.status(500).json({ success: false, error: "Failed to fetch leave requests", details: error.message || error });
    }

    return res.json({ success: true, data: data || [], count: Array.isArray(data) ? data.length : 0 });
  } catch (error) {
    console.error("API error (getLeaveRequests):", error);
    return res.status(500).json({ success: false, error: "Internal server error", details: error.message || error });
  }
}

/**
 * Helper: get leave request by leave id
 * GET /api/employees/leave/:id
 */
async function getLeaveRequestById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: "Missing leave request id" });

    const { data, error } = await supabase
      .from("leave_requests")
      .select(`
        *,
        employees!user_id (
          id,
          name,
          employee_id,
          phone
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error (getLeaveRequestById):", error);
      return res.status(404).json({ success: false, error: "Leave request not found", details: error.message || error });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("API error (getLeaveRequestById):", error);
    return res.status(500).json({ success: false, error: "Internal server error", details: error.message || error });
  }
}

/**
 * Helper: get leave requests by employee identifier
 * GET /api/employees/:employee_id/leave
 * Accepts either employee_id (EMPxxx) or internal UUID; resolves to user_id and returns leave requests
 */
async function getLeaveRequestsByEmployee(req, res) {
  try {
    const { employee_id } = req.params;
    if (!employee_id) return res.status(400).json({ success: false, error: "Missing employee identifier" });

    // Try to detect whether provided value is UUID or employee_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employee_id);

    let emp;
    if (isUUID) {
      const { data, error } = await supabase.from("employees").select("id, employee_id, name").eq("id", employee_id).single();
      if (error || !data) {
        console.log("Employee not found by UUID:", error);
        return res.status(404).json({ success: false, error: "Employee not found" });
      }
      emp = data;
    } else {
      const { data, error } = await supabase.from("employees").select("id, employee_id, name").eq("employee_id", employee_id).single();
      if (error || !data) {
        console.log("Employee not found by employee_id:", error);
        return res.status(404).json({ success: false, error: "Employee not found" });
      }
      emp = data;
    }

    // Fetch leave requests for this employee's internal id
    const { data: leaves, error: leavesError } = await supabase
      .from("leave_requests")
      .select(`
        *,
        employees!user_id ( id, name, employee_id, phone )
      `)
      .eq("user_id", emp.id)
      .order("created_at", { ascending: false });

    if (leavesError) {
      console.error("Supabase error (getLeaveRequestsByEmployee):", leavesError);
      return res.status(500).json({ success: false, error: "Failed to fetch leave requests", details: leavesError.message || leavesError });
    }

    return res.json({ success: true, employee: emp, count: Array.isArray(leaves) ? leaves.length : 0, data: leaves || [] });
  } catch (error) {
    console.error("API error (getLeaveRequestsByEmployee):", error);
    return res.status(500).json({ success: false, error: "Internal server error", details: error.message || error });
  }
}

/**
 * Helper: get leave statistics for a given user_id
 * GET /api/employees/leave/stats/:user_id
 * Returns counts per status and total leave days taken (approx)
 */
async function getLeaveStatistics(req, res) {
  try {
    const { user_id } = req.params;
    if (!user_id) return res.status(400).json({ success: false, error: "Missing user_id" });

    // Get leave requests for the user
    const { data: leaves, error } = await supabase
      .from("leave_requests")
      .select("id, from_date, to_date, status")
      .eq("user_id", user_id);

    if (error) {
      console.error("Supabase error (getLeaveStatistics):", error);
      return res.status(500).json({ success: false, error: "Failed to fetch leave requests", details: error.message || error });
    }

    const stats = { total: 0, pending: 0, approved: 0, rejected: 0, totalLeaveDays: 0 };

    if (Array.isArray(leaves)) {
      stats.total = leaves.length;
      for (const l of leaves) {
        if (l.status === "approved") stats.approved += 1;
        else if (l.status === "rejected") stats.rejected += 1;
        else stats.pending += 1;

        // compute days difference (inclusive)
        try {
          const from = new Date(l.from_date);
          const to = new Date(l.to_date);
          if (!isNaN(from.getTime()) && !isNaN(to.getTime()) && to >= from) {
            const days = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
            stats.totalLeaveDays += days;
          }
        } catch (e) {
          // ignore parse errors for individual rows
        }
      }
    }

    return res.json({ success: true, stats, count: stats.total });
  } catch (error) {
    console.error("API error (getLeaveStatistics):", error);
    return res.status(500).json({ success: false, error: "Internal server error", details: error.message || error });
  }
}

/**
 * Helper: update leave request status
 * PUT /api/employees/leave
 * body: { id, status, comments, reviewed_by }
 */
async function updateLeaveRequestStatus(req, res) {
  try {
    const { id, status, comments, reviewed_by } = req.body;

    if (!id || !status) {
      return res.status(400).json({ success: false, error: "Missing required fields: id, status" });
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status. Must be approved or rejected" });
    }

    const { data, error } = await supabase
      .from("leave_requests")
      .update({
        status,
        comments: comments || null,
        reviewed_by: reviewed_by || null,
        reviewed_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select(`
        *,
        employees!user_id (
          id,
          name,
          employee_id,
          phone
        )
      `)
      .single();

    if (error) {
      console.error("Supabase error (updateLeaveRequestStatus):", error);
      return res.status(500).json({ success: false, error: "Failed to update leave request", details: error.message || error });
    }

    return res.json({ success: true, message: `Leave request ${status} successfully`, data });
  } catch (error) {
    console.error("API error (updateLeaveRequestStatus):", error);
    return res.status(500).json({ success: false, error: "Internal server error", details: error.message || error });
  }
}

// Register leave routes BEFORE generic :id routes
router.post("/leave", createLeaveRequest);                   // POST /api/employees/leave
router.get("/leave", getLeaveRequests);                      // GET /api/employees/leave
router.get("/leave/:id", getLeaveRequestById);               // GET /api/employees/leave/:id
router.get("/:employee_id/leave", getLeaveRequestsByEmployee);// GET /api/employees/:employee_id/leave
router.get("/leave/stats/:user_id", getLeaveStatistics);     // GET /api/employees/leave/stats/:user_id
router.put("/leave", updateLeaveRequestStatus);              // PUT /api/employees/leave

// -----------------------------
// Continue Employee CRUD routes that use :id param
// -----------------------------

// GET Single Employee (by id or employee_id)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔍 GET /employees/:id - ID:", id);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from("employees").select("*");

    if (isUUID) query = query.eq("id", id);
    else query = query.eq("employee_id", id);

    const { data, error } = await query.single();

    if (error) {
      console.error("❌ Database get error (GET /employees/:id):", error);
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    console.log("✅ Employee fetched successfully:", data);

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ GET /employees/:id error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

// PUT Update Employee
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🔄 PUT /employees/:id - ID:", id);
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

    // Build update object with explicit field mapping
    const updateData = {};

    if (employee_id !== undefined) updateData.employee_id = employee_id;
    if (name !== undefined) updateData.name = name && name.trim() ? name.trim() : name;
    if (email !== undefined) updateData.email = email && email.trim() ? email.trim().toLowerCase() : null;
    if (phone !== undefined) updateData.phone = phone && phone.trim() ? phone.trim() : null;
    if (department !== undefined) updateData.department = department && department.trim() ? department.trim() : null;
    if (position !== undefined) updateData.position = position && position.trim() ? position.trim() : null;
    if (salary !== undefined)
      updateData.salary = salary !== null && !isNaN(parseFloat(salary)) ? parseFloat(salary) : null;
    if (hire_date !== undefined) updateData.hire_date = hire_date && hire_date.trim() ? hire_date.trim() : null;
    if (password !== undefined) updateData.password = password;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    updateData.updated_at = new Date().toISOString();

    console.log("💾 Update data being sent to database:", JSON.stringify(updateData, null, 2));

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from("employees").update(updateData).select("*");

    if (isUUID) query = query.eq("id", id);
    else query = query.eq("employee_id", id);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Database update error (PUT /employees/:id):", error);
      throw error;
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    console.log("✅ Employee updated successfully:", data[0]);

    res.json({ success: true, message: "Employee updated successfully", data: data[0] });
  } catch (err) {
    console.error("❌ PUT /employees/:id error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

// DELETE Employee
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("🗑️ DELETE /employees/:id - ID:", id);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from("employees").delete().select("*");

    if (isUUID) query = query.eq("id", id);
    else query = query.eq("employee_id", id);

    const { data, error } = await query;

    if (error) {
      console.error("❌ Database delete error (DELETE /employees/:id):", error);
      throw error;
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    console.log("✅ Employee deleted successfully:", data[0]);

    res.json({ success: true, message: "Employee deleted successfully", data: data[0] });
  } catch (err) {
    console.error("❌ DELETE /employees/:id error:", err);
    res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
});

module.exports = router;
	

