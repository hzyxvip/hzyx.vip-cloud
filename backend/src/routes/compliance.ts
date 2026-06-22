import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { complianceController } from '../controllers/ComplianceController'

const router = Router()

router.use(authenticate)

router.get('/retention-policy', (req, res) => complianceController.getRetentionPolicy(req, res))
router.get('/validate-partner', (req, res) => complianceController.validatePartner(req, res))
router.get('/udi-trace', (req, res) => complianceController.getUdiTrace(req, res))
router.post('/udi-trace', (req, res) => complianceController.appendUdiTrace(req, res))
router.post('/cold-chain', (req, res) => complianceController.recordColdChain(req, res))
router.get('/non-conforming', (req, res) => complianceController.listNonConforming(req, res))
router.post('/non-conforming/isolate', (req, res) => complianceController.isolateNonConforming(req, res))
router.post('/qualifications', (req, res) => complianceController.saveQualification(req, res))

export default router
