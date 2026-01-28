const express = require('express');
const { getRow, getRows, query } = require('../config/database');
const { requireRole, canAccessResource } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await getRow(`
      SELECT id, email, full_name, phone, role, is_active, created_at
      FROM profiles WHERE id = $1
    `, [userId]);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user addresses
    const addresses = await getRows(`
      SELECT * FROM addresses WHERE profile_id = $1 ORDER BY is_primary DESC, created_at
    `, [userId]);

    res.json({
      profile,
      addresses
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update current user profile
router.patch('/me', async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    const result = await query(`
      UPDATE profiles 
      SET full_name = COALESCE($1, full_name), 
          phone = COALESCE($2, phone),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [full_name, phone, userId]);

    const updatedProfile = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user by ID (Admin only)
router.get('/:id', requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    const profile = await getRow(`
      SELECT id, email, full_name, phone, role, is_active, created_at
      FROM profiles WHERE id = $1
    `, [targetUserId]);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user addresses
    const addresses = await getRows(`
      SELECT * FROM addresses WHERE profile_id = $1 ORDER BY is_primary DESC, created_at
    `, [targetUserId]);

    // Get wallet info
    const wallet = await getRow(`
      SELECT * FROM wallets WHERE user_id = $1
    `, [targetUserId]);

    res.json({
      profile,
      addresses,
      wallet
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get all users (Admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role = '', search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      whereConditions.push(`p.role = $${paramCount}`);
      params.push(role);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(p.full_name ILIKE $${paramCount} OR p.email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM profiles p
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get users with pagination
    const users = await getRows(`
      SELECT 
        p.id, p.email, p.full_name, p.phone, p.role, p.is_active, p.created_at,
        w.balance,
        COUNT(a.id) as address_count
      FROM profiles p
      LEFT JOIN wallets w ON w.user_id = p.id
      LEFT JOIN addresses a ON a.profile_id = p.id
      ${whereClause}
      GROUP BY p.id, w.balance
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (Admin only)
router.patch('/:id/role', requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!['customer', 'collector', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await query(`
      UPDATE profiles 
      SET role = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [role, targetUserId]);

    const updatedProfile = result.rows[0];

    if (!updatedProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully',
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Toggle user active status (Admin only)
router.patch('/:id/status', requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const result = await query(`
      UPDATE profiles 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [is_active, targetUserId]);

    const updatedProfile = result.rows[0];

    if (!updatedProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
      profile: updatedProfile
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get user addresses
router.get('/:id/addresses', canAccessResource('profile'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    const addresses = await getRows(`
      SELECT * FROM addresses 
      WHERE profile_id = $1 
      ORDER BY is_primary DESC, created_at
    `, [targetUserId]);

    res.json({ addresses });

  } catch (error) {
    console.error('Get user addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Add new address for user
router.post('/:id/addresses', canAccessResource('profile'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { line1, suburb, city, postal_code, lat, lng, is_primary } = req.body;

    if (!line1 || !suburb || !city) {
      return res.status(400).json({ error: 'Address line1, suburb, and city are required' });
    }

    // If this is primary, unset other primary addresses
    if (is_primary) {
      await query(`
        UPDATE addresses 
        SET is_primary = false 
        WHERE profile_id = $1 AND is_primary = true
      `, [targetUserId]);
    }

    const result = await query(`
      INSERT INTO addresses (profile_id, line1, suburb, city, postal_code, lat, lng, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [targetUserId, line1, suburb, city, postal_code || null, lat || null, lng || null, is_primary || false]);

    const newAddress = result.rows[0];

    res.status(201).json({
      message: 'Address added successfully',
      address: newAddress
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// Update address
router.patch('/:id/addresses/:addressId', canAccessResource('profile'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const addressId = req.params.addressId;
    const { line1, suburb, city, postal_code, lat, lng, is_primary } = req.body;

    // Verify address belongs to user
    const address = await getRow(`
      SELECT * FROM addresses WHERE id = $1 AND profile_id = $2
    `, [addressId, targetUserId]);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If this is primary, unset other primary addresses
    if (is_primary) {
      await query(`
        UPDATE addresses 
        SET is_primary = false 
        WHERE profile_id = $1 AND is_primary = true AND id != $2
      `, [targetUserId, addressId]);
    }

    const result = await query(`
      UPDATE addresses 
      SET line1 = COALESCE($1, line1),
          suburb = COALESCE($2, suburb),
          city = COALESCE($3, city),
          postal_code = COALESCE($4, postal_code),
          lat = COALESCE($5, lat),
          lng = COALESCE($6, lng),
          is_primary = COALESCE($7, is_primary),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [line1, suburb, city, postal_code, lat, lng, is_primary, addressId]);

    const updatedAddress = result.rows[0];

    res.json({
      message: 'Address updated successfully',
      address: updatedAddress
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address
router.delete('/:id/addresses/:addressId', canAccessResource('profile'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const addressId = req.params.addressId;

    // Verify address belongs to user
    const address = await getRow(`
      SELECT * FROM addresses WHERE id = $1 AND profile_id = $2
    `, [addressId, targetUserId]);

    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    await query(`
      DELETE FROM addresses WHERE id = $1
    `, [addressId]);

    res.json({
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Get user statistics (Admin only)
router.get('/stats/overview', requireRole('admin'), async (req, res) => {
  try {
    const stats = await getRow(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'customer' THEN 1 END) as customers,
        COUNT(CASE WHEN role = 'collector' THEN 1 END) as collectors,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users
      FROM profiles
    `);

    res.json({ stats });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;
