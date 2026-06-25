import { Response } from 'express'
import { AppDataSource } from '../config/database'
import { Supplier } from '../entities/Supplier'
import { AuthenticatedRequest } from '../middleware/auth'

type SupplierPayload = Record<string, unknown>

function parsePayload(raw: string): SupplierPayload {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function toClientSupplier(entity: Supplier): SupplierPayload {
  const data = parsePayload(entity.payload)
  const code = String(entity.code || data.code || '').trim()
  const id = data.id ?? String(entity.id)
  return {
    ...data,
    id,
    code
  }
}

function normalizeIncomingSupplier(item: SupplierPayload, companyId: number): SupplierPayload | null {
  const code = String(item.code || item.id || '').trim()
  if (!code) return null
  return {
    ...item,
    id: String(item.id || code),
    code,
    companyId
  }
}

export class SupplierController {
  private getRepository() {
    return AppDataSource.getRepository(Supplier)
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      if (!user) {
        return res.status(401).json({ message: '未授权访问' })
      }

      const repository = this.getRepository()
      const suppliers = await repository.find({
        where: { companyId: user.companyId },
        order: { id: 'ASC' }
      })

      res.json({ success: true, data: suppliers.map(toClientSupplier) })
    } catch (error) {
      console.error('获取供应商列表错误:', error)
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
        return res.status(400).json({ message: '请提供供应商数组 items' })
      }

      const replaceAll = req.body?.replace === true
      const repository = this.getRepository()
      const companyId = user.companyId
      const existing = await repository.find({ where: { companyId } })
      const existingByCode = new Map(existing.map(item => [item.code, item]))
      const keepCodes = new Set<string>()

      for (const rawItem of items) {
        const normalized = normalizeIncomingSupplier(rawItem as SupplierPayload, companyId)
        if (!normalized) continue

        const code = String(normalized.code)
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

      if (replaceAll) {
        const stale = existing.filter(item => !keepCodes.has(item.code))
        if (stale.length > 0) {
          await repository.remove(stale)
        }
      }

      const saved = await repository.find({ where: { companyId }, order: { id: 'ASC' } })
      res.json({ success: true, data: saved.map(toClientSupplier), message: '供应商资料已同步' })
    } catch (error) {
      console.error('同步供应商资料错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      const { id } = req.params
      const repository = this.getRepository()
      const supplier = await repository.findOne({ where: { id: parseInt(id, 10) } })

      if (!supplier) {
        return res.status(404).json({ message: '供应商不存在' })
      }

      if (supplier.companyId !== user?.companyId) {
        return res.status(403).json({ message: '权限不足' })
      }

      await repository.remove(supplier)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      console.error('删除供应商错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }
}
