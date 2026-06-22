import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../config/jwt'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number
    username: string
    companyId: number
    role: string
  }
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权访问' })
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({ message: '无效的Token' })
  }

  req.user = decoded as { id: number; username: string; companyId: number; role: string }
  next()
}

export const authorize = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: '未授权访问' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: '权限不足' })
    }

    next()
  }
}