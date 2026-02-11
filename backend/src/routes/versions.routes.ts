import express from 'express'
import { protect } from '../middleware/auth.middleware'
import { 
  getVersions, 
  getVersion, 
  createVersion,
  compareVersions 
} from '../controllers/versions.controller'

const router = express.Router({ mergeParams: true })

// Todas las rutas requieren autenticación
router.use(protect)

router.route('/')
  .get(getVersions)
  .post(createVersion)

router.route('/compare')
  .get(compareVersions)

router.route('/:versionId')
  .get(getVersion)

export default router
