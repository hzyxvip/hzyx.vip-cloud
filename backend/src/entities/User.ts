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

  /** 是否在登录页展示为快捷登录账号 */
  @Column({ default: false })
  showOnLogin: boolean

  /** 登录页快捷填入用的演示密码（明文，仅用于内部演示环境） */
  @Column({ type: 'varchar', length: 100, nullable: true })
  loginHintPassword?: string

  /** 账号启用日期 YYYY-MM-DD */
  @Column({ type: 'varchar', length: 10, nullable: true })
  enabledAt?: string

  /** 账号有效年数 */
  @Column({ type: 'integer', nullable: true })
  validityYears?: number

  /** 账号到期日期 YYYY-MM-DD */
  @Column({ type: 'varchar', length: 10, nullable: true })
  expiresAt?: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}