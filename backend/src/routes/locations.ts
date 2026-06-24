import { Router } from 'express'
import { LocationController } from '../controllers/LocationController'
import { authenticate } from '../middleware/auth'

const router = Router()
const locationController = new LocationController()

router.get('/', authenticate, (req, res) => locationController.getAll(req, res))
router.get('/:id', authenticate, (req, res) => locationController.getById(req, res))
router.post('/', authenticate, (req, res) => locationController.create(req, res))
router.put('/:id', authenticate, (req, res) => locationController.update(req, res))
router.delete('/:id', authenticate, (req, res) => locationController.delete(req, res))

export default router
