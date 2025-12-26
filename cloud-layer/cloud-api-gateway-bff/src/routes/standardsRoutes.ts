import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  getUiCatalog,
  getUiTargets,
  proxyGet,
  proxyHealth,
  proxyImportCsv,
  proxyImportCsvAlias,
  proxyJsonWrite,
  proxyReady,
} from '../controllers/standardsController'

const router = express.Router()

// Health endpoints should be callable without auth (k8s/docker healthcheck)
router.get('/health', proxyHealth)
router.get('/ready', proxyReady)

// Auth-protected endpoints
router.use(jwtAuthMiddleware)

router.get('/sets', proxyGet)
router.post('/sets', proxyJsonWrite)

router.get('/sets/:setId', proxyGet)
router.patch('/sets/:setId', proxyJsonWrite)

router.get('/sets/:setId/rows', proxyGet)
router.put('/sets/:setId/rows', proxyJsonWrite)

router.get('/resolve', proxyGet)

router.post('/sets/:setId/clone', proxyJsonWrite)
router.post('/sets/:setId/adjust', proxyJsonWrite)

router.get('/ui/catalog', getUiCatalog)
router.get('/ui/targets', getUiTargets)

// Import needs raw body so we can forward multipart/form-data unchanged
router.post(
  '/import',
  express.raw({
    type: (req) => {
      const ct = req.headers['content-type'] || ''
      return typeof ct === 'string' && ct.includes('multipart/form-data')
    },
    limit: '10mb',
  }),
  proxyImportCsvAlias
)

// Import needs raw body so we can forward multipart/form-data unchanged
router.post(
  '/imports/csv',
  express.raw({
    type: (req) => {
      const ct = req.headers['content-type'] || ''
      return typeof ct === 'string' && ct.includes('multipart/form-data')
    },
    limit: '10mb',
  }),
  proxyImportCsv
)

router.get('/imports/:jobId', proxyGet)

export default router
