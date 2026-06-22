import jwt from 'jsonwebtoken'
import 'dotenv/config'

const jwtSecret = process.env.JWT_SECRET || 'medical-cloud-jwt-secret-key'
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d'

export const JWT_SECRET: jwt.Secret = jwtSecret
export const JWT_EXPIRES_IN: string = jwtExpiresIn

export const signToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export const verifyToken = (token: string): object | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as object
  } catch {
    return null
  }
}