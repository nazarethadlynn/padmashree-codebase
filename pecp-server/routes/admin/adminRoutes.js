// pecp-server/routes/admin/adminRoutes.js
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
// ADMIN CRUD ROUTES
// ========================================

// 1️⃣ CREATE Admin
// POST /api/admin
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

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const insertData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password_hash: hashedPassword
    };

    console.log("💾 Inserting admin with hashed password");

    const { data, error } = await supabase
      .from("admin")
      .insert([insertData])
      .select("id, name, email");

    if (error) {
      console.error("❌ Database error:", error);
      
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("email") || msg.includes("admin_email_key")) {
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
// GET /api/admin
router.get("/", async (req, res) => {
  try {
    console.log("📋 GET /api/admin - Fetching all admins");

    const { data, error } = await supabase
      .from("admin")
      .select("id, name, email")
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
// GET /api/admin/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 GET /api/admin/${id}`);

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: "Invalid admin ID" });
    }

    const { data, error } = await supabase
      .from("admin")
      .select("id, name, email")
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
// PUT /api/admin/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 PUT /api/admin/${id}`);
    console.log("Update data:", JSON.stringify(req.body, null, 2));

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: "Invalid admin ID" });
    }

    const { name, email, password } = req.body;

    // Build update object
    const updateData = {};

    if (name !== undefined && name.trim()) updateData.name = name.trim();
    if (email !== undefined && email.trim()) updateData.email = email.trim().toLowerCase();
    if (password !== undefined && password.trim()) {
      updateData.password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    console.log("💾 Updating admin");

    const { data, error } = await supabase
      .from("admin")
      .update(updateData)
      .eq("id", parseInt(id))
      .select("id, name, email");

    if (error) {
      console.error("❌ Database error:", error);
      
      const msg = String(error.message || "");
      if (msg.toLowerCase().includes("email") || msg.includes("admin_email_key")) {
        return res.status(409).json({ success: false, error: "Email already exists" });
      }
      
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

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ success: false, error: "Invalid admin ID" });
    }

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
