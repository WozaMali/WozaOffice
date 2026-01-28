const express = require('express');
const { getRow, getRows, query } = require('../config/database');
const { requireRole, canAccessResource } = require('../middleware/auth');

const router = express.Router();

// Get all pickups for current user (based on role)
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let pickups;

    if (userRole === 'admin') {
      // Admins see all pickups
      pickups = await getRows(`
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
      `);
    } else if (userRole === 'collector') {
      // Collectors see their assigned pickups
      pickups = await getRows(`
        SELECT 
          p.*,
          cu.full_name as customer_name,
          cu.email as customer_email,
          a.line1, a.suburb, a.city
        FROM pickups p
        LEFT JOIN profiles cu ON cu.id = p.customer_id
        LEFT JOIN addresses a ON a.id = p.address_id
        WHERE p.collector_id = $1
        ORDER BY p.created_at DESC
      `, [userId]);
    } else {
      // Customers see their own pickups
      pickups = await getRows(`
        SELECT 
          p.*,
          co.full_name as collector_name,
          a.line1, a.suburb, a.city
        FROM pickups p
        LEFT JOIN profiles co ON co.id = p.collector_id
        LEFT JOIN addresses a ON a.id = p.address_id
        WHERE p.customer_id = $1
        ORDER BY p.created_at DESC
      `, [userId]);
    }

    res.json({ pickups });

  } catch (error) {
    console.error('Get pickups error:', error);
    res.status(500).json({ error: 'Failed to fetch pickups' });
  }
});

// Get single pickup by ID
router.get('/:id', canAccessResource('pickup'), async (req, res) => {
  try {
    const pickupId = req.params.id;

    const pickup = await getRow(`
      SELECT 
        p.*,
        cu.full_name as customer_name,
        cu.email as customer_email,
        co.full_name as collector_name,
        a.line1, a.suburb, a.city, a.postal_code
      FROM pickups p
      LEFT JOIN profiles cu ON cu.id = p.customer_id
      LEFT JOIN profiles co ON co.id = p.collector_id
      LEFT JOIN addresses a ON a.id = p.address_id
      WHERE p.id = $1
    `, [pickupId]);

    if (!pickup) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    res.json({ pickup });

  } catch (error) {
    console.error('Get pickup error:', error);
    res.status(500).json({ error: 'Failed to fetch pickup' });
  }
});

// Create new pickup (Office App - Admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { customer_id, collector_id, address_id, scheduled_date, notes } = req.body;

    if (!customer_id || !collector_id || !address_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify customer and collector exist
    const customer = await getRow('SELECT id, role FROM profiles WHERE id = $1', [customer_id]);
    const collector = await getRow('SELECT id, role FROM profiles WHERE id = $1', [collector_id]);

    if (!customer || customer.role !== 'customer') {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }

    if (!collector || collector.role !== 'collector') {
      return res.status(400).json({ error: 'Invalid collector ID' });
    }

    // Create pickup
    const result = await query(`
      INSERT INTO pickups (customer_id, collector_id, address_id, status, notes)
      VALUES ($1, $2, $3, 'submitted', $4)
      RETURNING *
    `, [customer_id, collector_id, address_id, notes || null]);

    const newPickup = result.rows[0];

    // Emit real-time update
    req.app.get('io').to(`user-${collector_id}`).emit('new-pickup-assigned', newPickup);
    req.app.get('io').to(`user-${customer_id}`).emit('pickup-created', newPickup);

    res.status(201).json({
      message: 'Pickup created successfully',
      pickup: newPickup
    });

  } catch (error) {
    console.error('Create pickup error:', error);
    res.status(500).json({ error: 'Failed to create pickup' });
  }
});

// Update pickup status (Collector App)
router.patch('/:id/status', canAccessResource('pickup'), async (req, res) => {
  try {
    const pickupId = req.params.id;
    const { status, total_kg, total_value, notes } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['submitted', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check if user is the assigned collector
    const pickup = await getRow(
      'SELECT collector_id, status FROM pickups WHERE id = $1',
      [pickupId]
    );

    if (!pickup) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    if (pickup.collector_id !== userId) {
      return res.status(403).json({ error: 'Only assigned collector can update pickup' });
    }

    // Update pickup
    const result = await query(`
      UPDATE pickups 
      SET status = $1, total_kg = $2, total_value = $3, notes = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, total_kg || 0, total_value || 0, notes, pickupId]);

    const updatedPickup = result.rows[0];

    // Emit real-time update
    req.app.get('io').to(`user-${pickup.customer_id}`).emit('pickup-status-changed', updatedPickup);
    req.app.get('io').to('role-admin').emit('pickup-updated', updatedPickup);

    res.json({
      message: 'Pickup updated successfully',
      pickup: updatedPickup
    });

  } catch (error) {
    console.error('Update pickup error:', error);
    res.status(500).json({ error: 'Failed to update pickup' });
  }
});

// Approve/reject pickup (Office App - Admin only)
router.patch('/:id/approval', requireRole('admin'), async (req, res) => {
  try {
    const pickupId = req.params.id;
    const { status, approval_note } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid approval status' });
    }

    // Update pickup
    const result = await query(`
      UPDATE pickups 
      SET status = $1, approval_note = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, approval_note, pickupId]);

    const updatedPickup = result.rows[0];

    if (!updatedPickup) {
      return res.status(404).json({ error: 'Pickup not found' });
    }

    // Emit real-time update
    req.app.get('io').to(`user-${updatedPickup.collector_id}`).emit('pickup-status-changed', updatedPickup);
    req.app.get('io').to(`user-${updatedPickup.customer_id}`).emit('pickup-status-changed', updatedPickup);

    res.json({
      message: `Pickup ${status} successfully`,
      pickup: updatedPickup
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to update pickup approval' });
  }
});

// Get pickup statistics (Admin only)
router.get('/stats/overview', requireRole('admin'), async (req, res) => {
  try {
    const stats = await getRow(`
      SELECT 
        COUNT(*) as total_pickups,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_pickups,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_pickups,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_pickups,
        SUM(CASE WHEN status = 'completed' THEN total_kg ELSE 0 END) as total_kg_collected,
        SUM(CASE WHEN status = 'completed' THEN total_value ELSE 0 END) as total_value_collected
      FROM pickups
    `);

    res.json({ stats });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get collector performance (Admin only)
router.get('/stats/collectors', requireRole('admin'), async (req, res) => {
  try {
    const collectorStats = await getRows(`
      SELECT 
        co.id,
        co.full_name,
        co.email,
        COUNT(p.id) as total_pickups,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_pickups,
        SUM(CASE WHEN p.status = 'completed' THEN p.total_kg ELSE 0 END) as total_kg_collected,
        SUM(CASE WHEN p.status = 'completed' THEN p.total_value ELSE 0 END) as total_value_collected
      FROM profiles co
      LEFT JOIN pickups p ON p.collector_id = co.id
      WHERE co.role = 'collector'
      GROUP BY co.id, co.full_name, co.email
      ORDER BY total_kg_collected DESC
    `);

    res.json({ collectorStats });

  } catch (error) {
    console.error('Get collector stats error:', error);
    res.status(500).json({ error: 'Failed to fetch collector statistics' });
  }
});

module.exports = router;
