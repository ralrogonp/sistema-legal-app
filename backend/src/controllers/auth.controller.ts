import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.config';
import { User, JWTPayload, AuthRequest, EstadoRegistro } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';
import { sendEmailNotification } from '../utils/emailService';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// @desc    Registro público (sin rol asignado)
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, nombre_completo, password } = req.body;

  // Verificar si el usuario ya existe
  const existingUser = await query(
    'SELECT id, estado_registro FROM users WHERE email = $1',
    [email]
  );

  if (existingUser.rows.length > 0) {
    const user = existingUser.rows[0];
    if (user.estado_registro === 'PENDIENTE') {
      return res.status(400).json({
        success: false,
        error: 'Tu registro está pendiente de aprobación por un administrador'
      });
    }
    return res.status(409).json({
      success: false,
      error: 'Este email ya está registrado'
    });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  // Crear usuario con estado PENDIENTE y sin rol
  const result = await query(
    `INSERT INTO users (
      email, nombre_completo, password_hash, 
      role, activo, estado_registro, 
      email_verificado, fecha_creacion
    )
    VALUES ($1, $2, $3, NULL, false, 'PENDIENTE', false, NOW())
    RETURNING id, email, nombre_completo, estado_registro`,
    [email, nombre_completo, password_hash]
  );

  const newUser = result.rows[0];

  // Notificar a administradores
  await query(
    `INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
     SELECT id, NULL, 'NUEVO_REGISTRO', $1
     FROM users WHERE role = 'ADMIN'`,
    [`Nuevo usuario registrado: ${email} - ${nombre_completo}`]
  );

  // Enviar email a admins (asíncrono)
  setImmediate(async () => {
    try {
      const adminEmails = await query(
        'SELECT email FROM users WHERE role = $1 AND activo = true',
        ['ADMIN']
      );
      
      for (const admin of adminEmails.rows) {
        await sendEmailNotification({
          to: admin.email,
          subject: 'Nuevo usuario pendiente de aprobación',
          template: 'nuevo-registro',
          data: {
            email: newUser.email,
            nombre: newUser.nombre_completo
          }
        });
      }
    } catch (error) {
      logger.error('Error enviando emails a admins:', error);
    }
  });

  logger.info(`Nuevo registro pendiente: ${email}`);

  res.status(201).json({
    success: true,
    data: {
      id: newUser.id,
      email: newUser.email,
      nombre_completo: newUser.nombre_completo,
      estado_registro: newUser.estado_registro
    },
    message: 'Registro exitoso. Tu cuenta será activada por un administrador.'
  });
});

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  }

  const user: User = result.rows[0];

  // Verificar estado de registro
  if (user.estado_registro === 'PENDIENTE') {
    return res.status(403).json({
      success: false,
      error: 'Tu cuenta está pendiente de aprobación por un administrador'
    });
  }

  if (user.estado_registro === 'INACTIVO' || !user.activo) {
    return res.status(403).json({
      success: false,
      error: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
    });
  }

  // Verificar password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash!);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Credenciales inválidas'
    });
  }

  // Actualizar fecha de último acceso
  await query(
    'UPDATE users SET fecha_ultimo_acceso = NOW() WHERE id = $1',
    [user.id]
  );

  // Generar token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  logger.info(`Login exitoso: ${email}`);

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
    message: 'Login exitoso'
  });
});

// @desc    Obtener perfil
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT 
      id, email, nombre_completo, role, activo, 
      estado_registro, email_verificado, fecha_creacion,
      fecha_ultimo_acceso, puede_gestionar_s3
     FROM users WHERE id = $1`,
    [req.user!.id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Usuario no encontrado', 404);
  }

  res.json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Actualizar perfil
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

  logger.info(`Perfil actualizado: ${req.user!.email}`);

  res.json({
    success: true,
    data: result.rows[0],
    message: 'Perfil actualizado exitosamente'
  });
});

// @desc    Cambiar contraseña
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user!.id]
  );

  const user = result.rows[0];
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      error: 'Contraseña actual incorrecta'
    });
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);

  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [password_hash, req.user!.id]
  );

  logger.info(`Contraseña cambiada: ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

export default {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
