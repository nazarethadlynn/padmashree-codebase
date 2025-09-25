const supabase = require("../config/supabaseClient");

async function attachUser(req, res, next) {
  try {
    const userId = req.headers["x-user-id"]; // custom header
    if (userId) {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && user) {
        req.user = user;
      }
    }
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
  }
  next();
}

module.exports = attachUser;
