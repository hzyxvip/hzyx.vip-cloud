import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 不合格医疗器械隔离/报废流程 */
@Entity('non_conforming_items')
@Index(['companyId', 'status'])
export class NonConformingItem {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  productCode: string

  @Column({ length: 200 })
  productName: string

  @Column({ length: 50, nullable: true })
  batchNo: string

  @Column({ nullable: true })
  quantity: number

  @Column({ length: 50 })
  warehouseCode: string

  @Column({ length: 50 })
  zoneCode: string

  /** isolated | scrapped | returned */
  @Column({ length: 20, default: 'isolated' })
  status: string

  @Column({ type: 'text', nullable: true })
  reason: string

  @Column({ length: 50, nullable: true })
  handler: string

  @Column({ type: 'datetime', nullable: true })
  handledAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
