import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  code: string

  @Column({ length: 200 })
  name: string

  @Column({ length: 200 })
  warehouse: string

  @Column({ length: 50, nullable: true })
  warehouseCode: string

  @Column({ length: 50, nullable: true })
  area: string

  @Column({ length: 20, default: '启用' })
  status: string

  @Column({ length: 200, nullable: true })
  barcode: string

  @Column({ length: 500, nullable: true })
  remark: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}