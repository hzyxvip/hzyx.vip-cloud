import { Router } from 'express'
import { OrderController } from '../controllers/OrderController'
import { authenticate } from '../middleware/auth'

const router = Router()
const orderController = new OrderController()

router.get('/:type', authenticate, (req, res) => orderController.getAll(req, res))
router.post('/:type/sync', authenticate, (req, res) => orderController.sync(req, res))
router.delete('/:type/:id', authenticate, (req, res) => orderController.delete(req, res))

export default router
