import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { AppDataSource } from '../config/database'
import { User } from '../entities/User'
import { AuthenticatedRequest } from '../middleware/auth'
import { PLATFORM_BOSS_ROLES } from '../constants/loginAccounts'
import { resolveAccountValidity, todayYmd } from '../utils/accountValidity'

export class UserController {
  private getUserRepository() {
    return AppDataSource.getRepository(User)
  }

  private isPlatformBoss(role?: string): boolean {
    return PLATFORM_BOSS_ROLES.includes(role as (typeof PLATFORM_BOSS_ROLES)[number])
  }

  private sanitizeUser(user: User) {
    const { password: _password, ...safe } = user
    return safe
  }

  private applyValidityFields(target: User, body: Record<string, unknown>) {
    if (!('enabledAt' in body) && !('validityYears' in body) && !('expiresAt' in body)) {
      return
    }

    const resolved = resolveAccountValidity({
      enabledAt: 'enabledAt' in body ? body.enabledAt : target.enabledAt,
      validityYears: 'validityYears' in body ? body.validityYears : target.validityYears,
      expiresAt: 'expiresAt' in body ? body.expiresAt : target.expiresAt
    })

    target.enabledAt = resolved.enabledAt
    target.validityYears = resolved.validityYears
    target.expiresAt = resolved.expiresAt
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const users = this.isPlatformBoss(req.user?.role)
        ? await this.getUserRepository().find({
            relations: ['company'],
            order: { id: 'ASC' }
          })
        : await this.getUserRepository().find({
            where: { companyId: req.user?.companyId || 0 },
            relations: ['company'],
            order: { id: 'ASC' }
          })

      res.json({
        success: true,
        data: users.map(user => this.sanitizeUser(user))
      })
    } catch (error) {
      console.error('获取用户列表错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const user = await this.getUserRepository().findOne({
        where: { id: parseInt(id) },
        relations: ['company']
      })
      if (!user) {
        return res.status(404).json({ message: '用户不存在' })
      }
      res.json({ success: true, data: this.sanitizeUser(user) })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        username,
        password,
        realName,
        companyId,
        role,
        status,
        showOnLogin,
        loginHintPassword,
        enabledAt,
        validityYears,
        expiresAt
      } = req.body
      const normalizedUsername = String(username || '').trim()

      if (!normalizedUsername || !password || !realName || !companyId) {
        return res.status(400).json({ message: '请填写用户名、密码、姓名和所属企业' })
      }

      if (!this.isPlatformBoss(req.user?.role) && companyId !== req.user?.companyId) {
        return res.status(403).json({ message: '无权为其他企业创建账号' })
      }

      const existingUser = await this.getUserRepository().findOne({ where: { username: normalizedUsername } })
      if (existingUser) {
        return res.status(400).json({ message: '用户名已存在' })
      }

      const hashedPassword = await bcrypt.hash(String(password), 10)

      const validity = resolveAccountValidity({
        enabledAt: enabledAt || todayYmd(),
        validityYears: validityYears || 1,
        expiresAt
      })
      const user = this.getUserRepository().create({
        username: normalizedUsername,
        password: hashedPassword,
        realName: String(realName).trim(),
        companyId: Number(companyId),
        role: role || 'company_admin',
        status: status || '启用',
        showOnLogin: Boolean(showOnLogin),
        loginHintPassword: showOnLogin && loginHintPassword
          ? String(loginHintPassword)
          : undefined,
        enabledAt: validity.enabledAt,
        validityYears: validity.validityYears,
        expiresAt: validity.expiresAt
      })

      await this.getUserRepository().save(user)
      const saved = await this.getUserRepository().findOne({
        where: { id: user.id },
        relations: ['company']
      })
      res.json({ success: true, data: saved ? this.sanitizeUser(saved) : user })
    } catch (error) {
      console.error('创建用户错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const updates = { ...req.body }

      const user = await this.getUserRepository().findOne({ where: { id: parseInt(id) } })
      if (!user) {
        return res.status(404).json({ message: '用户不存在' })
      }

      if (!this.isPlatformBoss(req.user?.role) && user.companyId !== req.user?.companyId) {
        return res.status(403).json({ message: '无权修改其他企业账号' })
      }

      if (updates.username) {
        updates.username = String(updates.username).trim()
        if (updates.username !== user.username) {
          const existingUser = await this.getUserRepository().findOne({ where: { username: updates.username } })
          if (existingUser) {
            return res.status(400).json({ message: '用户名已存在' })
          }
        }
      }

      if (updates.companyId && !this.isPlatformBoss(req.user?.role)) {
        return res.status(403).json({ message: '无权调整账号所属企业' })
      }

      if (updates.password) {
        updates.password = await bcrypt.hash(String(updates.password), 10)
      } else {
        delete updates.password
      }

      if (updates.realName) {
        updates.realName = String(updates.realName).trim()
      }

      if ('showOnLogin' in updates) {
        updates.showOnLogin = Boolean(updates.showOnLogin)
        if (!updates.showOnLogin) {
          updates.loginHintPassword = undefined
        }
      }

      if ('loginHintPassword' in updates) {
        updates.loginHintPassword = updates.loginHintPassword
          ? String(updates.loginHintPassword)
          : undefined
      }

      Object.assign(user, updates)
      this.applyValidityFields(user, updates)
      await this.getUserRepository().save(user)

      const saved = await this.getUserRepository().findOne({
        where: { id: user.id },
        relations: ['company']
      })
      res.json({ success: true, data: saved ? this.sanitizeUser(saved) : user })
    } catch (error) {
      console.error('更新用户错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const userId = parseInt(id)
      const user = await this.getUserRepository().findOne({ where: { id: userId } })
      if (!user) {
        return res.status(404).json({ message: '用户不存在' })
      }

      if (req.user?.id === userId) {
        return res.status(400).json({ message: '不能删除当前登录账号' })
      }

      if (!this.isPlatformBoss(req.user?.role) && user.companyId !== req.user?.companyId) {
        return res.status(403).json({ message: '无权删除其他企业账号' })
      }

      await this.getUserRepository().delete(userId)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      console.error('删除用户错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }
}
