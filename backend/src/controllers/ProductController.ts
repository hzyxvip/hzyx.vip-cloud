import { Response } from 'express'
import { AppDataSource } from '../config/database'
import { Product } from '../entities/Product'
import { Company } from '../entities/Company'
import { AuthenticatedRequest } from '../middleware/auth'
import { PLATFORM_BOSS_ROLES, PLATFORM_COMPANY_SEED } from '../constants/loginAccounts'

type ProductPayload = Record<string, unknown>

function isPlatformBoss(role?: string): boolean {
  return !!role && (PLATFORM_BOSS_ROLES as readonly string[]).includes(role)
}

function parsePayload(raw: string): ProductPayload {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function toClientProduct(entity: Product): ProductPayload {
  const data = parsePayload(entity.payload)
  return {
    ...data,
    id: entity.id,
    code: entity.code || String(data.code || '')
  }
}

function normalizeIncomingProduct(item: ProductPayload, companyId: number): ProductPayload {
  const code = String(item.code || '').trim()
  return {
    ...item,
    id: item.id,
    code,
    companyId
  }
}

function isCatalogAvailable(data: ProductPayload): boolean {
  const code = String(data.code || '').trim()
  const name = String(data.name || '').trim()
  if (!code || !name) return false
  if (data.auditStatus && data.auditStatus !== '已审核') return false
  const status = String(data.status || '')
  return !['下架', '禁用', '停用'].includes(status)
}

export class ProductController {
  private getRepository() {
    return AppDataSource.getRepository(Product)
  }

  private getCompanyRepository() {
    return AppDataSource.getRepository(Company)
  }

  /** 平台商品资料库：入驻企业引用平台公司已审核商品 */
  async getPlatformCatalog(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ message: '未授权访问' })
      }

      const companyRepository = this.getCompanyRepository()
      const platformCompany = await companyRepository.findOne({
        where: { code: PLATFORM_COMPANY_SEED.code }
      })

      if (!platformCompany) {
        return res.json({ success: true, data: [] })
      }

      const repository = this.getRepository()
      const products = await repository.find({
        where: { companyId: platformCompany.id },
        order: { id: 'ASC' }
      })

      const data = products
        .map(toClientProduct)
        .filter(isCatalogAvailable)

      res.json({ success: true, data })
    } catch (error) {
      console.error('获取平台商品库错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const repository = this.getRepository()
      const user = req.user
      if (!user) {
        return res.status(401).json({ message: '未授权访问' })
      }

      const products = isPlatformBoss(user.role)
        ? await repository.find({ order: { id: 'ASC' } })
        : await repository.find({ where: { companyId: user.companyId }, order: { id: 'ASC' } })

      res.json({ success: true, data: products.map(toClientProduct) })
    } catch (error) {
      console.error('获取商品列表错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async sync(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ message: '未授权访问' })
      }

      const items = Array.isArray(req.body?.items) ? req.body.items : req.body
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: '请提供商品数组 items' })
      }

      const replaceAll = req.body?.replace === true

      const repository = this.getRepository()
      const companyId = user.companyId
      const existing = await repository.find({ where: { companyId } })
      const existingByCode = new Map(existing.map(item => [item.code, item]))
      const keepCodes = new Set<string>()

      for (const rawItem of items) {
        const normalized = normalizeIncomingProduct(rawItem as ProductPayload, companyId)
        const code = String(normalized.code || '').trim()
        if (!code) continue

        keepCodes.add(code)
        const payload = JSON.stringify({ ...normalized, code, companyId })
        const found = existingByCode.get(code)

        if (found) {
          found.payload = payload
          await repository.save(found)
        } else {
          await repository.save(
            repository.create({
              companyId,
              code,
              payload
            })
          )
        }
      }

      const stale = existing.filter(item => !keepCodes.has(item.code))
      if (replaceAll && stale.length > 0) {
        await repository.remove(stale)
      }

      const saved = await repository.find({ where: { companyId }, order: { id: 'ASC' } })
      res.json({ success: true, data: saved.map(toClientProduct), message: '商品资料已同步' })
    } catch (error) {
      console.error('同步商品资料错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      const { id } = req.params
      const repository = this.getRepository()
      const product = await repository.findOne({ where: { id: parseInt(id, 10) } })

      if (!product) {
        return res.status(404).json({ message: '商品不存在' })
      }

      if (!isPlatformBoss(user?.role) && product.companyId !== user?.companyId) {
        return res.status(403).json({ message: '权限不足' })
      }

      await repository.remove(product)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      console.error('删除商品错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }
}
