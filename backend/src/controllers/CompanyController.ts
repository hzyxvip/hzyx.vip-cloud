import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { Company } from '../entities/Company'
import { AuthenticatedRequest } from '../middleware/auth'

export class CompanyController {
  private getRepository() {
    return AppDataSource.getRepository(Company)
  }

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const repository = this.getRepository()
      const companies = await repository.find()
      res.json(companies)
    } catch (error) {
      console.error('获取公司列表错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const repository = this.getRepository()
      const company = await repository.findOne({ where: { id: parseInt(id) } })
      if (!company) {
        return res.status(404).json({ message: '公司不存在' })
      }
      res.json(company)
    } catch (error) {
      console.error('获取公司详情错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { code, name, address, phone, taxNo, status } = req.body
      const repository = this.getRepository()

      const existingCode = await repository.findOne({ where: { code } })
      if (existingCode) {
        return res.status(400).json({ message: '公司编号已存在' })
      }

      const existingName = await repository.findOne({ where: { name } })
      if (existingName) {
        return res.status(400).json({ message: '公司名称已存在' })
      }

      const company = repository.create({
        code,
        name,
        address,
        phone,
        taxNo,
        status: status || '启用'
      })

      await repository.save(company)
      res.json({ success: true, data: company })
    } catch (error) {
      console.error('创建公司错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const updates = req.body
      const repository = this.getRepository()

      const company = await repository.findOne({ where: { id: parseInt(id) } })
      if (!company) {
        return res.status(404).json({ message: '公司不存在' })
      }

      if (updates.code && updates.code !== company.code) {
        const existingCode = await repository.findOne({ where: { code: updates.code } })
        if (existingCode) {
          return res.status(400).json({ message: '公司编号已存在' })
        }
      }

      if (updates.name && updates.name !== company.name) {
        const existingName = await repository.findOne({ where: { name: updates.name } })
        if (existingName) {
          return res.status(400).json({ message: '公司名称已存在' })
        }
      }

      Object.assign(company, updates)
      await repository.save(company)

      res.json({ success: true, data: company })
    } catch (error) {
      console.error('更新公司错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      const repository = this.getRepository()
      const company = await repository.findOne({ where: { id: parseInt(id) } })
      if (!company) {
        return res.status(404).json({ message: '公司不存在' })
      }

      await repository.delete(id)
      res.json({ success: true, message: '删除成功' })
    } catch (error) {
      console.error('删除公司错误:', error)
      res.status(500).json({ message: '服务器错误' })
    }
  }
}