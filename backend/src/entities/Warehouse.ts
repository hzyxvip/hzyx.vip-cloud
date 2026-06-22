import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('warehouses')
export class Warehouse {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  code: string

  @Column({ length: 200 })
  name: string

  @Column({ length: 20, default: 'normal' })
  type: string

  @Column({ length: 20, default: 'average' })
  pricingMethod: string

  @Column({ length: 500, nullable: true })
  address: string

  @Column({ length: 100, nullable: true })
  manager: string

  @Column({ length: 50, nullable: true })
  phone: string

  @Column({ length: 20, default: '启用' })
  status: string

  @Column({ default: false })
  allowNegativeStock: boolean

  @Column({ default: false })
  isDefault: boolean

  @Column({ default: false })
  manageBatch: boolean

  @Column({ default: false })
  manageSerialNo: boolean

  @Column({ default: false })
  manageExpiry: boolean

  @Column({ default: false })
  barcodeEnabled: boolean

  @Column({ length: 100, nullable: true })
  capacity: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}