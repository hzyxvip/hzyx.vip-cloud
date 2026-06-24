import { Request, Response } from 'express'
import { In } from 'typeorm'
import { AppDataSource } from '../config/database'
import { Warehouse } from '../entities/Warehouse'
import { AuthenticatedRequest } from '../middleware/auth'
import {
  LEGACY_DEFAULT_WAREHOUSE_CODES,
  SYSTEM_DEFAULT_WAREHOUSE_CODE,
  SYSTEM_DEFAULT_WAREHOUSE_NAME,
  buildSystemDefaultWarehouse
} from '../constants/warehouseDefaults'

export class WarehouseController {
  private warehouseRepository = AppDataSource.getRepository(Warehouse)

  private async ensureSystemDefaultWarehouse(companyId: number): Promise<void> {
    if (!companyId) return

    const existing = await this.warehouseRepository.findOne({
      where: { companyId, code: SYSTEM_DEFAULT_WAREHOUSE_CODE }
    })
    if (existing) return

    const legacy = await this.warehouseRepository.findOne({
      where: { companyId, code: In([...LEGACY_DEFAULT_WAREHOUSE_CODES]) }
    })
    if (legacy) {
      legacy.code = SYSTEM_DEFAULT_WAREHOUSE_CODE
      if (legacy.name === '主仓库') {
        legacy.name = SYSTEM_DEFAULT_WAREHOUSE_NAME
      }
      legacy.isDefault = true
      await this.warehouseRepository.save(legacy)
      return
    }

    const count = await this.warehouseRepository.count({ where: { companyId } })
    if (count > 0) return

    const warehouse = this.warehouseRepository.create(buildSystemDefaultWarehouse(companyId))
    await this.warehouseRepository.save(warehouse)
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      await this.ensureSystemDefaultWarehouse(companyId)
      const { status, keyword } = req.query

      let queryBuilder = this.warehouseRepository.createQueryBuilder('warehouse')
        .where('warehouse.companyId = :companyId', { companyId })

      if (status) {
        queryBuilder = queryBuilder.andWhere('warehouse.status = :status', { status })
      }

      if (keyword) {
        queryBuilder = queryBuilder.andWhere(
          'warehouse.code LIKE :keyword OR warehouse.name LIKE :keyword OR warehouse.manager LIKE :keyword',
          { keyword: `%${keyword}%` }
        )
      }

      const warehouses = await queryBuilder.getMany()
      res.json({ success: true, data: warehouses })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const warehouse = await this.warehouseRepository.findOne({ where: { id: parseInt(id) } })
      if (!warehouse) {
        return res.status(404).json({ message: '仓库不存在' })
      }
      res.json({ success: true, data: warehouse })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const { code, name, type, pricingMethod, address, manager, phone, status, allowNegativeStock, isDefault, manageBatch, manageSerialNo, manageExpiry, barcodeEnabled, capacity } = req.body

      const existingCode = await this.warehouseRepository.findOne({ where: { companyId, code } })
      if (existingCode) {
        return res.status(400).json({ message: '仓库编号已存在' })
      }

      const warehouse = this.warehouseRepository.create({
        companyId,
        code,
        name,
        type: type || 'normal',
        pricingMethod: pricingMethod || 'average',
        address,
        manager,
        phone,
        status: status || '启用',
        allowNegativeStock: allowNegativeStock || false,
        isDefault: isDefault || false,
        manageBatch: manageBatch || false,
        manageSerialNo: manageSerialNo || false,
        manageExpiry: manageExpiry || false,
        barcodeEnabled: barcodeEnabled || false,
        capacity
      })

      if (warehouse.isDefault) {
        await this.warehouseRepository.update({ companyId }, { isDefault: false })
      }

      await this.warehouseRepository.save(warehouse)
      res.json({ success: true, data: warehouse })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const warehouseId = parseInt(id, 10)
      if (!Number.isFinite(warehouseId)) {
        return res.status(400).json({ message: '无效的仓库 ID' })
      }

      const warehouse = await this.warehouseRepository.findOne({ where: { id: warehouseId } })
      if (!warehouse) {
        return res.status(404).json({ message: '仓库不存在' })
      }

      const companyId = req.user?.companyId || 0
      if (companyId && warehouse.companyId !== companyId) {
        return res.status(403).json({ message: '无权修改该仓库' })
      }

      const allowedKeys = [
        'code', 'name', 'type', 'pricingMethod', 'address', 'manager', 'phone',
        'status', 'allowNegativeStock', 'isDefault', 'manageBatch', 'manageSerialNo',
        'manageExpiry', 'barcodeEnabled', 'capacity'
      ] as const
      const updates: Record<string, unknown> = {}
      for (const key of allowedKeys) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) {
          updates[key] = req.body[key]
        }
      }

      if (updates.code && updates.code !== warehouse.code) {
        const existingCode = await this.warehouseRepository.findOne({
          where: { companyId: warehouse.companyId, code: String(updates.code) }
        })
        if (existingCode) {
          return res.status(400).json({ message: '仓库编号已存在' })
        }
      }

      if (updates.isDefault === true) {
        await this.warehouseRepository.update({ companyId: warehouse.companyId }, { isDefault: false })
      }

      await this.warehouseRepository.update(warehouseId, updates)
      const saved = await this.warehouseRepository.findOne({ where: { id: warehouseId } })
      res.json({ success: true, data: saved })
    } catch (error) {
      console.error('更新仓库失败:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const warehouse = await this.warehouseRepository.findOne({ where: { id: parseInt(id) } })
      if (!warehouse) {
        return res.status(404).json({ message: '仓库不存在' })
      }

      await this.warehouseRepository.delete(id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }
}