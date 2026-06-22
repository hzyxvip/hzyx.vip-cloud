import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Company } from './Company'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 100 })
  username: string

  @Column({ length: 255 })
  password: string

  @Column({ length: 100 })
  realName: string

  @Column()
  companyId: number

  @ManyToOne(() => Company, { nullable: true })
  company: Company

  @Column({ length: 50, default: 'company_admin' })
  role: string

  @Column({ length: 20, default: '启用' })
  status: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}