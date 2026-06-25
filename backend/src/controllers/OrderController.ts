import { Response } from 'express'
import { AppDataSource } from '../config/database'
import { BizOrder } from '../entities/BizOrder'
import { AuthenticatedRequest } from '../middleware/auth'

type OrderPayload = Record<string, unknown>
type OrderType = 'purchase' | 'sales'

function parsePayload(raw: string): OrderPayload {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function resolveOrderNo(item: OrderPayload): string {
  return String(item.orderNo || item.id || '').trim()
}

function toClientOrder(entity: BizOrder): OrderPayload {
  const data = parsePayload(entity.payload)
  const orderNo = String(entity.orderNo || data.orderNo || data.id || '').trim()
  return {
    ...data,
    id: data.id ?? orderNo,
    orderNo
  }
}

function normalizeIncomingOrder(item: OrderPayload, companyId: number, orderType: OrderType): OrderPayload | null {
  const orderNo = resolveOrderNo(item)
  if (!orderNo) return null

  const incomingCompanyId = Number(item.companyId)
  if (Number.isFinite(incomingCompanyId) && incomingCompanyId > 0 && incomingCompanyId !== companyId) {
    return null
  }

  return {
    ...item,
    id: String(item.id || orderNo),
    orderNo,
    companyId,
    orderType
  }
}

export class OrderController {
  private getRepository() {
    return AppDataSource.getRepository(BizOrder)
  }

  private parseOrderType(req: AuthenticatedRequest): OrderType | null {
    const type = String(req.params.type || '').trim()
    if (type === 'purchase' || type === 'sales') return type
    return null
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      if (!user) return res.status(401).json({ message: '未授权访问' })

      const orderType = this.parseOrderType(req)
      if (!orderType) return res.status(400).json({ message: '无效的订单类型' })

      const repository = this.getRepository()
      const orders = await repository.find({
        where: { companyId: user.companyId, orderType },
        order: { id: 'ASC' }
      })

      res.json({ success: true, data: orders.map(toClientOrder) })
    } catch (error) {
      console.error('获取订单列表错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async sync(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      if (!user) return res.status(401).json({ message: '未授权访问' })

      const orderType = this.parseOrderType(req)
      if (!orderType) return res.status(400).json({ message: '无效的订单类型' })

      const items = Array.isArray(req.body?.items) ? req.body.items : req.body
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: '请提供订单数组 items' })
      }

      const replaceAll = req.body?.replace === true
      const repository = this.getRepository()
      const companyId = user.companyId
      const existing = await repository.find({ where: { companyId, orderType } })
      const existingByNo = new Map(existing.map(item => [item.orderNo, item]))
      const keepNos = new Set<string>()
      let skippedForeignTenant = 0

      for (const rawItem of items) {
        const incomingCompanyId = Number((rawItem as OrderPayload).companyId)
        if (
          Number.isFinite(incomingCompanyId) &&
          incomingCompanyId > 0 &&
          incomingCompanyId !== companyId
        ) {
          skippedForeignTenant += 1
          continue
        }

        const normalized = normalizeIncomingOrder(rawItem as OrderPayload, companyId, orderType)
        if (!normalized) continue

        const orderNo = String(normalized.orderNo)
        keepNos.add(orderNo)
        const payload = JSON.stringify({ ...normalized, orderNo, companyId })
        const found = existingByNo.get(orderNo)

        if (found) {
          found.payload = payload
          await repository.save(found)
        } else {
          await repository.save(
            repository.create({
              companyId,
              orderType,
              orderNo,
              payload
            })
          )
        }
      }

      if (replaceAll) {
        for (const row of existing) {
          if (!keepNos.has(row.orderNo)) {
            await repository.remove(row)
          }
        }
      }

      const latest = await repository.find({ where: { companyId, orderType }, order: { id: 'ASC' } })
      res.json({
        success: true,
        data: latest.map(toClientOrder),
        message: skippedForeignTenant > 0
          ? `订单同步成功，已忽略 ${skippedForeignTenant} 条非本企业订单`
          : '订单同步成功'
      })
    } catch (error) {
      console.error('同步订单错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user
      if (!user) return res.status(401).json({ message: '未授权访问' })

      const orderType = this.parseOrderType(req)
      if (!orderType) return res.status(400).json({ message: '无效的订单类型' })

      const orderNo = String(req.params.id || '').trim()
      if (!orderNo) return res.status(400).json({ message: '缺少订单号' })

      const repository = this.getRepository()
      const found = await repository.findOne({ where: { companyId: user.companyId, orderType, orderNo } })
      if (!found) return res.status(404).json({ message: '订单不存在' })

      await repository.remove(found)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      console.error('删除订单错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }
}
