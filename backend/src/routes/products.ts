import { Router } from 'express'
import { ProductController } from '../controllers/ProductController'
import { authenticate } from '../middleware/auth'

const router = Router()
const controller = new ProductController()

router.get('/platform-catalog', authenticate, (req, res) => controller.getPlatformCatalog(req, res))
router.get('/', authenticate, (req, res) => controller.getAll(req, res))
router.post('/sync', authenticate, (req, res) => controller.sync(req, res))
router.delete('/:id', authenticate, (req, res) => controller.delete(req, res))

export default router
