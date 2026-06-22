import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

/** 合规审计日志（只增不改，满足不可篡改要求） */
@Entity('compliance_audit_logs')
@Index(['companyId', 'module'])
export class ComplianceAuditLog {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  module: string

  @Column({ length: 50 })
  action: string

  @Column({ length: 100, nullable: true })
  documentNo: string

  @Column({ length: 50, nullable: true })
  operator: string

  @Column({ type: 'text' })
  detail: string

  @Column({ length: 64, nullable: true })
  checksum: string

  @CreateDateColumn()
  createdAt: Date
}
