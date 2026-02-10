import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database.config';
import { AuthRequest } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';

export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(`
    SELECT id, email, nombre_completo, role, activo, fecha_creacion
    FROM users
    ORDER BY fecha_creacion DESC
  `);

  res.json({
    success: true,
    data: result.rows
  });
});

export const inviteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email, nombre_completo, role } = req.body;

  const token = Math.random().toString(36).substring(2, 15);

  const result = await query(`
    INSERT INTO users (email, nombre_completo, role, activo, invitation_sent, invitation_token, fecha_creacion)
    VALUES ($1, $2, $3, false, true, $4, NOW())
    RETURNING id, email, nombre_completo, role
  `, [email, nombre_completo, role, token]);

  logger.info(`User invited: ${email}`);

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'User invited successfully'
  });
});

export const toggleUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(`
    UPDATE users
    SET activo = NOT activo
    WHERE id = $1
    RETURNING id, email, activo
  `, [id]);

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

export default { getUsers, inviteUser, toggleUserStatus };
