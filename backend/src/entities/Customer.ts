import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('customers')
@Index(['companyId', 'code'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  code: string

  /** 完整客户 JSON（与前端 CustomerMaster 对齐） */
  @Column({ type: 'text' })
  payload: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
