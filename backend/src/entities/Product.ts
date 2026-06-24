import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('products')
@Index(['companyId', 'code'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  code: string

  /** 完整商品 JSON（与前端 ProductMaster 对齐） */
  @Column({ type: 'text' })
  payload: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
