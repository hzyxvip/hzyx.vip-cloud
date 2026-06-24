import bcrypt from 'bcryptjs'
import { AppDataSource } from '../config/database'
import { Company } from '../entities/Company'
import { User } from '../entities/User'
import { Warehouse } from '../entities/Warehouse'
import { Location } from '../entities/Location'
import { Product } from '../entities/Product'
import { Customer } from '../entities/Customer'
import { DEMO_CUSTOMER_SEED } from '../constants/customerDefaults'
import {
  DEMO_COMPANY_SEED,
  DEMO_TENANT_ACCOUNT,
  MANUFACTURER_COMPANY_SEED,
  MANUFACTURER_TENANT_ACCOUNT,
  PLATFORM_ADMIN_ACCOUNT,
  PLATFORM_COMPANY_SEED,
  type SeedLoginAccount
} from '../constants/loginAccounts'
import {
  LEGACY_DEFAULT_WAREHOUSE_CODES,
  SYSTEM_DEFAULT_WAREHOUSE_CODE,
  SYSTEM_DEFAULT_WAREHOUSE_NAME,
  buildSystemDefaultWarehouse
} from '../constants/warehouseDefaults'
import { resolveAccountValidity } from '../utils/accountValidity'

const DEFAULT_ACCOUNT_ENABLED_AT = '2024-01-01'
const DEFAULT_ACCOUNT_VALIDITY_YEARS = 10

async function upsertUser(
  userRepository: ReturnType<typeof AppDataSource.getRepository<User>>,
  account: SeedLoginAccount,
  companyId: number
) {
  const hashedPassword = await bcrypt.hash(account.password, 10)
  const validity = resolveAccountValidity({
    enabledAt: DEFAULT_ACCOUNT_ENABLED_AT,
    validityYears: DEFAULT_ACCOUNT_VALIDITY_YEARS
  })
  let user = await userRepository.findOne({ where: { username: account.username } })

  if (!user) {
    user = userRepository.create({
      username: account.username,
      password: hashedPassword,
      realName: account.realName,
      companyId,
      role: account.role,
      status: '启用',
      showOnLogin: true,
      loginHintPassword: account.password,
      enabledAt: validity.enabledAt,
      validityYears: validity.validityYears,
      expiresAt: validity.expiresAt
    })
    await userRepository.save(user)
    console.log(`已创建用户：${account.username}`)
    return
  }

  user.password = hashedPassword
  user.realName = account.realName
  user.companyId = companyId
  user.role = account.role
  user.status = '启用'
  user.showOnLogin = true
  user.loginHintPassword = account.password
  user.enabledAt = validity.enabledAt
  user.validityYears = validity.validityYears
  user.expiresAt = validity.expiresAt
  await userRepository.save(user)
  console.log(`已校正用户：${account.username}`)
}

