import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JWTPayload, UserRole } from '../types';
import { logger } from '../config/logger.config';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Middleware to check if user has specific role
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware to check category access
export const checkCategoryAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated'
    });
  }

  // Admin can access all categories
  if (req.user.role === UserRole.ADMIN) {
    return next();
  }

  // Get category from request (body or query)
  const categoria = req.body.categoria || req.query.categoria;

  // Check if user role matches category
  if (req.user.role === UserRole.CONTABLE && categoria !== 'CONTABLE') {
    return res.status(403).json({
      success: false,
      error: 'No tienes acceso a esta categoría'
    });
  }

  if (req.user.role === UserRole.JURIDICO && categoria !== 'JURIDICO') {
    return res.status(403).json({
      success: false,
      error: 'No tienes acceso a esta categoría'
    });
  }

  next();
};

export default { authenticate, authorize, checkCategoryAccess };
