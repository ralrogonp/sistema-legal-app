import { Response } from 'express';
import { query, transaction } from '../config/database.config';
import { AuthRequest, Case, CaseStatus, UserRole } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';

// Helper function to generate case number
const generateCaseNumber = (categoria: string): string => {
  const prefix = categoria === 'CONTABLE' ? 'CON' : 'JUR';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// @desc    Get all cases
// @route   GET /api/cases
// @access  Private
export const getCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const {
    categoria,
    estado,
    cliente,
    fecha_inicio,
    fecha_fin,
    page = '1',
    limit = '20',
    sortBy = 'fecha_ultima_actualizacion',
    sortOrder = 'DESC'
  } = req.query;

  // Build WHERE clause based on user role
  let whereConditions = [];
  let params: any[] = [];
  let paramIndex = 1;

  // Role-based filtering
  if (user.role === UserRole.CONTABLE) {
    whereConditions.push(`c.categoria = 'CONTABLE'`);
  } else if (user.role === UserRole.JURIDICO) {
    whereConditions.push(`c.categoria = 'JURIDICO'`);
  }
  // ADMIN sees all

  // Apply filters
  if (categoria) {
    whereConditions.push(`c.categoria = $${paramIndex}`);
    params.push(categoria);
    paramIndex++;
  }

  if (estado) {
    whereConditions.push(`c.estado = $${paramIndex}`);
    params.push(estado);
    paramIndex++;
  }

  if (cliente) {
    whereConditions.push(`LOWER(c.cliente) LIKE $${paramIndex}`);
    params.push(`%${(cliente as string).toLowerCase()}%`);
    paramIndex++;
  }

  if (fecha_inicio) {
    whereConditions.push(`c.fecha_creacion >= $${paramIndex}`);
    params.push(fecha_inicio);
    paramIndex++;
  }

  if (fecha_fin) {
    whereConditions.push(`c.fecha_creacion <= $${paramIndex}`);
    params.push(fecha_fin);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM casos c ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Calculate pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(total / limitNum);

  // Get cases
  const validSortColumns = ['fecha_creacion', 'fecha_ultima_actualizacion', 'monto', 'estado'];
  const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'fecha_ultima_actualizacion';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const result = await query(
    `SELECT 
      c.*,
      u.nombre_completo as creado_por_nombre,
      u.email as creado_por_email,
      COUNT(d.id) as total_documentos
     FROM casos c
     LEFT JOIN users u ON c.creado_por = u.id
     LEFT JOIN documentos d ON c.id = d.caso_id
     ${whereClause}
     GROUP BY c.id, u.nombre_completo, u.email
     ORDER BY c.${sortColumn} ${order}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limitNum, offset]
  );

  res.json({
    success: true,
    data: result.rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  });
});

// @desc    Get single case
// @route   GET /api/cases/:id
// @access  Private
export const getCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;

  const result = await query(
    `SELECT 
      c.*,
      u.nombre_completo as creado_por_nombre,
      u.email as creado_por_email
     FROM casos c
     LEFT JOIN users u ON c.creado_por = u.id
     WHERE c.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Case not found', 404);
  }

  const caso = result.rows[0];

  // Check access permissions
  if (user.role === UserRole.CONTABLE && caso.categoria !== 'CONTABLE') {
    throw new AppError('Access denied to this case', 403);
  }

  if (user.role === UserRole.JURIDICO && caso.categoria !== 'JURIDICO') {
    throw new AppError('Access denied to this case', 403);
  }

  // Get documents for this case
  const docsResult = await query(
    `SELECT 
      d.*,
      u.nombre_completo as subido_por_nombre
     FROM documentos d
     LEFT JOIN users u ON d.subido_por = u.id
     WHERE d.caso_id = $1
     ORDER BY d.fecha_subida DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...caso,
      documentos: docsResult.rows
    }
  });
});

// @desc    Create new case
// @route   POST /api/cases
// @access  Private
export const createCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { categoria, cliente, descripcion, monto } = req.body;

  // Check if user can create cases in this category
  if (user.role === UserRole.CONTABLE && categoria !== 'CONTABLE') {
    throw new AppError('Cannot create cases in this category', 403);
  }

  if (user.role === UserRole.JURIDICO && categoria !== 'JURIDICO') {
    throw new AppError('Cannot create cases in this category', 403);
  }

  const numero_caso = generateCaseNumber(categoria);

  const result = await query(
  `INSERT INTO casos (
    numero_caso, categoria, cliente, descripcion, monto, 
    estado, creado_por, fecha_creacion, fecha_ultima_actualizacion, version_actual
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), 1)
  RETURNING *`,
  [numero_caso, categoria, cliente, descripcion, monto || 0, 'PENDIENTE', user.id]
);

  const caso = result.rows[0];

  logger.info(`New case created: ${numero_caso} by user ${user.email}`);

  res.status(201).json({
    success: true,
    data: caso,
    message: 'Case created successfully'
  });
});

// @desc    Update case
// @route   PUT /api/cases/:id
// @access  Private
export const updateCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { estado, descripcion, monto, comentarios } = req.body;

  // Get current case
  const currentCase = await query(
    'SELECT * FROM casos WHERE id = $1',
    [id]
  );

  if (currentCase.rows.length === 0) {
    throw new AppError('Case not found', 404);
  }

  const caso = currentCase.rows[0];

  // Check access permissions
  if (user.role === UserRole.CONTABLE && caso.categoria !== 'CONTABLE') {
    throw new AppError('Access denied to this case', 403);
  }

  if (user.role === UserRole.JURIDICO && caso.categoria !== 'JURIDICO') {
    throw new AppError('Access denied to this case', 403);
  }

  // Use transaction to update case and create version
  const result = await transaction(async (client) => {
    // Update case
    const updateResult = await client.query(
      `UPDATE casos 
       SET estado = COALESCE($1, estado),
           descripcion = COALESCE($2, descripcion),
           monto = COALESCE($3, monto),
           fecha_ultima_actualizacion = NOW(),
           version_actual = version_actual + 1
       WHERE id = $4
       RETURNING *`,
      [estado, descripcion, monto, id]
    );

    const updatedCase = updateResult.rows[0];

    // Create version record if state changed
    if (estado && estado !== caso.estado) {
      const cambios = [];
      if (estado) cambios.push(`Estado: ${caso.estado} → ${estado}`);
      if (descripcion) cambios.push('Descripción actualizada');
      if (monto) cambios.push(`Monto: ${caso.monto} → ${monto}`);

      await client.query(
        `INSERT INTO versiones_caso (
          caso_id, version_numero, estado_anterior, estado_nuevo,
          cambios_realizados, comentarios, actualizado_por, fecha_actualizacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          id,
          updatedCase.version_actual,
          caso.estado,
          estado,
          cambios.join(', '),
          comentarios,
          user.id
        ]
      );
    }

    return updatedCase;
  });

  logger.info(`Case updated: ${caso.numero_caso} by user ${user.email}`);

  res.json({
    success: true,
    data: result,
    message: 'Case updated successfully'
  });
});

// @desc    Delete case
// @route   DELETE /api/cases/:id
// @access  Private (Admin only)
export const deleteCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM casos WHERE id = $1 RETURNING numero_caso',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Case not found', 404);
  }

  logger.info(`Case deleted: ${result.rows[0].numero_caso} by user ${req.user!.email}`);

  res.json({
    success: true,
    message: 'Case deleted successfully'
  });
});

// @desc    Get case history/versions
// @route   GET /api/cases/:id/versions
// @access  Private
export const getCaseVersions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(
    `SELECT 
      v.*,
      u.nombre_completo as actualizado_por_nombre
     FROM versiones_caso v
     LEFT JOIN users u ON v.actualizado_por = u.id
     WHERE v.caso_id = $1
     ORDER BY v.version_numero DESC`,
    [id]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

export default {
  getCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,
  getCaseVersions
};
