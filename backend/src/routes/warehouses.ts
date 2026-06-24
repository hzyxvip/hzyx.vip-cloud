import { Router } from 'express'
import { WarehouseController } from '../controllers/WarehouseController'
import { authenticate } from '../middleware/auth'

const router = Router()
const warehouseController = new WarehouseController()

router.get('/', authenticate, (req, res) => warehouseController.getAll(req, res))
router.get('/:id', authenticate, (req, res) => warehouseController.getById(req, res))
router.post('/', authenticate, (req, res) => warehouseController.create(req, res))
router.put('/:id', authenticate, (req, res) => warehouseController.update(req, res))
router.delete('/:id', authenticate, (req, res) => warehouseController.delete(req, res))

export default router
