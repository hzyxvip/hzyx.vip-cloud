import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 50 })
  code: string

  @Column({ length: 200 })
  name: string

  /** platform=平台运营主体；manufacturer/distributor/hospital=入驻客户性质 */
  @Column({ length: 30, default: '' })
  companyType: string

  @Column({ length: 500, nullable: true })
  address: string

  @Column({ length: 50, nullable: true })
  phone: string

  @Column({ length: 50, nullable: true })
  taxNo: string

  @Column({ length: 20, default: '启用' })
  status: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}