export const seedData = async () => {
  await AppDataSource.initialize()

  const companyRepository = AppDataSource.getRepository(Company)
  const userRepository = AppDataSource.getRepository(User)
  const warehouseRepository = AppDataSource.getRepository(Warehouse)
  const locationRepository = AppDataSource.getRepository(Location)

  let adminCompany = await companyRepository.findOne({ where: { code: PLATFORM_COMPANY_SEED.code } })
  if (!adminCompany) {
    adminCompany = companyRepository.create({ ...PLATFORM_COMPANY_SEED })
    await companyRepository.save(adminCompany)
    console.log('已创建平台运营公司')
  } else {
    Object.assign(adminCompany, PLATFORM_COMPANY_SEED)
    await companyRepository.save(adminCompany)
    console.log('已更新平台运营公司信息')
  }

  await upsertUser(userRepository, PLATFORM_ADMIN_ACCOUNT, adminCompany.id)

  let demoCompany = await companyRepository.findOne({ where: { code: DEMO_COMPANY_SEED.code } })
  if (!demoCompany) {
    demoCompany = companyRepository.create({ ...DEMO_COMPANY_SEED })
    await companyRepository.save(demoCompany)
    console.log('已创建入驻客户演示公司')
  } else {
    Object.assign(demoCompany, DEMO_COMPANY_SEED)
    await companyRepository.save(demoCompany)
    console.log('已更新入驻客户演示公司信息')
  }

  await upsertUser(userRepository, DEMO_TENANT_ACCOUNT, demoCompany.id)

  let manufacturerCompany = await companyRepository.findOne({ where: { code: MANUFACTURER_COMPANY_SEED.code } })
  if (!manufacturerCompany) {
    manufacturerCompany = companyRepository.create({ ...MANUFACTURER_COMPANY_SEED })
    await companyRepository.save(manufacturerCompany)
    console.log('已创建生产厂家演示公司')
  } else {
    Object.assign(manufacturerCompany, MANUFACTURER_COMPANY_SEED)
    await companyRepository.save(manufacturerCompany)
    console.log('已更新生产厂家演示公司信息')
  }

  await upsertUser(userRepository, MANUFACTURER_TENANT_ACCOUNT, manufacturerCompany.id)

  let manufacturerWarehouse = await warehouseRepository.findOne({
    where: { companyId: manufacturerCompany.id, code: SYSTEM_DEFAULT_WAREHOUSE_CODE }
  })
  if (!manufacturerWarehouse) {
    manufacturerWarehouse = warehouseRepository.create({
      ...buildSystemDefaultWarehouse(manufacturerCompany.id),
      address: '宁波市鄞州区生产仓储中心',
      manager: '王工',
      phone: '13900139000',
      capacity: '5000平方米'
    })
    await warehouseRepository.save(manufacturerWarehouse)
    console.log('已创建生产厂家默认仓库 ck01')
  }

  const manufacturerLocation = await locationRepository.findOne({
    where: { companyId: manufacturerCompany.id, code: 'M01-01' }
  })
  if (!manufacturerLocation) {
    await locationRepository.save(
      locationRepository.create({
        companyId: manufacturerCompany.id,
        code: 'M01-01',
        name: '成品区-01货架',
        warehouse: SYSTEM_DEFAULT_WAREHOUSE_NAME,
        warehouseCode: SYSTEM_DEFAULT_WAREHOUSE_CODE,
        area: '成品区',
        status: '启用',
        barcode: 'M010101',
        remark: '存放自产成品'
      })
    )
    console.log('已创建生产厂家演示库位')
  }

  let demoWarehouse = await warehouseRepository.findOne({
    where: { companyId: demoCompany.id, code: SYSTEM_DEFAULT_WAREHOUSE_CODE }
  })
  if (!demoWarehouse) {
    const legacyWarehouse = await warehouseRepository.findOne({
      where: { companyId: demoCompany.id, code: LEGACY_DEFAULT_WAREHOUSE_CODES[0] }
    })
    if (legacyWarehouse) {
      legacyWarehouse.code = SYSTEM_DEFAULT_WAREHOUSE_CODE
      legacyWarehouse.name = SYSTEM_DEFAULT_WAREHOUSE_NAME
      legacyWarehouse.isDefault = true
      await warehouseRepository.save(legacyWarehouse)
      demoWarehouse = legacyWarehouse
      console.log('已迁移演示仓库为系统默认 ck01')
    } else {
      demoWarehouse = warehouseRepository.create({
        ...buildSystemDefaultWarehouse(demoCompany.id),
        address: '南京市江宁区物流园A区',
        manager: '李四',
        phone: '13800138000',
        capacity: '10000平方米'
      })
      await warehouseRepository.save(demoWarehouse)
      console.log('已创建系统默认仓库 ck01')
    }
  }

  const demoLocation = await locationRepository.findOne({ where: { companyId: demoCompany.id, code: 'A01-01' } })
  if (!demoLocation) {
    const location = locationRepository.create({
      companyId: demoCompany.id,
      code: 'A01-01',
      name: 'A区-01货架-01层',
      warehouse: SYSTEM_DEFAULT_WAREHOUSE_NAME,
      warehouseCode: SYSTEM_DEFAULT_WAREHOUSE_CODE,
      area: 'A区',
      status: '启用',
      barcode: 'A010101',
      remark: '存放常用医疗器械'
    })
    await locationRepository.save(location)
    console.log('已创建演示库位')
  }

  const productRepository = AppDataSource.getRepository(Product)
  const demoProducts = [
    {
      code: 'PD001',
      name: '一次性医用口罩',
      spec: '10只/包',
      manufacturer: '北京医疗科技有限公司',
      brand: '医享',
      measureUnit: '包',
      status: '正常',
      auditStatus: '已审核'
    },
    {
      code: 'PD002',
      name: '医用防护服',
      spec: 'M/L/XL',
      manufacturer: '上海医疗器械有限公司',
      brand: '医盾',
      measureUnit: '套',
      status: '正常',
      auditStatus: '已审核'
    },
    {
      code: 'PD003',
      name: '医用手套',
      spec: '100只/盒',
      manufacturer: '广州医疗用品有限公司',
      brand: '康护',
      measureUnit: '盒',
      status: '预警',
      auditStatus: '已审核'
    }
  ]

  for (const item of demoProducts) {
    const existing = await productRepository.findOne({
      where: { companyId: demoCompany.id, code: item.code }
    })
    const payload = JSON.stringify({ ...item, companyId: demoCompany.id })
    if (!existing) {
      await productRepository.save(
        productRepository.create({
          companyId: demoCompany.id,
          code: item.code,
          payload
        })
      )
      console.log(`已创建演示商品：${item.code}`)
    } else {
      existing.payload = payload
      await productRepository.save(existing)
    }
  }

  const platformProducts = demoProducts.map(item => ({
    ...item,
    registrant: item.manufacturer
  }))

  for (const item of platformProducts) {
    const existing = await productRepository.findOne({
      where: { companyId: adminCompany.id, code: item.code }
    })
    const payload = JSON.stringify({ ...item, companyId: adminCompany.id })
    if (!existing) {
      await productRepository.save(
        productRepository.create({
          companyId: adminCompany.id,
          code: item.code,
          payload
        })
      )
      console.log(`已创建平台商品库：${item.code}`)
    } else {
      existing.payload = payload
      await productRepository.save(existing)
    }
  }

  const customerRepository = AppDataSource.getRepository(Customer)
  for (const item of DEMO_CUSTOMER_SEED) {
    const existing = await customerRepository.findOne({
      where: { companyId: demoCompany.id, code: item.code }
    })
    const payload = JSON.stringify({ ...item, companyId: demoCompany.id })
    if (!existing) {
      await customerRepository.save(
        customerRepository.create({
          companyId: demoCompany.id,
          code: item.code,
          payload
        })
      )
      console.log(`已创建演示客户：${item.code}`)
    } else {
      existing.payload = payload
      await customerRepository.save(existing)
    }
  }

  const keepCustomerCodes = new Set(DEMO_CUSTOMER_SEED.map(item => item.code))
  const staleCustomers = await customerRepository.find({ where: { companyId: demoCompany.id } })
  const toRemove = staleCustomers.filter(item => !keepCustomerCodes.has(item.code))
  if (toRemove.length > 0) {
    await customerRepository.remove(toRemove)
    console.log(`已清除 ${toRemove.length} 条废弃演示客户`)
  }

  await AppDataSource.destroy()
  console.log('种子数据初始化完成')
}

seedData().catch(console.error)
