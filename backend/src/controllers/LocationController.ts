import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { Location } from '../entities/Location'
import { AuthenticatedRequest } from '../middleware/auth'

export class LocationController {
  private locationRepository = AppDataSource.getRepository(Location)

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const { status, warehouse, keyword } = req.query

      let queryBuilder = this.locationRepository.createQueryBuilder('location')
        .where('location.companyId = :companyId', { companyId })

      if (status) {
        queryBuilder = queryBuilder.andWhere('location.status = :status', { status })
      }

      if (warehouse) {
        queryBuilder = queryBuilder.andWhere('location.warehouse = :warehouse', { warehouse })
      }

      if (keyword) {
        queryBuilder = queryBuilder.andWhere(
          'location.code LIKE :keyword OR location.name LIKE :keyword',
          { keyword: `%${keyword}%` }
        )
      }

      const locations = await queryBuilder.getMany()
      res.json({ success: true, data: locations })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const location = await this.locationRepository.findOne({ where: { id: parseInt(id) } })
      if (!location) {
        return res.status(404).json({ message: '库位不存在' })
      }
      res.json({ success: true, data: location })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const { code, name, warehouse, warehouseCode, area, status, barcode, remark } = req.body

      const existingCode = await this.locationRepository.findOne({ where: { companyId, code } })
      if (existingCode) {
        return res.status(400).json({ message: '库位编号已存在' })
      }

      const location = this.locationRepository.create({
        companyId,
        code,
        name,
        warehouse,
        warehouseCode,
        area,
        status: status || '启用',
        barcode,
        remark
      })

      await this.locationRepository.save(location)
      res.json({ success: true, data: location })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const updates = req.body

      const location = await this.locationRepository.findOne({ where: { id: parseInt(id) } })
      if (!location) {
        return res.status(404).json({ message: '库位不存在' })
      }

      if (updates.code && updates.code !== location.code) {
        const existingCode = await this.locationRepository.findOne({ where: { companyId: location.companyId, code: updates.code } })
        if (existingCode) {
          return res.status(400).json({ message: '库位编号已存在' })
        }
      }

      Object.assign(location, updates)
      await this.locationRepository.save(location)

      res.json({ success: true, data: location })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const location = await this.locationRepository.findOne({ where: { id: parseInt(id) } })
      if (!location) {
        return res.status(404).json({ message: '库位不存在' })
      }

      await this.locationRepository.delete(id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      res.status(500).json({ message: '服务器错误' })
    }
  }
}