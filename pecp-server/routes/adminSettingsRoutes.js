const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/supabaseClient');
const bcrypt = require('bcrypt');

const router = express.Router();

// Helper function to get IST time
const getISTTime = () => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (330 * 60 * 1000));
  return istTime.toISOString();
};

// ✅ 1. Get all system settings
router.get('/settings', async (req, res) => {
  try {
    console.log('📊 Fetching system settings...');
    
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('setting_key', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching system settings',
        error: error.message
      });
    }
    
    // Group settings by category
    const groupedSettings = data.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {});
    
    console.log(`✅ Found ${data.length} settings in ${Object.keys(groupedSettings).length} categories`);
    
    res.json({
      success: true,
      message: 'Settings fetched successfully',
      data: groupedSettings,
      total: data.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ✅ 2. Update system settings
router.put('/settings', [
  body('settings').isArray().withMessage('Settings must be an array'),
  body('settings.*.setting_key').notEmpty().withMessage('Setting key is required'),
  body('settings.*.setting_value').exists().withMessage('Setting value is required')
], async (req, res) => {
  try {
    console.log('🔧 Updating system settings...');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { settings } = req.body;
    const istTime = getISTTime();
    
    // Update each setting
    const updatePromises = settings.map(async (setting) => {
      const { data, error } = await supabase
        .from('system_settings')
        .update({
          setting_value: setting.setting_value,
          updated_at: istTime
        })
        .eq('setting_key', setting.setting_key)
        .eq('is_editable', true) // Only update editable settings
        .select('*')
        .single();
      
      if (error) {
        console.error(`❌ Error updating ${setting.setting_key}:`, error);
        throw error;
      }
      
      return data;
    });
    
    const updatedSettings = await Promise.all(updatePromises);
    
    console.log(`✅ Updated ${updatedSettings.length} settings`);
    
    res.json({
      success: true,
      message: `${updatedSettings.length} settings updated successfully`,
      data: updatedSettings
    });
    
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
});

// ✅ 3. Reset all employee passwords
router.post('/security/reset-passwords', async (req, res) => {
  try {
    console.log('🔐 Resetting all employee passwords...');
    
    const defaultPassword = 'Welcome123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const istTime = getISTTime();
    
    const { data, error } = await supabase
      .from('employees')
      .update({
        password: hashedPassword,
        password_reset_required: true,
        updated_at: istTime
      })
      .neq('email', 'admin@pecp.com') // Don't reset admin password
      .select('id, name, email');
    
    if (error) {
      console.error('❌ Error resetting passwords:', error);
      return res.status(500).json({
        success: false,
        message: 'Error resetting passwords',
        error: error.message
      });
    }
    
    console.log(`✅ Reset passwords for ${data.length} employees`);
    
    res.json({
      success: true,
      message: `Passwords reset for ${data.length} employees`,
      data: data
    });
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ✅ 4. Export system logs
router.get('/logs/export', async (req, res) => {
  try {
    console.log('📥 Exporting system logs...');
    
    const { start_date, end_date, limit = 1000 } = req.query;
    
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        employees!user_id (name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching logs:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching logs',
        error: error.message
      });
    }
    
    console.log(`✅ Exported ${data.length} log entries`);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="system_logs_${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json({
      success: true,
      message: `Exported ${data.length} log entries`,
      data: data,
      exported_at: getISTTime()
    });
    
  } catch (error) {
    console.error('❌ Error exporting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ✅ 5. Database backup (metadata only)
router.post('/database/backup', async (req, res) => {
  try {
    console.log('💾 Creating database backup...');
    
    // Get counts from all major tables
    const tableQueries = [
      supabase.from('employees').select('id', { count: 'exact', head: true }),
      supabase.from('site_assignments').select('id', { count: 'exact', head: true }),
      supabase.from('employee_site_assignments').select('id', { count: 'exact', head: true }),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }),
      supabase.from('system_settings').select('id', { count: 'exact', head: true })
    ];
    
    const results = await Promise.all(tableQueries);
    
    const backupInfo = {
      backup_date: getISTTime(),
      table_counts: {
        employees: results[0].count || 0,
        site_assignments: results[1].count || 0,
        employee_site_assignments: results[2].count || 0,
        leave_requests: results[3].count || 0,
        system_settings: results[4].count || 0
      },
      total_records: results.reduce((sum, result) => sum + (result.count || 0), 0)
    };
    
    console.log('✅ Backup metadata created:', backupInfo);
    
    res.json({
      success: true,
      message: 'Database backup information generated',
      data: backupInfo
    });
    
  } catch (error) {
    console.error('❌ Error creating backup:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating backup'
    });
  }
});

// ✅ 6. Get email templates
router.get('/email-templates', async (req, res) => {
  try {
    console.log('📧 Fetching email templates...');
    
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('template_name', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching email templates:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching email templates',
        error: error.message
      });
    }
    
    console.log(`✅ Found ${data.length} email templates`);
    
    res.json({
      success: true,
      message: 'Email templates fetched successfully',
      data: data
    });
    
  } catch (error) {
    console.error('❌ Error fetching email templates:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
