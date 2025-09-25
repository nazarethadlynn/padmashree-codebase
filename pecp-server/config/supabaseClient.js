// config/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// ✅ Make sure your .env has:
// SUPABASE_URL=https://rrnlccfjqmzbaedzywpg.supabase.co
// SUPABASE_KEY=your-service-role-or-anon-key

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = supabase;


