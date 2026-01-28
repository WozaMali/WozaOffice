const express = require('express');
const { getRow, getRows, query } = require('../config/database');
const { requireRole, canAccessResource } = require('../middleware/auth');

const router = express.Router();

// Helper: get approved collections summary and list for a resident
async function getResidentApprovedTransactions(residentId) {
  // Fetch all approved collections for the resident, with computed amount fallback
  const collections = await getRows(`
    SELECT 
      c.*,
      p.full_name as customer_name,
      co.full_name as collector_name,
      COALESCE(c.total_value, c.weight_kg * COALESCE(m.current_rate, 0)) AS computed_amount
    FROM collections c
    LEFT JOIN profiles p ON p.id = c.user_id
    LEFT JOIN profiles co ON co.id = c.collector_id
    LEFT JOIN materials m ON LOWER(m.name) = LOWER(c.material_type)
    WHERE c.user_id = $1 AND c.status = 'approved'
    ORDER BY COALESCE(c.updated_at, c.approved_at, c.created_at) DESC
  `, [residentId]);

  const transactions = (collections || []).map(c => ({
    id: c.id,
    type: 'credit',
    amount: c.computed_amount || 0,
    material_type: c.material_type,
    kgs: c.weight_kg,
    status: c.status,
    customer_name: c.customer_name,
    collector_name: c.collector_name,
    created_at: c.created_at,
    approved_at: c.approved_at,
    updated_at: c.updated_at,
    reference: c.id,
    description: `Collection approved - ${c.material_type || 'materials'}`
  }));

  const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  return { totalRevenue, transactions };
}

// Debug endpoint: show a resident's transactions (approved) by email
router.get('/debug/by-email/:email', requireRole('admin'), async (req, res) => {
  try {
    const { email } = req.params;
    const user = await getRow(`SELECT id FROM profiles WHERE email = $1`, [email]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { totalRevenue, transactions } = await getResidentApprovedTransactions(user.id);
    res.json({ userId: user.id, email, totalRevenue, transactions });
  } catch (err) {
    console.error('Debug by-email error:', err);
    res.status(500).json({ error: 'Failed to fetch debug data' });
  }
});

// Get wallet balance and history for current user
router.get('/my-wallet', async (req, res) => {
  try {
    const userId = req.user.id;

    // Compute wallet balance from approved collections and return history
    const { totalRevenue, transactions } = await getResidentApprovedTransactions(userId);

    // Keep kilograms and points metrics unchanged: fetch existing wallet row if present
    const wallet = await getRow(`
      SELECT * FROM wallets WHERE user_id = $1
    `, [userId]);

    // Respond with aggregated balance and transactions from collections
    res.json({
      wallet: {
        ...(wallet || {}),
        user_id: userId,
        balance: totalRevenue
      },
      transactions
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Get wallet by user ID (Admin only)
router.get('/:userId', requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Compute aggregated totals and transactions from approved collections
    const { totalRevenue, transactions } = await getResidentApprovedTransactions(targetUserId);

    // Fetch existing wallet to preserve points/kg metrics
    const wallet = await getRow(`
      SELECT w.*, p.full_name, p.email, p.role
      FROM wallets w
      JOIN profiles p ON p.id = w.user_id
      WHERE w.user_id = $1
    `, [targetUserId]);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      wallet: { ...wallet, balance: totalRevenue },
      transactions
    });

  } catch (error) {
    console.error('Get wallet by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Update wallet balance (Admin only - for manual adjustments)
router.patch('/:userId/balance', requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { adjustment, reason, admin_notes } = req.body;
    const adminId = req.user.id;

    if (!adjustment || !reason) {
      return res.status(400).json({ error: 'Adjustment amount and reason required' });
    }

    // Get current wallet
    const wallet = await getRow(`
      SELECT * FROM wallets WHERE user_id = $1
    `, [targetUserId]);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const newBalance = Math.max(0, wallet.balance + parseFloat(adjustment));

    // Update wallet
    await query(`
      UPDATE wallets 
      SET balance = $1, updated_at = NOW()
      WHERE user_id = $2
    `, [newBalance, targetUserId]);

    // Create transaction record
    await query(`
      INSERT INTO transactions (
        customer_id, collector_id, amount, type, reason, admin_notes, admin_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [targetUserId, null, adjustment, 'admin_adjustment', reason, admin_notes, adminId]);

    // Emit real-time update
    req.app.get('io').to(`user-${targetUserId}`).emit('wallet-balance-changed', {
      userId: targetUserId,
      newBalance,
      adjustment,
      reason
    });

    res.json({
      message: 'Wallet balance updated successfully',
      oldBalance: wallet.balance,
      newBalance,
      adjustment
    });

  } catch (error) {
    console.error('Update wallet balance error:', error);
    res.status(500).json({ error: 'Failed to update wallet balance' });
  }
});

// Reset wallet to zero (Admin only)
router.post('/:userId/reset', requireRole('admin'), async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { reason, admin_notes } = req.body;
    const adminId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Reset reason required' });
    }

    // Get current wallet
    const wallet = await getRow(`
      SELECT * FROM wallets WHERE user_id = $1
    `, [targetUserId]);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const oldBalance = wallet.balance;

    // Reset wallet
    await query(`
      UPDATE wallets 
      SET balance = 0, updated_at = NOW()
      WHERE user_id = $2
    `, [0, targetUserId]);

    // Create transaction record
    await query(`
      INSERT INTO transactions (
        customer_id, collector_id, amount, type, reason, admin_notes, admin_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [targetUserId, null, -oldBalance, 'wallet_reset', reason, admin_notes, adminId]);

    // Emit real-time update
    req.app.get('io').to(`user-${targetUserId}`).emit('wallet-balance-changed', {
      userId: targetUserId,
      newBalance: 0,
      adjustment: -oldBalance,
      reason: 'Wallet reset'
    });

    res.json({
      message: 'Wallet reset successfully',
      oldBalance,
      newBalance: 0
    });

  } catch (error) {
    console.error('Reset wallet error:', error);
    res.status(500).json({ error: 'Failed to reset wallet' });
  }
});

// Get all wallets (Admin only)
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params = [];

    if (search) {
      whereClause = `WHERE p.full_name ILIKE $1 OR p.email ILIKE $1`;
      params.push(`%${search}%`);
    }

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM wallets w
      JOIN profiles p ON p.id = w.user_id
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get wallets with pagination
    const wallets = await getRows(`
      SELECT 
        w.*,
        p.full_name,
        p.email,
        p.role,
        p.created_at as user_created_at
      FROM wallets w
      JOIN profiles p ON p.id = w.user_id
      ${whereClause}
      ORDER BY w.updated_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({
      wallets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch wallets' });
  }
});

// Get wallet statistics (Admin only)
router.get('/stats/overview', requireRole('admin'), async (req, res) => {
  try {
    const stats = await getRow(`
      SELECT 
        COUNT(*) as total_wallets,
        SUM(balance) as total_balance,
        AVG(balance) as average_balance,
        COUNT(CASE WHEN balance > 0 THEN 1 END) as active_wallets,
        COUNT(CASE WHEN balance = 0 THEN 1 END) as empty_wallets
      FROM wallets
    `);

    res.json({ stats });

  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet statistics' });
  }
});

module.exports = router;
