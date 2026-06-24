import { DataSource } from 'typeorm'
import 'dotenv/config'
import { Company } from '../entities/Company'
import { User } from '../entities/User'
import { Warehouse } from '../entities/Warehouse'
import { Location } from '../entities/Location'
import { QualificationDocument } from '../entities/QualificationDocument'
import { UdiTraceRecord } from '../entities/UdiTraceRecord'
import { ComplianceAuditLog } from '../entities/ComplianceAuditLog'
import { ColdChainRecord } from '../entities/ColdChainRecord'
import { NonConformingItem } from '../entities/NonConformingItem'
import { InterCompanyOrder } from '../entities/InterCompanyOrder'
import { Product } from '../entities/Product'
import { Customer } from '../entities/Customer'

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'medical_cloud.db',
  synchronize: true,
  logging: false,
  entities: [
    Company,
    User,
    Warehouse,
    Location,
    QualificationDocument,
    UdiTraceRecord,
    ComplianceAuditLog,
    ColdChainRecord,
    NonConformingItem,
    InterCompanyOrder,
    Product,
    Customer
  ],
  migrations: [],
  subscribers: []
})