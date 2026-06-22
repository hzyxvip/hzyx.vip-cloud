import crypto from 'crypto'
import { AppDataSource } from '../config/database'
import { QualificationDocument } from '../entities/QualificationDocument'
import { UdiTraceRecord } from '../entities/UdiTraceRecord'
import { ComplianceAuditLog } from '../entities/ComplianceAuditLog'
import { ColdChainRecord } from '../entities/ColdChainRecord'
import { NonConformingItem } from '../entities/NonConformingItem'

export const MIN_RECORD_RETENTION_YEARS = 5

const sha256 = (text: string) =>
  crypto.createHash('sha256').update(text).digest('hex')

const daysUntil = (expireDate: string) => {
  const exp = new Date(expireDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export const evaluateQualificationStatus = (expireDate: string, warningDays = 90) => {
  const left = daysUntil(expireDate)
  if (left < 0) return 'expired'
  if (left <= warningDays) return 'expiring'
  return 'valid'
}

export class ComplianceService {
  private qualRepo = AppDataSource.getRepository(QualificationDocument)
  private traceRepo = AppDataSource.getRepository(UdiTraceRecord)
  private auditRepo = AppDataSource.getRepository(ComplianceAuditLog)
  private coldRepo = AppDataSource.getRepository(ColdChainRecord)
  private ncRepo = AppDataSource.getRepository(NonConformingItem)

  async validatePartnerQualifications(
    companyId: number,
    partnerType: string,
    partnerId: number
  ) {
    const docs = await this.qualRepo.find({ where: { companyId, partnerType, partnerId } })
    const errors: string[] = []
    const warnings: string[] = []

    if (docs.length === 0) {
      errors.push('未上传资质证件，不符合 GSP 首营要求')
      return { valid: false, errors, warnings, documents: docs }
    }

    for (const doc of docs) {
      const status = evaluateQualificationStatus(doc.expireDate)
      if (status === 'expired') {
        errors.push(`证件「${doc.docName}」已过期（${doc.expireDate}），禁止业务`)
      } else if (status === 'expiring') {
        warnings.push(`证件「${doc.docName}」即将到期（${doc.expireDate}）`)
      }
      if (doc.status !== status) {
        doc.status = status
        await this.qualRepo.save(doc)
      }
    }

    return { valid: errors.length === 0, errors, warnings, documents: docs }
  }

  async appendAuditLog(params: {
    companyId: number
    module: string
    action: string
    documentNo?: string
    operator?: string
    detail: string
  }) {
    const payload = JSON.stringify(params)
    const log = this.auditRepo.create({
      ...params,
      checksum: sha256(payload + Date.now())
    })
    return this.auditRepo.save(log)
  }

  async appendUdiTrace(params: {
    companyId: number
    nodeType: string
    documentNo: string
    udiDi?: string
    udiPi?: string
    udiCode?: string
    batchNo?: string
    serialNo?: string
    quantity?: number
    operator?: string
    payload?: string
  }) {
    const record = this.traceRepo.create(params)
    const saved = await this.traceRepo.save(record)
    await this.appendAuditLog({
      companyId: params.companyId,
      module: 'udi_trace',
      action: 'append',
      documentNo: params.documentNo,
      operator: params.operator,
      detail: JSON.stringify({ nodeType: params.nodeType, udiCode: params.udiCode, batchNo: params.batchNo })
    })
    return saved
  }

  async getUdiTraceChain(companyId: number, udiCode?: string, batchNo?: string) {
    const qb = this.traceRepo.createQueryBuilder('t').where('t.companyId = :companyId', { companyId })
    if (udiCode) qb.andWhere('t.udiCode = :udiCode', { udiCode })
    if (batchNo) qb.andWhere('t.batchNo = :batchNo', { batchNo })
    return qb.orderBy('t.createdAt', 'ASC').getMany()
  }

  async recordColdChain(params: {
    companyId: number
    deviceId: string
    deviceName?: string
    warehouseCode?: string
    temperature: number
    humidity?: number
    recordedAt?: Date
  }) {
    const alertLevel =
      params.temperature < 2 || params.temperature > 8 ? 'critical' : 'normal'
    const payload = JSON.stringify(params)
    const record = this.coldRepo.create({
      ...params,
      recordedAt: params.recordedAt || new Date(),
      alertLevel,
      checksum: sha256(payload)
    })
    const saved = await this.coldRepo.save(record)
    if (alertLevel === 'critical') {
      await this.appendAuditLog({
        companyId: params.companyId,
        module: 'cold_chain',
        action: 'alert',
        detail: `设备 ${params.deviceId} 温度异常: ${params.temperature}°C`
      })
    }
    return saved
  }

  async isolateNonConforming(params: {
    companyId: number
    productCode: string
    productName: string
    batchNo?: string
    quantity?: number
    warehouseCode: string
    zoneCode: string
    reason?: string
    handler?: string
  }) {
    const item = this.ncRepo.create({ ...params, status: 'isolated' })
    const saved = await this.ncRepo.save(item)
    await this.appendAuditLog({
      companyId: params.companyId,
      module: 'non_conforming',
      action: 'isolate',
      operator: params.handler,
      detail: JSON.stringify(params)
    })
    return saved
  }

  computeRetentionDeadline(recordDate: Date | string) {
    const d = new Date(recordDate)
    d.setFullYear(d.getFullYear() + MIN_RECORD_RETENTION_YEARS)
    return d
  }
}

export const complianceService = new ComplianceService()
