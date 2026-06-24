import { Router } from 'express'
import { CustomerController } from '../controllers/CustomerController'
import { authenticate } from '../middleware/auth'

const router = Router()
const customerController = new CustomerController()

router.get('/', authenticate, (req, res) => customerController.getAll(req, res))
router.post('/sync', authenticate, (req, res) => customerController.sync(req, res))
router.delete('/:id', authenticate, (req, res) => customerController.delete(req, res))

export default router
