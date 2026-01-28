import express from 'express'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  createSetHandler,
  getSetHandler,
  listSetsHandler,
  patchSetHandler,
  listRowsHandler,
  upsertRowsHandler,
  resolveSetHandler,
  cloneSetHandler,
  adjustSetHandler,
  importCsvHandler,
  getImportJobHandler,
  listSpeciesCatalogHandler,
  upsertSpeciesCatalogHandler,
  listGeneticLinesHandler,
  upsertGeneticLinesHandler,
  listStandardSchemasHandler,
  upsertStandardSchemasHandler,
  listBreederCompaniesHandler,
  upsertBreederCompaniesHandler,
  exportStandardsHandler,
  deleteSetHandler,
} from '../controllers/standardsController'

const router = express.Router()
router.use(jwtAuthMiddleware)

router.get('/sets', listSetsHandler)
router.post('/sets', requireRole('platform_admin', 'tenant_admin'), createSetHandler)

router.get('/sets/:setId', getSetHandler)
router.patch('/sets/:setId', requireRole('platform_admin', 'tenant_admin'), patchSetHandler)

router.get('/sets/:setId/rows', listRowsHandler)
router.put('/sets/:setId/rows', requireRole('platform_admin', 'tenant_admin'), upsertRowsHandler)

router.get('/resolve', resolveSetHandler)

router.post('/sets/:setId/clone', requireRole('platform_admin', 'tenant_admin'), cloneSetHandler)
router.post('/sets/:setId/adjust', requireRole('platform_admin', 'tenant_admin'), adjustSetHandler)

// Import CSV: accept multipart/form-data proxied by BFF; use raw body parsing.
router.post('/imports/csv', importCsvHandler)
router.get('/imports/:jobId', getImportJobHandler)

// Catalog (admin for write)
router.get('/catalog/species', listSpeciesCatalogHandler)
router.post('/catalog/species', requireRole('platform_admin', 'tenant_admin'), upsertSpeciesCatalogHandler)

router.get('/catalog/breeder-companies', listBreederCompaniesHandler)
router.post('/catalog/breeder-companies', requireRole('platform_admin', 'tenant_admin'), upsertBreederCompaniesHandler)

router.get('/catalog/genetic-lines', listGeneticLinesHandler)
router.post('/catalog/genetic-lines', requireRole('platform_admin', 'tenant_admin'), upsertGeneticLinesHandler)

router.get('/catalog/standard-schemas', listStandardSchemasHandler)
router.post('/catalog/standard-schemas', requireRole('platform_admin', 'tenant_admin'), upsertStandardSchemasHandler)

// Export standards
router.get('/export', exportStandardsHandler)

// Delete standard set
router.delete('/sets/:setId', requireRole('platform_admin', 'tenant_admin'), deleteSetHandler)

export default router
