import { Response } from 'express';
import { query, transaction } from '../config/database.config';
import { AuthRequest, Case, CaseStatus, UserRole, CasePermissions } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';
import { sendEmailNotification } from '../utils/emailService';

// Helper: Generar número de caso
const generateCaseNumber = (tipo: string): string => {
  const prefix = tipo === 'CONTABLE' ? 'CON' : 'JUR';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${year}-${timestamp}`;
};

// Helper: Verificar permisos del usuario sobre un caso
const getCasePermissions = async (
  userId: number,
  userRole: UserRole,
  caseData: any
): Promise<CasePermissions> => {
  const isAdmin = userRole === UserRole.ADMIN;
  const isSupervisor = caseData.supervisor_id === userId;
  const isCreator = caseData.creado_por === userId;
  const sameCategory = 
    (userRole === UserRole.CONTABLE && caseData.tipo_caso === 'CONTABLE') ||
    (userRole === UserRole.JURIDICO && caseData.tipo_caso === 'JURIDICO');

  return {
    canView: isAdmin || isSupervisor || sameCategory,
    canEdit: isAdmin || isSupervisor,
    canDelete: isAdmin,
    canAddVersion: isAdmin || isSupervisor, // Solo actualizaciones formales
    canAddComment: sameCategory, // Cualquiera de la categoría puede comentar
    canUploadDocuments: isAdmin || isSupervisor || sameCategory,
    canDeleteDocuments: isAdmin || isSupervisor,
    isSupervisor,
    isAdmin
  };
};

// @desc    Crear nuevo caso
// @route   POST /api/cases
// @access  Private (Cualquier usuario de la categoría)
export const createCase = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const {
    tipo_caso,
    titulo,
    descripcion,
    cliente_nombre,
    cliente_rfc,
    rubro,
    contra_quien,
    numero_expediente,
    juzgado_autoridad,
    ubicacion_autoridad
  } = req.body;

  // Validación: El usuario debe poder crear casos de su categoría
  if (user.role !== UserRole.ADMIN) {
    if (
      (user.role === UserRole.CONTABLE && tipo_caso !== 'CONTABLE') ||
      (user.role === UserRole.JURIDICO && tipo_caso !== 'JURIDICO')
    ) {
      throw new AppError('No puedes crear casos de esta categoría', 403);
    }
  }

  const numero_caso = generateCaseNumber(tipo_caso);

  const result = await transaction(async (client) => {
    // 1. Crear caso (el creador es automáticamente el supervisor)
    const caseResult = await client.query(
      `INSERT INTO casos (
        numero_caso, tipo_caso, titulo, descripcion,
        cliente_nombre, cliente_rfc,
        rubro, contra_quien, numero_expediente,
        juzgado_autoridad, ubicacion_autoridad,
        estado, creado_por, supervisor_id,
        fecha_creacion, fecha_actualizacion,
        version_actual, activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), 1, true)
      RETURNING *`,
      [
        numero_caso, tipo_caso, titulo, descripcion,
        cliente_nombre, cliente_rfc || null,
        rubro, contra_quien, numero_expediente,
        juzgado_autoridad, ubicacion_autoridad,
        'ABIERTO',
        user.id, // creado_por
        user.id  // supervisor_id (el creador es supervisor)
      ]
    );

    const newCase = caseResult.rows[0];

    // 2. Crear versión inicial
    await client.query(
      `INSERT INTO versiones_caso (
        caso_id, version_numero, estado_anterior, estado_nuevo,
        cambios_realizados, actualizado_por, tipo_actualizacion,
        fecha_actualizacion
      )
      VALUES ($1, 1, NULL, $2, $3, $4, 'VERSION', NOW())`,
      [newCase.id, 'ABIERTO', 'Caso creado', user.id]
    );

    // 3. Crear notificaciones
    // Notificar al admin si el creador no es admin
    if (user.role !== UserRole.ADMIN) {
      await client.query(
        `INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
         SELECT id, $1, 'CASO_CREADO', $2
         FROM users WHERE role = 'ADMIN'`,
        [newCase.id, `Nuevo caso ${tipo_caso}: ${numero_caso} - ${titulo}`]
      );
    }

    return newCase;
  });

  // 4. Enviar email al admin (asíncrono)
  if (user.role !== UserRole.ADMIN) {
    setImmediate(async () => {
      try {
        const adminEmails = await query(
          'SELECT email FROM users WHERE role = $1 AND activo = true',
          ['ADMIN']
        );
        
        for (const admin of adminEmails.rows) {
          await sendEmailNotification({
            to: admin.email,
            subject: `Nuevo caso creado: ${numero_caso}`,
            template: 'caso-creado',
            data: {
              numero_caso,
              titulo,
              tipo_caso,
              creador: user.email
            }
          });
        }
      } catch (error) {
        logger.error('Error enviando email de notificación:', error);
      }
    });
  }

  logger.info(`Caso creado: ${numero_caso} por usuario ${user.id}`);

  res.status(201).json({
    success: true,
    data: result,
    message: 'Caso creado exitosamente. Eres el supervisor de este caso.'
  });
});

// @desc    Obtener casos (con permisos)
// @route   GET /api/cases
// @access  Private
export const getCases = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const {
    tipo_caso,
    estado,
    cliente,
    fecha_inicio,
    fecha_fin,
    page = '1',
    limit = '20',
    sortBy = 'fecha_actualizacion',
    sortOrder = 'DESC',
    solo_mis_casos = 'false'
  } = req.query;

  let whereConditions = ['c.activo = true'];
  let params: any[] = [];
  let paramIndex = 1;

  // Filtro por rol
  if (user.role === UserRole.CONTABLE) {
    whereConditions.push(`c.tipo_caso = 'CONTABLE'`);
  } else if (user.role === UserRole.JURIDICO) {
    whereConditions.push(`c.tipo_caso = 'JURIDICO'`);
  }

  // Filtro solo mis casos
  if (solo_mis_casos === 'true') {
    whereConditions.push(`c.supervisor_id = $${paramIndex}`);
    params.push(user.id);
    paramIndex++;
  }

  // Otros filtros
  if (tipo_caso) {
    whereConditions.push(`c.tipo_caso = $${paramIndex}`);
    params.push(tipo_caso);
    paramIndex++;
  }

  if (estado) {
    whereConditions.push(`c.estado = $${paramIndex}`);
    params.push(estado);
    paramIndex++;
  }

  if (cliente) {
    whereConditions.push(`LOWER(c.cliente_nombre) LIKE $${paramIndex}`);
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

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Count total
  const countResult = await query(
    `SELECT COUNT(*) as total FROM casos c ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);

  // Pagination
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;
  const totalPages = Math.ceil(total / limitNum);

  // Get cases
  const validSortColumns = ['fecha_creacion', 'fecha_actualizacion', 'numero_caso'];
  const sortColumn = validSortColumns.includes(sortBy as string) ? sortBy : 'fecha_actualizacion';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const result = await query(
    `SELECT 
      c.*,
      u_creador.nombre_completo as creador_nombre,
      u_supervisor.nombre_completo as supervisor_nombre,
      COUNT(DISTINCT d.id) as total_documentos,
      COUNT(DISTINCT v.id) as total_versiones,
      COUNT(DISTINCT com.id) as total_comentarios
     FROM casos c
     LEFT JOIN users u_creador ON c.creado_por = u_creador.id
     LEFT JOIN users u_supervisor ON c.supervisor_id = u_supervisor.id
     LEFT JOIN documentos d ON c.id = d.caso_id
     LEFT JOIN versiones_caso v ON c.id = v.caso_id AND v.tipo_actualizacion = 'VERSION'
     LEFT JOIN caso_comentarios com ON c.id = com.caso_id
     ${whereClause}
     GROUP BY c.id, u_creador.nombre_completo, u_supervisor.nombre_completo
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

// @desc    Agregar VERSIÓN (actualización formal)
// @route   POST /api/cases/:id/versions
// @access  Private (Solo supervisor o admin)
export const addVersion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { cambios_realizados, nuevo_estado, comentarios } = req.body;

  // Obtener caso
  const caseResult = await query('SELECT * FROM casos WHERE id = $1', [id]);
  if (caseResult.rows.length === 0) {
    throw new AppError('Caso no encontrado', 404);
  }

  const caso = caseResult.rows[0];
  const permissions = await getCasePermissions(user.id, user.role, caso);

  if (!permissions.canAddVersion) {
    throw new AppError('Solo el supervisor o admin pueden agregar actualizaciones formales', 403);
  }

  const result = await transaction(async (client) => {
    // 1. Actualizar caso
    const updateResult = await client.query(
      `UPDATE casos 
       SET estado = COALESCE($1, estado),
           fecha_actualizacion = NOW(),
           version_actual = version_actual + 1
       WHERE id = $2
       RETURNING *`,
      [nuevo_estado || null, id]
    );

    const updatedCase = updateResult.rows[0];

    // 2. Crear versión
    const versionResult = await client.query(
      `INSERT INTO versiones_caso (
        caso_id, version_numero, estado_anterior, estado_nuevo,
        cambios_realizados, comentarios, actualizado_por,
        tipo_actualizacion, fecha_actualizacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'VERSION', NOW())
      RETURNING *`,
      [
        id,
        updatedCase.version_actual,
        caso.estado,
        nuevo_estado || caso.estado,
        cambios_realizados,
        comentarios || null,
        user.id
      ]
    );

    // 3. Notificar (al supervisor si el admin actualiza, o viceversa)
    const notifyUserId = user.id === caso.supervisor_id 
      ? null // Si es el supervisor, notificar a admins
      : caso.supervisor_id; // Si es admin, notificar al supervisor

    if (notifyUserId) {
      await client.query(
        `INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
         VALUES ($1, $2, 'NUEVA_VERSION', $3)`,
        [notifyUserId, id, `Nueva actualización en caso ${caso.numero_caso}`]
      );
    }

    // También notificar a admins si el supervisor actualiza
    if (user.role !== UserRole.ADMIN) {
      await client.query(
        `INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
         SELECT id, $1, 'NUEVA_VERSION', $2
         FROM users WHERE role = 'ADMIN'`,
        [id, `Nueva actualización en caso ${caso.numero_caso}`]
      );
    }

    return versionResult.rows[0];
  });

  // Enviar emails (asíncrono)
  setImmediate(async () => {
    try {
      // Email al supervisor
      if (user.id !== caso.supervisor_id) {
        const supervisorEmail = await query(
          'SELECT email FROM users WHERE id = $1',
          [caso.supervisor_id]
        );
        
        if (supervisorEmail.rows.length > 0) {
          await sendEmailNotification({
            to: supervisorEmail.rows[0].email,
            subject: `Actualización en caso ${caso.numero_caso}`,
            template: 'nueva-version',
            data: { numero_caso: caso.numero_caso, cambios: cambios_realizados }
          });
        }
      }

      // Email a admins
      if (user.role !== UserRole.ADMIN) {
        const adminEmails = await query(
          'SELECT email FROM users WHERE role = $1 AND activo = true',
          ['ADMIN']
        );
        
        for (const admin of adminEmails.rows) {
          await sendEmailNotification({
            to: admin.email,
            subject: `Actualización en caso ${caso.numero_caso}`,
            template: 'nueva-version',
            data: { numero_caso: caso.numero_caso, cambios: cambios_realizados }
          });
        }
      }
    } catch (error) {
      logger.error('Error enviando emails:', error);
    }
  });

  logger.info(`Versión agregada al caso ${id} por usuario ${user.id}`);

  res.status(201).json({
    success: true,
    data: result,
    message: 'Actualización registrada exitosamente'
  });
});

// @desc    Agregar COMENTARIO
// @route   POST /api/cases/:id/comments
// @access  Private (Usuarios de la misma categoría)
export const addComment = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const { comentario } = req.body;

  // Obtener caso
  const caseResult = await query('SELECT * FROM casos WHERE id = $1', [id]);
  if (caseResult.rows.length === 0) {
    throw new AppError('Caso no encontrado', 404);
  }

  const caso = caseResult.rows[0];
  const permissions = await getCasePermissions(user.id, user.role, caso);

  if (!permissions.canAddComment) {
    throw new AppError('No tienes permisos para comentar en este caso', 403);
  }

  const result = await query(
    `INSERT INTO caso_comentarios (caso_id, usuario_id, comentario, fecha_comentario)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [id, user.id, comentario]
  );

  // Notificar al supervisor
  if (user.id !== caso.supervisor_id) {
    await query(
      `INSERT INTO notificaciones (usuario_id, caso_id, tipo, mensaje)
       VALUES ($1, $2, 'NUEVO_COMENTARIO', $3)`,
      [caso.supervisor_id, id, `Nuevo comentario en caso ${caso.numero_caso}`]
    );
  }

  logger.info(`Comentario agregado al caso ${id} por usuario ${user.id}`);

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'Comentario agregado exitosamente'
  });
});

// @desc    Obtener versiones y comentarios de un caso
// @route   GET /api/cases/:id/timeline
// @access  Private
export const getCaseTimeline = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Versiones (actualizaciones formales)
  const versiones = await query(
    `SELECT 
      v.*,
      u.nombre_completo as usuario_nombre,
      u.email as usuario_email
     FROM versiones_caso v
     LEFT JOIN users u ON v.actualizado_por = u.id
     WHERE v.caso_id = $1 AND v.tipo_actualizacion = 'VERSION'
     ORDER BY v.version_numero DESC`,
    [id]
  );

  // Comentarios
  const comentarios = await query(
    `SELECT 
      c.*,
      u.nombre_completo as usuario_nombre,
      u.email as usuario_email
     FROM caso_comentarios c
     LEFT JOIN users u ON c.usuario_id = u.id
     WHERE c.caso_id = $1
     ORDER BY c.fecha_comentario DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      versiones: versiones.rows,
      comentarios: comentarios.rows
    }
  });
});

export default {
  createCase,
  getCases,
  addVersion,
  addComment,
  getCaseTimeline
};
