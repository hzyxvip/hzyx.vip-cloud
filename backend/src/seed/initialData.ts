import bcrypt from 'bcryptjs'
import { AppDataSource } from '../config/database'
import { Company } from '../entities/Company'
import { User } from '../entities/User'
import { Warehouse } from '../entities/Warehouse'
import { Location } from '../entities/Location'
import {
  DEMO_COMPANY_SEED,
  DEMO_TENANT_ACCOUNT,
  PLATFORM_ADMIN_ACCOUNT,
  PLATFORM_COMPANY_SEED
} from '../constants/loginAccounts'

async function upsertUser(
  userRepository: ReturnType<typeof AppDataSource.getRepository<User>>,
  account: typeof PLATFORM_ADMIN_ACCOUNT | typeof DEMO_TENANT_ACCOUNT,
  companyId: number
) {
  const hashedPassword = await bcrypt.hash(account.password, 10)
  let user = await userRepository.findOne({ where: { username: account.username } })

  if (!user) {
    user = userRepository.create({
      username: account.username,
      password: hashedPassword,
      realName: account.realName,
      companyId,
      role: account.role,
      status: '启用'
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

  const demoWarehouse = await warehouseRepository.findOne({ where: { companyId: demoCompany.id, code: 'WH001' } })
  if (!demoWarehouse) {
    const warehouse = warehouseRepository.create({
      companyId: demoCompany.id,
      code: 'WH001',
      name: '主仓库',
      type: 'normal',
      pricingMethod: 'average',
      address: '南京市江宁区物流园A区',
      manager: '李四',
      phone: '13800138000',
      status: '启用',
      allowNegativeStock: false,
      isDefault: true,
      manageBatch: true,
      manageSerialNo: false,
      manageExpiry: true,
      barcodeEnabled: true,
      capacity: '10000平方米'
    })
    await warehouseRepository.save(warehouse)
    console.log('已创建演示仓库')
  }

  const demoLocation = await locationRepository.findOne({ where: { companyId: demoCompany.id, code: 'A01-01' } })
  if (!demoLocation) {
    const location = locationRepository.create({
      companyId: demoCompany.id,
      code: 'A01-01',
      name: 'A区-01货架-01层',
      warehouse: '主仓库',
      warehouseCode: 'WH001',
      area: 'A区',
      status: '启用',
      barcode: 'A010101',
      remark: '存放常用医疗器械'
    })
    await locationRepository.save(location)
    console.log('已创建演示库位')
  }

  await AppDataSource.destroy()
  console.log('种子数据初始化完成')
}

seedData().catch(console.error)
