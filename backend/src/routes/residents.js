const express = require('express');
const { getRow, getRows } = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

function calcTierByKg(kg) {
  if (kg >= 100) return 'platinum';
  if (kg >= 50) return 'gold';
  if (kg >= 20) return 'silver';
  return 'bronze';
}

function co2FactorForMaterial(materialType) {
  if (!materialType) return 2.0;
  const name = String(materialType).toLowerCase();
  if (name.includes('aluminum') || name.includes('aluminium') || name.includes('can')) return 9.1;
  if (name.includes('pet') || name.includes('bottle')) return 1.7;
  return 2.0; // default factor
}

// GET /api/residents/:id/summary
// IMPORTANT: Put static path handlers before dynamic ':id' routes
router.get('/approved-collections', requireRole('admin'), async (req, res) => {
  try {
    const rows = await getRows(`
      SELECT 
        c.id,
        c.user_id,
        p.full_name AS resident_name,
        p.email AS resident_email,
        c.material_type,
        c.weight_kg,
        c.total_value,
        c.status,
        COALESCE(c.total_value, c.weight_kg * COALESCE(m.current_rate, 0)) AS amount,
        COALESCE(c.approved_at, c.updated_at, c.created_at) AS date
      FROM collections c
      LEFT JOIN profiles p ON p.id = c.user_id
      LEFT JOIN materials m ON LOWER(m.name) = LOWER(c.material_type)
      WHERE c.status = 'approved'
      ORDER BY COALESCE(c.approved_at, c.updated_at, c.created_at) DESC
    `, []);

    const items = (rows || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      resident_name: r.resident_name,
      resident_email: r.resident_email,
      material_type: r.material_type,
      kgs: Number(r.weight_kg) || 0,
      amount: Number(r.amount) || 0,
      rate_per_kg: (Number(r.weight_kg) ? (Number(r.amount) / Number(r.weight_kg)) : null),
      status: r.status,
      date: r.date
    }));

    res.json({ items });
  } catch (error) {
    console.error('Approved collections error:', error);
    res.status(500).json({ error: 'Failed to fetch approved collections' });
  }
});

router.get('/:id/summary', requireRole('admin'), async (req, res) => {
  try {
    const residentId = req.params.id;

    // Ensure resident exists
    const resident = await getRow(`SELECT id, full_name, email, phone FROM profiles WHERE id = $1`, [residentId]);
    if (!resident) return res.status(404).json({ error: 'Resident not found' });

    // 1) Collections: all approved for resident, include material rate for fallback amounts
    const collections = await getRows(`
      SELECT c.id, c.material_type, c.weight_kg, c.total_value, c.status, c.created_at, c.updated_at, c.approved_at,
             COALESCE(c.total_value, c.weight_kg * COALESCE(m.current_rate, 0)) AS amount
      FROM collections c
      LEFT JOIN materials m ON LOWER(m.name) = LOWER(c.material_type)
      WHERE c.user_id = $1 AND c.status = 'approved'
      ORDER BY COALESCE(c.updated_at, c.approved_at, c.created_at) DESC
    `, [residentId]);

    const totalEarned = (collections || []).reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
    const totalKg = (collections || []).reduce((s, c) => s + (parseFloat(c.weight_kg) || 0), 0);
    const totalCo2Saved = (collections || []).reduce((s, c) => s + (parseFloat(c.weight_kg) || 0) * co2FactorForMaterial(c.material_type), 0);

    // 2) Withdrawals: approved/processed/completed for resident (try multiple table names)
    let withdrawals = [];
    try {
      withdrawals = await getRows(`
        SELECT id, amount, status, created_at, updated_at, approved_at
        FROM withdrawals
        WHERE user_id = $1 AND status IN ('approved','processed','completed')
        ORDER BY COALESCE(updated_at, approved_at, created_at) DESC
      `, [residentId]);
    } catch (e1) {
      try {
        withdrawals = await getRows(`
          SELECT id, amount, status, created_at, updated_at, processed_at AS approved_at
          FROM withdrawal_requests
          WHERE user_id = $1 AND status IN ('approved','processing','completed')
          ORDER BY COALESCE(updated_at, processed_at, created_at) DESC
        `, [residentId]);
      } catch (e2) {
        withdrawals = [];
      }
    }

    const totalUsed = (withdrawals || []).reduce((s, w) => s + (parseFloat(w.amount) || 0), 0);
    const netWalletBalance = Math.max(0, totalEarned - totalUsed);

    // 3) Combined transactions
    const creditTx = (collections || []).map(c => ({
      id: c.id,
      type: 'credit',
      amount: Number(c.amount) || 0,
      material_type: c.material_type,
      kgs: Number(c.weight_kg) || 0,
      date: c.approved_at || c.updated_at || c.created_at,
      description: `Collection approved - ${c.material_type || 'materials'}`
    }));
    const debitTx = (withdrawals || []).map(w => ({
      id: w.id,
      type: 'debit',
      amount: Number(w.amount) || 0,
      date: w.approved_at || w.updated_at || w.created_at,
      description: 'Withdrawal approved'
    }));
    const transactions = [...creditTx, ...debitTx].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4) Impact metrics & tier
    const points = Math.round(totalEarned); // 1 point per rand
    const recyclerTier = calcTierByKg(totalKg);

    res.json({
      resident: {
        id: resident.id,
        name: resident.full_name,
        email: resident.email,
        phone: resident.phone
      },
      walletBalance: Number(netWalletBalance.toFixed(2)),
      totalEarned: Number(totalEarned.toFixed(2)),
      totalUsed: Number(totalUsed.toFixed(2)),
      kilograms: Number(totalKg.toFixed(2)),
      co2Saved: Number(totalCo2Saved.toFixed(2)),
      points,
      recyclerTier,
      transactions
    });
  } catch (error) {
    console.error('Resident summary error:', error);
    res.status(500).json({ error: 'Failed to build resident summary' });
  }
});

// GET /api/residents/approved-collections
// Returns all approved collections across all residents with computed amounts
router.get('/approved-collections', requireRole('admin'), async (req, res) => {
  try {
    const rows = await getRows(`
      SELECT 
        c.id,
        c.user_id,
        p.full_name AS resident_name,
        p.email AS resident_email,
        c.material_type,
        c.weight_kg,
        c.total_value,
        c.status,
        COALESCE(c.total_value, c.weight_kg * COALESCE(m.current_rate, 0)) AS amount,
        COALESCE(c.approved_at, c.updated_at, c.created_at) AS date
      FROM collections c
      LEFT JOIN profiles p ON p.id = c.user_id
      LEFT JOIN materials m ON LOWER(m.name) = LOWER(c.material_type)
      WHERE c.status = 'approved'
      ORDER BY COALESCE(c.approved_at, c.updated_at, c.created_at) DESC
    `, []);

    const items = (rows || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      resident_name: r.resident_name,
      resident_email: r.resident_email,
      material_type: r.material_type,
      kgs: Number(r.weight_kg) || 0,
      amount: Number(r.amount) || 0,
      rate_per_kg: (Number(r.weight_kg) ? (Number(r.amount) / Number(r.weight_kg)) : null),
      status: r.status,
      date: r.date
    }));

    res.json({ items });
  } catch (error) {
    console.error('Approved collections error:', error);
    res.status(500).json({ error: 'Failed to fetch approved collections' });
  }
});

module.exports = router;


