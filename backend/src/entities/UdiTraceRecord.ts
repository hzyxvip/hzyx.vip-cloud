import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm'

/** UDI 全链路追溯记录（只增不改） */
@Entity('udi_trace_records')
@Index(['companyId', 'udiCode'])
@Index(['companyId', 'batchNo'])
export class UdiTraceRecord {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  companyId: number

  @Column({ length: 30 })
  nodeType: string

  @Column({ length: 50 })
  documentNo: string

  @Column({ length: 80, nullable: true })
  udiDi: string

  @Column({ length: 80, nullable: true })
  udiPi: string

  @Column({ length: 120, nullable: true })
  udiCode: string

  @Column({ length: 50, nullable: true })
  batchNo: string

  @Column({ length: 50, nullable: true })
  serialNo: string

  @Column({ nullable: true })
  quantity: number

  @Column({ length: 50, nullable: true })
  operator: string

  @Column({ type: 'text', nullable: true })
  payload: string

  @CreateDateColumn()
  createdAt: Date
}
