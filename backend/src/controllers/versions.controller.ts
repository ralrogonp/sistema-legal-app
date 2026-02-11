import { Response } from 'express'
import { query } from '../config/database.config'
import { AuthRequest } from '../types'
import { asyncHandler } from '../middleware/error.middleware'
import { logger } from '../config/logger.config'

// @desc    Get all versions of a case
// @route   GET /api/cases/:caseId/versions
// @access  Private
export const getVersions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caseId } = req.params

  const result = await query(
    `SELECT 
      cv.*,
      u.nombre_completo as actualizado_por_nombre
     FROM caso_versiones cv
     LEFT JOIN users u ON cv.actualizado_por = u.id
     WHERE cv.caso_id = $1
     ORDER BY cv.version DESC`,
    [caseId]
  )

  res.json({
    success: true,
    data: result.rows
  })
})

// @desc    Get specific version detail
// @route   GET /api/cases/:caseId/versions/:versionId
// @access  Private
export const getVersion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caseId, versionId } = req.params

  const result = await query(
    `SELECT 
      cv.*,
      u.nombre_completo as actualizado_por_nombre
     FROM caso_versiones cv
     LEFT JOIN users u ON cv.actualizado_por = u.id
     WHERE cv.caso_id = $1 AND cv.id = $2`,
    [caseId, versionId]
  )

  if (result.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Version not found'
    })
  }

  res.json({
    success: true,
    data: result.rows[0]
  })
})

// @desc    Create new version manually (with description)
// @route   POST /api/cases/:caseId/versions
// @access  Private
export const createVersion = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caseId } = req.params
  const { descripcion_cambios } = req.body

  // Get current case data
  const caseResult = await query(
    'SELECT * FROM casos WHERE id = $1',
    [caseId]
  )

  if (caseResult.rows.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Case not found'
    })
  }

  const caso = caseResult.rows[0]
  const newVersion = caso.version_actual + 1

  // Create snapshot of current state
  const snapshot = {
    numero_caso: caso.numero_caso,
    tipo_caso: caso.tipo_caso,
    titulo: caso.titulo,
    descripcion: caso.descripcion,
    estado: caso.estado,
    cliente_nombre: caso.cliente_nombre,
    cliente_rfc: caso.cliente_rfc,
    asignado_a: caso.asignado_a
  }

  // Create version record
  const versionResult = await query(
    `INSERT INTO caso_versiones 
      (caso_id, version, descripcion_cambios, actualizado_por, datos_snapshot)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [caseId, newVersion, descripcion_cambios || 'Actualización manual', req.user!.id, JSON.stringify(snapshot)]
  )

  // Update case version
  await query(
    'UPDATE casos SET version_actual = $1, fecha_actualizacion = NOW() WHERE id = $2',
    [newVersion, caseId]
  )

  logger.info(`New version created for case ${caseId}: v${newVersion} by user ${req.user!.id}`)

  res.status(201).json({
    success: true,
    data: versionResult.rows[0],
    message: 'Version created successfully'
  })
})

// @desc    Compare two versions
// @route   GET /api/cases/:caseId/versions/compare
// @access  Private
export const compareVersions = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caseId } = req.params
  const { version1, version2 } = req.query

  if (!version1 || !version2) {
    return res.status(400).json({
      success: false,
      error: 'Both version1 and version2 query parameters are required'
    })
  }

  const result = await query(
    `SELECT * FROM caso_versiones 
     WHERE caso_id = $1 AND version IN ($2, $3)
     ORDER BY version`,
    [caseId, version1, version2]
  )

  if (result.rows.length !== 2) {
    return res.status(404).json({
      success: false,
      error: 'One or both versions not found'
    })
  }

  res.json({
    success: true,
    data: {
      version1: result.rows[0],
      version2: result.rows[1],
      differences: calculateDifferences(
        result.rows[0].datos_snapshot,
        result.rows[1].datos_snapshot
      )
    }
  })
})

// Helper function to calculate differences between versions
function calculateDifferences(snapshot1: any, snapshot2: any) {
  const differences: any[] = []
  const keys = new Set([...Object.keys(snapshot1), ...Object.keys(snapshot2)])

  keys.forEach(key => {
    if (snapshot1[key] !== snapshot2[key]) {
      differences.push({
        field: key,
        old_value: snapshot1[key],
        new_value: snapshot2[key]
      })
    }
  })

  return differences
}

export default {
  getVersions,
  getVersion,
  createVersion,
  compareVersions
}
