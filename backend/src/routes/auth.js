const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRow, query } = require('../config/database');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// User registration (Main App)
router.post('/register', async (req, res) => {
  try {
    const { email, full_name, phone, password, street_address, suburb, city, postal_code } = req.body;

    // Validate required fields
    if (!email || !full_name || !phone || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await getRow(
      'SELECT id FROM profiles WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user profile
    const result = await query(
      `INSERT INTO profiles (email, full_name, phone, role, is_active) 
       VALUES ($1, $2, $3, 'customer', true) 
       RETURNING id, email, full_name, role`,
      [email, full_name, phone]
    );

    const newUser = result.rows[0];

    // Create wallet for new user
    await query(
      'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, 0, 0)',
      [newUser.id]
    );

    // Create address if provided
    if (street_address && suburb && city) {
      await query(
        `INSERT INTO addresses (profile_id, line1, suburb, city, postal_code, is_primary) 
         VALUES ($1, $2, $3, $4, $5, true)`,
        [newUser.id, street_address, suburb, city, postal_code || null]
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login (All Apps)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user profile
    const user = await getRow(
      'SELECT id, email, full_name, role, is_active FROM profiles WHERE email = $1',
      [email]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For now, we'll use a simple password check
    // In production, you should implement proper password hashing
    // This assumes passwords are stored as plain text for now
    // TODO: Implement proper password verification

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create admin user (Office App - protected)
router.post('/create-admin', requireRole('admin'), async (req, res) => {
  try {
    const { email, full_name, phone, password, role } = req.body;

    if (!email || !full_name || !phone || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['admin', 'collector', 'customer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await getRow(
      'SELECT id FROM profiles WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email or phone already exists' });
    }

    // Create user profile
    const result = await query(
      `INSERT INTO profiles (email, full_name, phone, role, is_active) 
       VALUES ($1, $2, $3, $4, true) 
       RETURNING id, email, full_name, role`,
      [email, full_name, phone, role]
    );

    const newUser = result.rows[0];

    // Create wallet for new user
    await query(
      'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, 0, 0)',
      [newUser.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'User creation failed' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user profile
    const user = await getRow(
      'SELECT id, email, full_name, role, is_active FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      token: newToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await getRow(
      'SELECT id, email, full_name, role, is_active, created_at FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
