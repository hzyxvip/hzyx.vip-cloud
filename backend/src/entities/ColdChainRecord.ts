import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

/** 冷链温湿度自动采集记录（只增不改） */
@Entity('cold_chain_records')
@Index(['companyId', 'deviceId', 'recordedAt'])
export class ColdChainRecord {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 50 })
  deviceId: string

  @Column({ length: 100, nullable: true })
  deviceName: string

  @Column({ length: 50, nullable: true })
  warehouseCode: string

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  temperature: number

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity: number

  @Column({ type: 'datetime' })
  recordedAt: Date

  @Column({ length: 20, default: 'normal' })
  alertLevel: string

  @Column({ length: 64, nullable: true })
  checksum: string

  @CreateDateColumn()
  createdAt: Date
}
