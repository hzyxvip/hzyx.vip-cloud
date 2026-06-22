import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { authenticate, authorize } from '../middleware/auth'

const router = Router()
const userController = new UserController()

router.get('/', authenticate, (req, res) => userController.getAll(req, res))
router.get('/:id', authenticate, (req, res) => userController.getById(req, res))
router.post('/', authenticate, authorize(['admin', 'platform_admin', 'company_admin']), (req, res) => userController.create(req, res))
router.put('/:id', authenticate, authorize(['admin', 'platform_admin', 'company_admin']), (req, res) => userController.update(req, res))
router.delete('/:id', authenticate, authorize(['admin', 'platform_admin', 'company_admin']), (req, res) => userController.delete(req, res))

export default router
