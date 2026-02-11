import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken'; 
import { query } from '../config/database.config';
import { User, JWTPayload, AuthRequest } from '../types';
import { asyncHandler } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';

const JWT_SECRET = process.env.JWT_SECRET || 'f0313bedc04149d96ad054937e68adeba6d4877c59839c42448a5724bb492269680444c8893ed6780b3a5d0796a79c92af29efd478456aa36f27c449312b63d8';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (payload: JWTPayload): string => {
  // @ts-ignore
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, nombre_completo, password, role } = req.body;

  // Check if user already exists
  const existingUser = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    return res.status(409).json({
      success: false,
      error: 'User already exists with this email'
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Insert user
  const result = await query(
    `INSERT INTO users (email, nombre_completo, password_hash, role, activo, fecha_creacion)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, email, nombre_completo, role, activo, fecha_creacion`,
    [email, nombre_completo, password_hash, role || 'CONTABLE', true]
  );

  const user = result.rows[0];

  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre_completo: user.nombre_completo,
        role: user.role,
        activo: user.activo
      },
      token
    },
    message: 'User registered successfully'
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  const user: User = result.rows[0];

  // Check if user is active
  if (!user.activo) {
    return res.status(403).json({
      success: false,
      error: 'Account is deactivated'
    });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash!);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }

  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre_completo: user.nombre_completo,
        role: user.role,
        activo: user.activo
      },
      token
    },
    message: 'Login successful'
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT id, email, nombre_completo, role, activo, atlassian_id, github_username, fecha_creacion
     FROM users WHERE id = $1`,
    [req.user!.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nombre_completo, atlassian_id, github_username } = req.body;

  const result = await query(
    `UPDATE users
     SET nombre_completo = COALESCE($1, nombre_completo),
         atlassian_id = COALESCE($2, atlassian_id),
         github_username = COALESCE($3, github_username)
     WHERE id = $4
     RETURNING id, email, nombre_completo, role, atlassian_id, github_username`,
    [nombre_completo, atlassian_id, github_username, req.user!.id]
  );

  logger.info(`Profile updated for user: ${req.user!.email}`);

  res.json({
    success: true,
    data: result.rows[0],
    message: 'Profile updated successfully'
  });
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user!.id]
  );

  const user = result.rows[0];

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Current password is incorrect'
    });
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);

  // Update password
  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [password_hash, req.user!.id]
  );

  logger.info(`Password changed for user: ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

export default {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
