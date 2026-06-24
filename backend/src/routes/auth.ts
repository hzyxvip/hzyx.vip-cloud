import { Router } from 'express'
import { AuthController } from '../controllers/AuthController'

const router = Router()
const authController = new AuthController()

router.get('/login-accounts', (req, res) => authController.getLoginAccounts(req, res))
router.post('/login', (req, res) => authController.login(req, res))
router.post('/change-password', (req, res) => authController.changePassword(req, res))

export default router