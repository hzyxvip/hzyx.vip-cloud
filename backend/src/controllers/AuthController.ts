import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AppDataSource } from '../config/database'
import { User } from '../entities/User'
import { Company } from '../entities/Company'
import { signToken } from '../config/jwt'
import { PLATFORM_BOSS_ROLES, PLATFORM_COMPANY_SEED } from '../constants/loginAccounts'
import { buildLoginAccountEntry } from '../utils/loginAccountHints'
import { isAccountExpired } from '../utils/accountValidity'

export class AuthController {
  private getUserRepository() {
    return AppDataSource.getRepository(User)
  }

  private getCompanyRepository() {
    return AppDataSource.getRepository(Company)
  }

  private isPlatformBoss(role: string): boolean {
    return PLATFORM_BOSS_ROLES.includes(role as (typeof PLATFORM_BOSS_ROLES)[number])
  }

  private async resolveLoginCompany(user: User) {
    const companyRepository = this.getCompanyRepository()
    const platformCompany = await companyRepository.findOne({ where: { code: PLATFORM_COMPANY_SEED.code } })
    const targetCompanyId = this.isPlatformBoss(user.role)
      ? (platformCompany?.id ?? user.companyId)
      : user.companyId
    const company = await companyRepository.findOne({ where: { id: targetCompanyId } })
    return { company, targetCompanyId }
  }

  async getLoginAccounts(_req: Request, res: Response) {
    try {
      const users = await this.getUserRepository().find({
        where: { status: '启用', showOnLogin: true },
        relations: ['company'],
        order: { id: 'ASC' }
      })

      const data = users
        .filter(user => user.company && user.company.status === '启用')
        .map(user => buildLoginAccountEntry(user))

      res.json({ success: true, data })
    } catch (error) {
      console.error('获取登录页账号列表错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async login(req: Request, res: Response) {
    try {
      const username = String(req.body?.username || '').trim()
      const password = String(req.body?.password || '')

      if (!username || !password) {
        return res.status(400).json({ message: '请填写用户名和密码' })
      }

      const userRepository = this.getUserRepository()
      const user = await userRepository.findOne({ where: { username } })

      if (!user) {
        return res.status(401).json({ message: '用户名或密码错误' })
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ message: '用户名或密码错误' })
      }

      if (user.status !== '启用') {
        return res.status(401).json({ message: '用户已停用，请联系管理员' })
      }

      if (isAccountExpired(user.expiresAt)) {
        return res.status(401).json({ message: '账号已过期，请联系管理员续期' })
      }

      const { company, targetCompanyId } = await this.resolveLoginCompany(user)
      if (!company) {
        return res.status(401).json({ message: '用户所属公司不存在，请联系管理员' })
      }
      if (company.status !== '启用') {
        return res.status(401).json({ message: '用户所属公司已停用，请联系管理员' })
      }

      const token = signToken({
        id: user.id,
        username: user.username,
        companyId: targetCompanyId,
        role: user.role
      })

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          realName: user.realName,
          role: user.role,
          companyId: targetCompanyId,
          companyName: company.name,
          companyCode: company.code,
          companyType: company.companyType || ''
        }
      })
    } catch (error) {
      console.error('登录错误:', error)
      res.status(500).json({ message: '服务器错误', error: (error as Error).message })
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const { userId, oldPassword, newPassword } = req.body
      const userRepository = this.getUserRepository()
      const user = await userRepository.findOne({ where: { id: userId } })

      if (!user) {
        return res.status(404).json({ message: '用户不存在' })
      }

      const isValidPassword = await bcrypt.compare(oldPassword, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ message: '旧密码错误' })
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10)
      user.password = hashedPassword
      await userRepository.save(user)

      res.json({ success: true, message: '密码修改成功' })
    } catch (error) {
      console.error('修改密码错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }
}
