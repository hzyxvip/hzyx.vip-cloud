import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

/** 跨公司协同订单（买方采购单 ↔ 卖方销售单） */
@Entity('inter_company_orders')
@Index(['buyerCompanyId', 'sellerCompanyId'])
export class InterCompanyOrder {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  buyerCompanyId: number

  @Column()
  sellerCompanyId: number

  @Column({ length: 50 })
  platformOrderNo: string

  @Column({ length: 50, nullable: true })
  buyerOrderNo: string

  @Column({ length: 50, nullable: true })
  sellerOrderNo: string

  @Column({ length: 50, nullable: true })
  outboundNo: string

  @Column({ length: 50, nullable: true })
  acceptanceNo: string

  @Column({ length: 50, nullable: true })
  inboundNo: string

  /** draft | sent | received | outbound | accepted | inbound | completed | cancelled */
  @Column({ length: 20, default: 'draft' })
  status: string

  @Column({ type: 'text' })
  itemsJson: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
