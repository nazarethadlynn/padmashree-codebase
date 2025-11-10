// pecp-server/routes/employeeLeaveRoutes.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

// ========================================
// EMPLOYEE ROUTES
// ========================================

// 1️⃣ EMPLOYEE: Create Leave Request
router.post("/employee/leave-request", async (req, res) => {
  try {
    console.log("📝 POST /api/employee/leave-request");
    const { employee_id, leave_type, from_date, to_date, reason } = req.body;

    if (!employee_id || !leave_type || !from_date || !to_date) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("id", parseInt(employee_id))
      .single();

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: `Employee ${employee_id} not found`
      });
    }

    const validLeaveTypes = ["sick", "casual", "annual", "unpaid", "maternity", "paternity"];
    if (!validLeaveTypes.includes(leave_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid leave_type`
      });
    }

    const fromDateObj = new Date(from_date);
    const toDateObj = new Date(to_date);

    if (toDateObj < fromDateObj) {
      return res.status(400).json({
        success: false,
        error: "To date cannot be before from date"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fromDateObj < today) {
      return res.status(400).json({
        success: false,
        error: "Cannot request leave for past dates"
      });
    }

    const totalDays = Math.floor((toDateObj - fromDateObj) / (1000 * 60 * 60 * 24)) + 1;

    const { data: conflictingLeaves } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("employee_id", parseInt(employee_id))
      .in("status", ["pending", "approved"])
      .or(`and(from_date.lte.${to_date},to_date.gte.${from_date})`);

    if (conflictingLeaves && conflictingLeaves.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Leave already exists for these dates"
      });
    }

    const year = fromDateObj.getFullYear();
    const { data: leaveBalance } = await supabase
      .from("leave_balance")
      .select("remaining_days")
      .eq("employee_id", parseInt(employee_id))
      .eq("year", year)
      .eq("leave_type", leave_type)
      .single();

    if (!leaveBalance) {
      await supabase.from("leave_balance").insert([{
        employee_id: parseInt(employee_id),
        year,
        leave_type,
        total_allowed: 15,
        used_days: 0,
        remaining_days: 15
      }]);

      if (totalDays > 15) {
        return res.status(400).json({
          success: false,
          error: `Max 15 days per year. Requested: ${totalDays}`
        });
      }
    } else {
      if (totalDays > leaveBalance.remaining_days) {
        return res.status(400).json({
          success: false,
          error: `Not enough balance. Requested: ${totalDays}, Remaining: ${leaveBalance.remaining_days}`
        });
      }
    }

    const { data: leaveRequest, error: insertError } = await supabase
      .from("leave_requests")
      .insert([{
        employee_id: parseInt(employee_id),
        leave_type,
        from_date,
        to_date,
        total_days: totalDays,
        reason: reason || null,
        status: "pending"
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      message: "Leave request created",
      data: leaveRequest
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 2️⃣ EMPLOYEE: View All Previous Leaves
router.get("/employee/leaves/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { data, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", parseInt(employee_id))
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 3️⃣ EMPLOYEE: View Single Leave (FIXED - NO relationship join)
router.get("/employee/leave/:leave_id", async (req, res) => {
  try {
    const { leave_id } = req.params;
    console.log(`🔍 GET /api/employee/leave/${leave_id}`);

    const { data: leave, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", parseInt(leave_id))
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: "Leave not found"
      });
    }

    // Fetch employee separately
    const { data: employee } = await supabase
      .from("employees")
      .select("id, employee_id, name, email, department")
      .eq("id", leave.employee_id)
      .single();

    res.json({
      success: true,
      data: {
        ...leave,
        employee: employee || {}
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 4️⃣ EMPLOYEE: Check Leave Balance
router.get("/employee/leave-balance/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const { data, error } = await supabase
      .from("leave_balance")
      .select("*")
      .eq("employee_id", parseInt(employee_id))
      .eq("year", parseInt(currentYear));

    if (error) throw error;

    res.json({
      success: true,
      year: parseInt(currentYear),
      data: data || []
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ========================================
// ADMIN ROUTES
// ========================================

 

// 6️⃣ ADMIN: View Single Leave by ID (FIXED - NO relationship join)
router.get("/admin/leave/:leave_id", async (req, res) => {
  try {
    const { leave_id } = req.params;
    console.log(`🔍 GET /api/admin/leave/${leave_id}`);

    const { data: leave, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", parseInt(leave_id))
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: "Leave not found"
      });
    }

    // Fetch employee separately
    const { data: employee } = await supabase
      .from("employees")
      .select("id, employee_id, name, email, department, position")
      .eq("id", leave.employee_id)
      .single();

    res.json({
      success: true,
      data: {
        ...leave,
        employee: employee || {}
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 7️⃣ ADMIN: View All Leaves of Single Employee (FIXED - NO relationship join)
router.get("/admin/employee/:employee_id/leaves", async (req, res) => {
  try {
    const { employee_id } = req.params;
    console.log(`📋 GET /api/admin/employee/${employee_id}/leaves`);

    const { data: leaves, error } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("employee_id", parseInt(employee_id))
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch employee details
    const { data: employee } = await supabase
      .from("employees")
      .select("id, employee_id, name, email, department")
      .eq("id", parseInt(employee_id))
      .single();

    const enrichedLeaves = leaves.map(leave => ({
      ...leave,
      employee: employee || {}
    }));

    console.log(`✅ Fetched ${enrichedLeaves.length} leaves`);
    res.json({
      success: true,
      count: enrichedLeaves.length,
      data: enrichedLeaves
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 8️⃣ ADMIN: Approve Leave Request
router.put("/admin/leave/:leave_id/approve", async (req, res) => {
  try {
    const { leave_id } = req.params;
    const { admin_comment } = req.body;

    const { data: leave, error } = await supabase
      .from("leave_requests")
      .update({
        status: "approved",
        admin_comment: admin_comment || null
      })
      .eq("id", parseInt(leave_id))
      .select("*")
      .single();

    if (error) throw error;
    if (!leave) {
      return res.status(404).json({
        success: false,
        error: "Leave not found"
      });
    }

    res.json({
      success: true,
      message: "Leave approved",
      data: leave
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// 9️⃣ ADMIN: Reject Leave Request
router.put("/admin/leave/:leave_id/reject", async (req, res) => {
  try {
    const { leave_id } = req.params;
    const { admin_comment } = req.body;

    const { data: leave, error } = await supabase
      .from("leave_requests")
      .update({
        status: "rejected",
        admin_comment: admin_comment || null
      })
      .eq("id", parseInt(leave_id))
      .select("*")
      .single();

    if (error) throw error;
    if (!leave) {
      return res.status(404).json({
        success: false,
        error: "Leave not found"
      });
    }

    res.json({
      success: true,
      message: "Leave rejected",
      data: leave
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
