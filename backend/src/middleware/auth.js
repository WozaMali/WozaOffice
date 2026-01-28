const jwt = require('jsonwebtoken');
const { getRow } = require('../config/database');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user profile from database
    const user = await getRow(
      'SELECT id, email, full_name, role, is_active FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    if (typeof roles === 'string') {
      roles = [roles];
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: userRole
      });
    }

    next();
  };
};

// Middleware to check if user can access resource
const canAccessResource = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    // Admins can access everything
    if (userRole === 'admin') {
      return next();
    }

    // Check resource ownership or access rights
    try {
      let hasAccess = false;

      switch (resourceType) {
        case 'profile':
          hasAccess = req.params.id === userId;
          break;
        
        case 'pickup':
          const pickup = await getRow(
            'SELECT customer_id, collector_id FROM pickups WHERE id = $1',
            [req.params.id]
          );
          if (pickup) {
            hasAccess = pickup.customer_id === userId || pickup.collector_id === userId;
          }
          break;
        
        case 'wallet':
          hasAccess = req.params.id === userId;
          break;
        
        case 'address':
          const address = await getRow(
            'SELECT profile_id FROM addresses WHERE id = $1',
            [req.params.id]
          );
          if (address) {
            hasAccess = address.profile_id === userId;
          }
          break;
        
        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this resource' });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({ error: 'Error checking resource access' });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  canAccessResource
};
