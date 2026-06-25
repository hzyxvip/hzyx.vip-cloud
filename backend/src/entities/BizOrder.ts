import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('biz_orders')
@Index(['companyId', 'orderType', 'orderNo'], { unique: true })
export class BizOrder {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  /** purchase | sales */
  @Column({ length: 20 })
  orderType: string

  @Column({ length: 50 })
  orderNo: string

  @Column({ type: 'text' })
  payload: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
