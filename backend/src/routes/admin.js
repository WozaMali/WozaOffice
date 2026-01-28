const express = require('express');
const { getRow, getRows, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Ensure all routes require admin role
router.use(requireRole('admin'));

// Get dashboard overview (Office App)
router.get('/dashboard', async (req, res) => {
  try {
    // Get system overview
    const systemStats = await getRow(`
      SELECT 
        (SELECT COUNT(*) FROM profiles WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM profiles WHERE role = 'collector') as total_collectors,
        (SELECT COUNT(*) FROM pickups WHERE status = 'submitted') as pending_pickups,
        (SELECT COUNT(*) FROM pickups WHERE status = 'completed') as completed_pickups,
        (SELECT COALESCE(SUM(total_kg), 0) FROM pickups WHERE status = 'completed') as total_kg_collected,
        (SELECT COALESCE(SUM(total_value), 0) FROM pickups WHERE status = 'completed') as total_value_collected
    `);

    // Get recent pickups
    const recentPickups = await getRows(`
      SELECT 
        p.*,
        cu.full_name as customer_name,
        cu.email as customer_email,
        co.full_name as collector_name,
        a.line1, a.suburb, a.city
      FROM pickups p
      LEFT JOIN profiles cu ON cu.id = p.customer_id
      LEFT JOIN profiles co ON co.id = p.collector_id
      LEFT JOIN addresses a ON a.id = p.address_id
      ORDER BY p.created_at DESC
      LIMIT 10
    `);

    // Get recent transactions
    const recentTransactions = await getRows(`
      SELECT 
        t.*,
        p.full_name as customer_name,
        p.email as customer_email
      FROM transactions t
      LEFT JOIN profiles p ON p.id = t.customer_id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);

    // Get wallet overview
    const walletStats = await getRow(`
      SELECT 
        COUNT(*) as total_wallets,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(AVG(balance), 0) as average_balance,
        COUNT(CASE WHEN balance > 0 THEN 1 END) as active_wallets
      FROM wallets
    `);

    res.json({
      systemStats,
      recentPickups,
      recentTransactions,
      walletStats
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all customers with pagination
router.get('/customers', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['p.role = \'customer\''];
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(p.full_name ILIKE $${paramCount} OR p.email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (status === 'active') {
      whereConditions.push('p.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('p.is_active = false');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM profiles p
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get customers with pagination
    const customers = await getRows(`
      SELECT 
        p.id, p.email, p.full_name, p.phone, p.is_active, p.created_at,
        w.balance,
        COUNT(a.id) as address_count,
        COUNT(pk.id) as pickup_count,
        COALESCE(SUM(CASE WHEN pk.status = 'completed' THEN pk.total_kg ELSE 0 END), 0) as total_kg_collected
      FROM profiles p
      LEFT JOIN wallets w ON w.user_id = p.id
      LEFT JOIN addresses a ON a.profile_id = p.id
      LEFT JOIN pickups pk ON pk.customer_id = p.id
      ${whereClause}
      GROUP BY p.id, w.balance
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get all collectors with performance data
router.get('/collectors', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['p.role = \'collector\''];
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(p.full_name ILIKE $${paramCount} OR p.email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM profiles p
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get collectors with performance data
    const collectors = await getRows(`
      SELECT 
        p.id, p.email, p.full_name, p.phone, p.is_active, p.created_at,
        COUNT(pk.id) as total_pickups,
        COUNT(CASE WHEN pk.status = 'completed' THEN 1 END) as completed_pickups,
        COALESCE(SUM(CASE WHEN pk.status = 'completed' THEN pk.total_kg ELSE 0 END), 0) as total_kg_collected,
        COALESCE(SUM(CASE WHEN pk.status = 'completed' THEN pk.total_value ELSE 0 END), 0) as total_value_collected,
        COALESCE(AVG(CASE WHEN pk.status = 'completed' THEN pk.total_kg ELSE NULL END), 0) as average_kg_per_pickup
      FROM profiles p
      LEFT JOIN pickups pk ON pk.collector_id = p.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY total_kg_collected DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      collectors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({ error: 'Failed to fetch collectors' });
  }
});

// Get pickup analytics
router.get('/pickups/analytics', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    // Get pickup trends
    const pickupTrends = await getRows(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_pickups,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_pickups,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_kg ELSE 0 END), 0) as kg_collected,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_value ELSE 0 END), 0) as value_collected
      FROM pickups
      WHERE created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get material breakdown
    const materialBreakdown = await getRows(`
      SELECT 
        m.name as material_name,
        COUNT(pi.id) as pickup_count,
        COALESCE(SUM(pi.kilograms), 0) as total_kg,
        COALESCE(SUM(pi.kilograms * pi.rate_per_kg), 0) as total_value
      FROM materials m
      LEFT JOIN pickup_items pi ON pi.material_id = m.id
      LEFT JOIN pickups p ON p.id = pi.pickup_id AND p.status = 'completed'
      GROUP BY m.id, m.name
      ORDER BY total_kg DESC
    `);

    // Get collector performance ranking
    const collectorRanking = await getRows(`
      SELECT 
        co.full_name,
        COUNT(p.id) as total_pickups,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_pickups,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total_kg ELSE 0 END), 0) as total_kg_collected,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.total_value ELSE 0 END), 0) as total_value_collected
      FROM profiles co
      LEFT JOIN pickups p ON p.collector_id = co.id
      WHERE co.role = 'collector'
      GROUP BY co.id, co.full_name
      ORDER BY total_kg_collected DESC
      LIMIT 10
    `);

    res.json({
      pickupTrends,
      materialBreakdown,
      collectorRanking
    });

  } catch (error) {
    console.error('Get pickup analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch pickup analytics' });
  }
});

// Get financial overview
router.get('/financial/overview', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days

    // Get financial summary
    const financialSummary = await getRow(`
      SELECT 
        COALESCE(SUM(total_value), 0) as total_revenue,
        COALESCE(SUM(total_kg), 0) as total_materials,
        COUNT(*) as total_pickups,
        COALESCE(AVG(total_value), 0) as average_pickup_value
      FROM pickups
      WHERE status = 'completed' 
      AND created_at >= NOW() - INTERVAL '${period} days'
    `);

    // Get daily revenue
    const dailyRevenue = await getRows(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(total_value), 0) as revenue,
        COUNT(*) as pickup_count
      FROM pickups
      WHERE status = 'completed' 
      AND created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get wallet distribution
    const walletDistribution = await getRows(`
      SELECT 
        CASE 
          WHEN balance = 0 THEN 'Empty'
          WHEN balance <= 50 THEN 'Low (0-50)'
          WHEN balance <= 200 THEN 'Medium (51-200)'
          WHEN balance <= 500 THEN 'High (201-500)'
          ELSE 'Very High (500+)'
        END as balance_range,
        COUNT(*) as wallet_count,
        COALESCE(SUM(balance), 0) as total_balance
      FROM wallets
      GROUP BY balance_range
      ORDER BY 
        CASE balance_range
          WHEN 'Empty' THEN 1
          WHEN 'Low (0-50)' THEN 2
          WHEN 'Medium (51-200)' THEN 3
          WHEN 'High (201-500)' THEN 4
          ELSE 5
        END
    `);

    res.json({
      financialSummary,
      dailyRevenue,
      walletDistribution
    });

  } catch (error) {
    console.error('Get financial overview error:', error);
    res.status(500).json({ error: 'Failed to fetch financial overview' });
  }
});

// Bulk operations
router.post('/bulk/approve-pickups', async (req, res) => {
  try {
    const { pickup_ids, approval_note } = req.body;

    if (!pickup_ids || !Array.isArray(pickup_ids) || pickup_ids.length === 0) {
      return res.status(400).json({ error: 'Pickup IDs array is required' });
    }

    // Update all pickups to approved
    const result = await query(`
      UPDATE pickups 
      SET status = 'approved', approval_note = $1, updated_at = NOW()
      WHERE id = ANY($2) AND status = 'submitted'
      RETURNING *
    `, [approval_note || 'Bulk approved', pickup_ids]);

    const updatedPickups = result.rows;

    // Emit real-time updates
    updatedPickups.forEach(pickup => {
      req.app.get('io').to(`user-${pickup.collector_id}`).emit('pickup-status-changed', pickup);
      req.app.get('io').to(`user-${pickup.customer_id}`).emit('pickup-status-changed', pickup);
    });

    res.json({
      message: `${updatedPickups.length} pickups approved successfully`,
      updatedPickups
    });

  } catch (error) {
    console.error('Bulk approve pickups error:', error);
    res.status(500).json({ error: 'Failed to approve pickups' });
  }
});

// System maintenance
router.post('/maintenance/cleanup', async (req, res) => {
  try {
    const { days = 90 } = req.body;

    // Clean up old completed pickups (keep for audit)
    const cleanupResult = await query(`
      UPDATE pickups 
      SET status = 'archived'
      WHERE status = 'completed' 
      AND created_at < NOW() - INTERVAL '${days} days'
      RETURNING id
    `);

    res.json({
      message: `Cleanup completed. ${cleanupResult.rows.length} pickups archived.`,
      archivedCount: cleanupResult.rows.length
    });

  } catch (error) {
    console.error('System cleanup error:', error);
    res.status(500).json({ error: 'Failed to perform system cleanup' });
  }
});

// Export data (Admin only)
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json', start_date, end_date } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'pickups':
        data = await getRows(`
          SELECT 
            p.*,
            cu.full_name as customer_name,
            cu.email as customer_email,
            co.full_name as collector_name,
            a.line1, a.suburb, a.city
          FROM pickups p
          LEFT JOIN profiles cu ON cu.id = p.customer_id
          LEFT JOIN profiles co ON co.id = p.collector_id
          LEFT JOIN addresses a ON a.id = p.address_id
          WHERE ($1::date IS NULL OR p.created_at >= $1)
          AND ($2::date IS NULL OR p.created_at <= $2)
          ORDER BY p.created_at DESC
        `, [start_date || null, end_date || null]);
        filename = `pickups-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'customers':
        data = await getRows(`
          SELECT 
            p.*,
            w.balance,
            COUNT(a.id) as address_count
          FROM profiles p
          LEFT JOIN wallets w ON w.user_id = p.id
          LEFT JOIN addresses a ON a.profile_id = p.id
          WHERE p.role = 'customer'
          GROUP BY p.id, w.balance
          ORDER BY p.created_at DESC
        `);
        filename = `customers-export-${new Date().toISOString().split('T')[0]}`;
        break;

      case 'collectors':
        data = await getRows(`
          SELECT 
            p.*,
            COUNT(pk.id) as total_pickups,
            COUNT(CASE WHEN pk.status = 'completed' THEN 1 END) as completed_pickups,
            COALESCE(SUM(CASE WHEN pk.status = 'completed' THEN pk.total_kg ELSE 0 END), 0) as total_kg_collected
          FROM profiles p
          LEFT JOIN pickups pk ON pk.collector_id = p.id
          WHERE p.role = 'collector'
          GROUP BY p.id
          ORDER BY total_kg_collected DESC
        `);
        filename = `collectors-export-${new Date().toISOString().split('T')[0]}`;
        break;

      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(data);
    }

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = router;
