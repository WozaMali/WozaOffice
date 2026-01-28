const express = require('express');
const { getRow, getRows, query } = require('../config/database');
const { requireRole, canAccessResource } = require('../middleware/auth');

const router = express.Router();

// Get all addresses in collector's assigned area
router.get('/addresses', requireRole('collector'), async (req, res) => {
  try {
    const collectorId = req.user.id;

    // Get collector's assigned area (assuming area is stored in profiles or a separate table)
    const collector = await getRow(
      'SELECT assigned_area FROM profiles WHERE id = $1',
      [collectorId]
    );

    if (!collector || !collector.assigned_area) {
      return res.status(400).json({ error: 'Collector area not assigned' });
    }

    // Get all addresses in the collector's area
    const addresses = await getRows(`
      SELECT 
        a.id,
        a.line1,
        a.suburb,
        a.city,
        a.postal_code,
        a.lat,
        a.lng,
        p.full_name as resident_name,
        p.id as user_id,
        COALESCE(w.balance, 0) as wallet_balance
      FROM addresses a
      JOIN profiles p ON p.id = a.profile_id
      LEFT JOIN wallets w ON w.user_id = p.id
      WHERE p.role = 'customer' 
      AND a.city = $1
      AND p.is_active = true
      ORDER BY a.suburb, a.line1
    `, [collector.assigned_area]);

    res.json({ addresses });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Submit a collection record
router.post('/', requireRole('collector'), async (req, res) => {
  try {
    const collectorId = req.user.id;
    const { user_id, address_id, material_type, kgs, notes } = req.body;

    if (!user_id || !address_id || !material_type || !kgs) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the address belongs to the user
    const address = await getRow(
      'SELECT profile_id FROM addresses WHERE id = $1',
      [address_id]
    );

    if (!address || address.profile_id !== user_id) {
      return res.status(400).json({ error: 'Invalid address for user' });
    }

    // Calculate value based on material type and kgs
    const material = await getRow(
      'SELECT rate_per_kg FROM materials WHERE name = $1',
      [material_type]
    );

    const ratePerKg = material ? material.rate_per_kg : 2.5; // Default rate
    const totalValue = kgs * ratePerKg;

    // Create collection record
    const result = await query(`
      INSERT INTO collections (
        user_id, 
        collector_id, 
        address_id, 
        material_type, 
        kgs, 
        total_value,
        status, 
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW())
      RETURNING *
    `, [user_id, collectorId, address_id, material_type, kgs, totalValue, notes || null]);

    const newCollection = result.rows[0];

    // Emit real-time update for new collection
    req.app.get('io').to('role-admin').emit('new-collection-submitted', newCollection);

    res.status(201).json({
      message: 'Collection submitted successfully',
      collection: newCollection
    });

  } catch (error) {
    console.error('Submit collection error:', error);
    res.status(500).json({ error: 'Failed to submit collection' });
  }
});

// Get collector's submitted collections
router.get('/my-collections', requireRole('collector'), async (req, res) => {
  try {
    const collectorId = req.user.id;

    const collections = await getRows(`
      SELECT 
        c.*,
        p.full_name as resident_name,
        a.line1, a.suburb, a.city
      FROM collections c
      JOIN profiles p ON p.id = c.user_id
      JOIN addresses a ON a.id = c.address_id
      WHERE c.collector_id = $1
      ORDER BY c.created_at DESC
    `, [collectorId]);

    res.json({ collections });

  } catch (error) {
    console.error('Get my collections error:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
});

// Get all pending collections (Admin only)
router.get('/pending', requireRole('admin'), async (req, res) => {
  try {
    const collections = await getRows(`
      SELECT 
        c.*,
        p.full_name as resident_name,
        p.email as resident_email,
        co.full_name as collector_name,
        a.line1, a.suburb, a.city
      FROM collections c
      JOIN profiles p ON p.id = c.user_id
      JOIN profiles co ON co.id = c.collector_id
      JOIN addresses a ON a.id = c.address_id
      WHERE c.status = 'pending'
      ORDER BY c.created_at DESC
    `);

    res.json({ collections });

  } catch (error) {
    console.error('Get pending collections error:', error);
    res.status(500).json({ error: 'Failed to fetch pending collections' });
  }
});

// Approve or reject collection (Admin only)
router.patch('/:id/approval', requireRole('admin'), async (req, res) => {
  try {
    const collectionId = req.params.id;
    const { status, admin_notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get collection details
    const collection = await getRow(`
      SELECT * FROM collections WHERE id = $1
    `, [collectionId]);

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    if (collection.status !== 'pending') {
      return res.status(400).json({ error: 'Collection is not pending approval' });
    }

    // Update collection status
    const result = await query(`
      UPDATE collections 
      SET status = $1, admin_notes = $2, approved_at = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, admin_notes, collectionId]);

    const updatedCollection = result.rows[0];

    if (status === 'approved') {
      // Update user's wallet
      await query(`
        UPDATE wallets 
        SET balance = balance + $1, updated_at = NOW()
        WHERE user_id = $2
      `, [collection.total_value, collection.user_id]);

      // Log transaction
      await query(`
        INSERT INTO transactions (
          wallet_id, 
          amount, 
          type, 
          reference, 
          description,
          created_at
        ) VALUES (
          (SELECT id FROM wallets WHERE user_id = $1), 
          $2, 
          'credit', 
          $3, 
          $4,
          NOW()
        )
      `, [collection.user_id, collection.total_value, collection.id, `Collection approved - ${collection.material_type}`]);

      // Process PET Bottles contribution for Green Scholar Fund
      try {
        const fetch = require('node-fetch');
        const response = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/green-scholar/pet-bottles-contribution`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId })
        });
        if (!response.ok) {
          console.warn('⚠️ PET contribution processing failed (non-blocking):', response.statusText);
        }
      } catch (e) {
        console.warn('⚠️ PET contribution processing failed (non-blocking):', e.message);
      }

      // Emit real-time wallet update
      req.app.get('io').to(`user-${collection.user_id}`).emit('wallet-balance-changed', {
        userId: collection.user_id,
        newBalance: collection.total_value,
        reason: 'Collection approved'
      });
    }

    // Emit real-time collection update
    req.app.get('io').to(`user-${collection.user_id}`).emit('collection-status-changed', updatedCollection);
    req.app.get('io').to(`user-${collection.collector_id}`).emit('collection-status-changed', updatedCollection);

    res.json({
      message: `Collection ${status} successfully`,
      collection: updatedCollection
    });

  } catch (error) {
    console.error('Approve collection error:', error);
    res.status(500).json({ error: 'Failed to update collection approval' });
  }
});

// Get collection statistics (Admin only)
router.get('/stats/overview', requireRole('admin'), async (req, res) => {
  try {
    const stats = await getRow(`
      SELECT 
        COUNT(*) as total_collections,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_collections,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_collections,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_collections,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN kgs ELSE 0 END), 0) as total_kgs_approved,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN total_value ELSE 0 END), 0) as total_value_approved
      FROM collections
    `);

    res.json({ stats });

  } catch (error) {
    console.error('Get collection stats error:', error);
    res.status(500).json({ error: 'Failed to fetch collection statistics' });
  }
});

// Get collections by user (for Main App)
router.get('/user/:userId', canAccessResource('profile'), async (req, res) => {
  try {
    const userId = req.params.userId;

    const collections = await getRows(`
      SELECT 
        c.*,
        co.full_name as collector_name,
        a.line1, a.suburb, a.city
      FROM collections c
      JOIN profiles co ON co.id = c.collector_id
      JOIN addresses a ON a.id = c.address_id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({ collections });

  } catch (error) {
    console.error('Get user collections error:', error);
    res.status(500).json({ error: 'Failed to fetch user collections' });
  }
});

module.exports = router;
