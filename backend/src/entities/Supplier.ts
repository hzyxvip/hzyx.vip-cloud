import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('suppliers')
@Index(['companyId', 'code'], { unique: true })
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  code: string

  /** 完整供应商 JSON（与前端 SupplierMaster 对齐） */
  @Column({ type: 'text' })
  payload: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
