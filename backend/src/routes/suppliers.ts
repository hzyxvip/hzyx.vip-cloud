import { Router } from 'express'
import { SupplierController } from '../controllers/SupplierController'
import { authenticate } from '../middleware/auth'

const router = Router()
const supplierController = new SupplierController()

router.get('/', authenticate, (req, res) => supplierController.getAll(req, res))
router.post('/sync', authenticate, (req, res) => supplierController.sync(req, res))
router.delete('/:id', authenticate, (req, res) => supplierController.delete(req, res))

export default router
