import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { Warehouse } from '../entities/Warehouse'
import { AuthenticatedRequest } from '../middleware/auth'

export class WarehouseController {
  private warehouseRepository = AppDataSource.getRepository(Warehouse)

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
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

      await this.warehouseRepository.save(warehouse)
      res.json({ success: true, data: warehouse })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const updates = req.body

      const warehouse = await this.warehouseRepository.findOne({ where: { id: parseInt(id) } })
      if (!warehouse) {
        return res.status(404).json({ message: '仓库不存在' })
      }

      if (updates.code && updates.code !== warehouse.code) {
        const existingCode = await this.warehouseRepository.findOne({ where: { companyId: warehouse.companyId, code: updates.code } })
        if (existingCode) {
          return res.status(400).json({ message: '仓库编号已存在' })
        }
      }

      Object.assign(warehouse, updates)
      await this.warehouseRepository.save(warehouse)

      res.json({ success: true, data: warehouse })
    } catch (error) {
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