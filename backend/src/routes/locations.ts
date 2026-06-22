import { Router } from 'express'
import { LocationController } from '../controllers/LocationController'
import { authenticate } from '../middleware/auth'

const router = Router()
const locationController = new LocationController()

router.get('/', authenticate, locationController.getAll)
router.get('/:id', authenticate, locationController.getById)
router.post('/', authenticate, locationController.create)
router.put('/:id', authenticate, locationController.update)
router.delete('/:id', authenticate, locationController.delete)

export default router