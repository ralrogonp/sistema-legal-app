import { Response } from 'express';
import { query } from '../config/database.config';
import { AuthRequest, UserRole } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';

// @desc    Get pending users
// @route   GET /api/users/pending
// @access  Admin only
export const getPendingUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT id, email, nombre_completo, fecha_creacion
     FROM users 
     WHERE estado_registro = 'PENDIENTE'
     ORDER BY fecha_creacion DESC`
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Approve user and assign role
// @route   PATCH /api/users/:id/approve
// @access  Admin only
export const approveUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['ADMIN', 'CONTABLE', 'JURIDICO'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const result = await query(
    `UPDATE users 
     SET role = $1, 
         activo = true, 
         estado_registro = 'ACTIVO',
         email_verificado = true
     WHERE id = $2
     RETURNING id, email, nombre_completo, role`,
    [role, id]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  logger.info(`User ${id} approved with role ${role} by admin ${req.user!.id}`);

  res.json({
    success: true,
    data: result.rows[0],
    message: 'User approved successfully'
  });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Admin only
export const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT 
       id, email, nombre_completo, role, 
       activo, estado_registro, email_verificado,
       fecha_creacion, fecha_ultimo_acceso
     FROM users
     ORDER BY fecha_creacion DESC`
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Change user role
// @route   PATCH /api/users/:id/role
// @access  Admin only
export const changeUserRole = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  const result = await query(
    `UPDATE users SET role = $1 WHERE id = $2 RETURNING *`,
    [role, id]
  );

  res.json({
    success: true,
    data: result.rows[0],
    message: 'Role updated'
  });
});

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-status
// @access  Admin only
export const toggleUserStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `UPDATE users 
     SET activo = NOT activo,
         estado_registro = CASE WHEN activo THEN 'INACTIVO' ELSE 'ACTIVO' END
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  res.json({
    success: true,
    data: result.rows[0]
  });
});

export default {
  getPendingUsers,
  approveUser,
  getAllUsers,
  changeUserRole,
  toggleUserStatus
};
