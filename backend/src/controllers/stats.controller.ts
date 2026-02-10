import { Response } from 'express';
import { query } from '../config/database.config';
import { AuthRequest, UserRole } from '../types';
import { asyncHandler } from '../middleware/error.middleware';

export const getCasesStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  
  let categoryFilter = '';
  if (user.role === UserRole.CONTABLE) {
    categoryFilter = "AND categoria = 'CONTABLE'";
  } else if (user.role === UserRole.JURIDICO) {
    categoryFilter = "AND categoria = 'JURIDICO'";
  }

  const result = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE estado = 'PENDIENTE') as pendientes,
      COUNT(*) FILTER (WHERE estado = 'EN_PROCESO') as en_proceso,
      COUNT(*) FILTER (WHERE estado = 'COMPLETADO') as completados,
      COUNT(*) FILTER (WHERE estado = 'RECHAZADO') as rechazados,
      COUNT(*) as total,
      SUM(monto) FILTER (WHERE estado = 'COMPLETADO') as monto_completado,
      COUNT(*) FILTER (WHERE categoria = 'CONTABLE') as contables,
      COUNT(*) FILTER (WHERE categoria = 'JURIDICO') as juridicos
    FROM casos
    WHERE 1=1 ${categoryFilter}
  `);

  res.json({
    success: true,
    data: result.rows[0]
  });
});

export default { getCasesStats };
