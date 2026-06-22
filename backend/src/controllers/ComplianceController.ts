import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { complianceService } from '../services/ComplianceService'
import { AppDataSource } from '../config/database'
import { QualificationDocument } from '../entities/QualificationDocument'
import { NonConformingItem } from '../entities/NonConformingItem'

export class ComplianceController {
  async validatePartner(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const { partnerType, partnerId } = req.query
      if (!partnerType || !partnerId) {
        return res.status(400).json({ message: '缺少 partnerType 或 partnerId' })
      }
      const result = await complianceService.validatePartnerQualifications(
        companyId,
        String(partnerType),
        Number(partnerId)
      )
      res.json({ success: true, data: result })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getUdiTrace(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const { udiCode, batchNo } = req.query
      const chain = await complianceService.getUdiTraceChain(
        companyId,
        udiCode ? String(udiCode) : undefined,
        batchNo ? String(batchNo) : undefined
      )
      res.json({ success: true, data: chain })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async appendUdiTrace(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const operator = req.user?.username
      const saved = await complianceService.appendUdiTrace({ ...req.body, companyId, operator })
      res.json({ success: true, data: saved })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async recordColdChain(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const saved = await complianceService.recordColdChain({ ...req.body, companyId })
      res.json({ success: true, data: saved })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async isolateNonConforming(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const handler = req.user?.username
      const saved = await complianceService.isolateNonConforming({ ...req.body, companyId, handler })
      res.json({ success: true, data: saved })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async listNonConforming(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const repo = AppDataSource.getRepository(NonConformingItem)
      const list = await repo.find({ where: { companyId }, order: { createdAt: 'DESC' } })
      res.json({ success: true, data: list })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async saveQualification(req: AuthenticatedRequest, res: Response) {
    try {
      const companyId = req.user?.companyId || 0
      const repo = AppDataSource.getRepository(QualificationDocument)
      const doc = repo.create({ ...req.body, companyId })
      const saved = await repo.save(doc)
      res.json({ success: true, data: saved })
    } catch {
      res.status(500).json({ message: '服务器错误' })
    }
  }

  async getRetentionPolicy(_req: AuthenticatedRequest, res: Response) {
    res.json({
      success: true,
      data: {
        minRetentionYears: 5,
        minRetentionDays: 1825,
        regulation: '《医疗器械经营质量管理规范》及《医疗器械监督管理条例》'
      }
    })
  }
}

export const complianceController = new ComplianceController()
