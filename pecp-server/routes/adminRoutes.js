// pecp-server/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

// ========================================
// ADMIN CRUD ROUTES
// ========================================

// 1️⃣ CREATE Admin
// POST Create Admin
router.post("/", async (req, res) => {
  try {
    console.log("📝 POST /api/admin - Request body:", JSON.stringify(req.body, null, 2));

    const { name, email, password } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }
    if (!password || !password.trim()) {
      return res.status(400).json({ success: false, error: "Password is required" });
    }

    const insertData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: password || "admin123"
      // ✅ REMOVED created_at and updated_at - admin table doesn't have these columns
    };

    console.log("💾 Inserting admin:", JSON.stringify(insertData, null, 2));

    const { data, error } = await supabase
      .from("admin")
      .insert([insertData])
      .select("*");

    if (error) {
      console.error("❌ Database error:", error);
      
      const msg = String(error.message || "");
      if (msg.includes("email")) {
        return res.status(409).json({ success: false, error: "Email already exists" });
      }

      return res.status(500).json({ success: false, error: `Database error: ${msg}` });
    }

    console.log("✅ Admin created successfully");

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ POST /api/admin error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 2️⃣ READ All Admins
// GET All Admins
router.get("/", async (req, res) => {
  try {
    console.log("📋 GET /api/admin - Fetching all admins");

    const { data, error } = await supabase
      .from("admin")
      .select("id, name, email")  // ✅ REMOVED created_at, updated_at
      .order("id", { ascending: false });

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    console.log(`✅ Fetched ${data.length} admins`);

    res.json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (err) {
    console.error("❌ GET /api/admin error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 3️⃣ READ Single Admin
// GET Single Admin
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/admin/${id}`);

    const { data, error } = await supabase
      .from("admin")
      .select("id, name, email")  // ✅ REMOVED created_at, updated_at
      .eq("id", parseInt(id))
      .single();

    if (error) {
      console.error("❌ Admin not found:", error);
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    console.log("✅ Admin found");

    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    console.error(`❌ GET /api/admin/:id error:`, err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 4️⃣ UPDATE Admin
// PUT Update Admin
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 PUT /api/admin/${id}`);
    console.log("Update data:", JSON.stringify(req.body, null, 2));

    const { name, email, password } = req.body;

    // Build update object
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (password !== undefined) updateData.password_hash = password;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No fields to update" });
    }

    // ✅ REMOVED updated_at - admin table doesn't have this column

    console.log("💾 Update data:", JSON.stringify(updateData, null, 2));

    const { data, error } = await supabase
      .from("admin")
      .update(updateData)
      .eq("id", parseInt(id))
      .select("id, name, email");

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    console.log("✅ Admin updated successfully");

    res.json({
      success: true,
      message: "Admin updated successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ PUT /api/admin/:id error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

// 5️⃣ DELETE Admin
// DELETE /api/admin/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /api/admin/${id}`);

    const { data, error } = await supabase
      .from("admin")
      .delete()
      .eq("id", parseInt(id))
      .select("id, name, email");

    if (error) {
      console.error("❌ Database error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: "Admin not found" });
    }

    console.log("✅ Admin deleted successfully");

    res.json({
      success: true,
      message: "Admin deleted successfully",
      data: data[0]
    });
  } catch (err) {
    console.error("❌ DELETE /api/admin/:id error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error"
    });
  }
});

module.exports = router;
