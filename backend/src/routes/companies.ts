import { Router } from 'express'
import { CompanyController } from '../controllers/CompanyController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const companyController = new CompanyController()

router.get('/', authenticate, authorize(['admin', 'platform_admin']), (req, res) => companyController.getAll(req, res))
router.get('/:id', authenticate, (req, res) => companyController.getById(req, res))
router.post('/', authenticate, authorize(['admin']), (req, res) => companyController.create(req, res))
router.put('/:id', authenticate, authorize(['admin', 'company_admin']), (req, res) => companyController.update(req, res))
router.delete('/:id', authenticate, authorize(['admin']), (req, res) => companyController.delete(req, res))

export default router