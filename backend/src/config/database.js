const { Pool } = require('pg');

let pool = null;
let isConnected = false;

// Initialize database connection
const initializeDatabase = () => {
  try {
    pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'woza_mali',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test database connection
    pool.on('connect', () => {
      console.log('✅ Connected to WozaMali database');
      isConnected = true;
    });

    pool.on('error', (err) => {
      console.error('❌ Database connection error:', err);
      isConnected = false;
    });

    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database pool:', error.message);
    return false;
  }
};

// Helper function to run queries
const query = async (text, params) => {
  if (!pool || !isConnected) {
    throw new Error('Database not connected. Please ensure PostgreSQL is running and configured.');
  }
  
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function to get a single row
const getRow = async (text, params) => {
  const res = await query(text, params);
  return res.rows[0];
};

// Helper function to get multiple rows
const getRows = async (text, params) => {
  const res = await query(text, params);
  return res.rows;
};

// Test connection function
const testConnection = async () => {
  if (!pool) {
    return false;
  }
  
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const closePool = async () => {
  if (pool) {
    await pool.end();
    console.log('Database pool closed');
  }
};

module.exports = {
  pool: () => pool,
  query,
  getRow,
  getRows,
  initializeDatabase,
  testConnection,
  closePool,
  isConnected: () => isConnected
};
