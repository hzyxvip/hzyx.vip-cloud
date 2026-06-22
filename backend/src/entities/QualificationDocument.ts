import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 供应商/客户/企业资质证件 */
@Entity('qualification_documents')
@Index(['companyId', 'partnerType', 'partnerId'])
export class QualificationDocument {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  /** supplier | customer | company */
  @Column({ length: 20 })
  partnerType: string

  @Column()
  partnerId: number

  @Column({ length: 100 })
  docName: string

  @Column({ length: 100, nullable: true })
  docNo: string

  @Column({ type: 'date', nullable: true })
  issueDate: string

  @Column({ type: 'date' })
  expireDate: string

  @Column({ length: 500, nullable: true })
  fileUrl: string

  /** valid | expiring | expired */
  @Column({ length: 20, default: 'valid' })
  status: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
