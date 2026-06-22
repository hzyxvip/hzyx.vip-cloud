import { Router } from 'express'
import { WarehouseController } from '../controllers/WarehouseController'
import { authenticate } from '../middleware/auth'

const router = Router()
const warehouseController = new WarehouseController()

router.get('/', authenticate, warehouseController.getAll)
router.get('/:id', authenticate, warehouseController.getById)
router.post('/', authenticate, warehouseController.create)
router.put('/:id', authenticate, warehouseController.update)
router.delete('/:id', authenticate, warehouseController.delete)

export default router