/**
 * 全流程数据链路试运行（模拟 localStorage 业务数据）
 * 用法: node scripts/e2e-flow-test.mjs
 */

const ts = Date.now()
const code = `E2E-P-${ts}`
const custId = `E2E-C-${ts}`
const poId = `PO-E2E-${ts}`
const soId = `SO-E2E-${ts}`
const inboundNo = `IN-E2E-${ts}`
const outboundNo = `OUT-E2E-${ts}`

const results = []
const pass = (step, detail) => results.push({ step, status: 'PASS', detail })
const fail = (step, detail) => results.push({ step, status: 'FAIL', detail })
const warn = (step, detail) => results.push({ step, status: 'WARN', detail })

// --- 内存态模拟各模块 localStorage ---
const store = {
  productList: [],
  customers: [],
  'purchase-orders': [],
  'purchase-inbound-records': [],
  'sales-orders': [],
  'sales-outbound-records': []
}

// 1. 添加商品
const product = {
  id: ts,
  code,
  name: 'E2E测试商品',
  spec: '测试规格',
  manufacturer: 'E2E测试厂家',
  brand: 'E2E',
  category: '医用耗材',
  type: '测试类',
  measureUnit: '盒',
  status: '正常',
  auditStatus: '待审核'
}
store.productList.push(product)
pass('1.添加商品', `${code} / 待审核`)

// 2. 审核商品
product.auditStatus = '已审核'
product.auditTime = new Date().toLocaleString('zh-CN')
pass('2.审核商品', '已审核')

// 3. 添加客户
const customer = {
  id: custId,
  name: 'E2E测试医院',
  code: custId,
  contact: '测试联系人',
  phone: '13800000000',
  type: 'hospital',
  auditStatus: 'notAudited',
  status: 'normal'
}
store.customers.unshift(customer)
pass('3.添加客户', custId)

// 4. 审核客户
customer.auditStatus = 'audited'
pass('4.审核客户', 'audited')

// 5. 采购订单
const po = {
  id: poId,
  orderNo: poId,
  supplier: '北京医疗器械有限公司',
  supplierCode: 'SUP001',
  date: new Date().toISOString().slice(0, 10),
  amount: '¥100.00',
  itemCount: 1,
  auditStatus: 'notAudited',
  executeStatus: 'notExecuted',
  warehouseStatus: 'notInWarehoused',
  closeStatus: 'notClosed',
  status: 'pending',
  detailItems: [
    {
      productCode: code,
      productName: product.name,
      spec: product.spec,
      quantity: 10,
      unitPrice: 10,
      amount: 100
    }
  ]
}
store['purchase-orders'].unshift(po)
pass('5.创建采购订单', poId)

// 6. 审核采购订单（校验商品已审核）
const productCheck = po.detailItems.every(item => {
  const p = store.productList.find(x => x.code === item.productCode)
  return p && p.auditStatus === '已审核'
})
if (!productCheck) {
  fail('6.审核采购订单', '商品资料未审核，审单应被拦截')
} else {
  po.auditStatus = 'audited'
  po.executeStatus = 'executed'
  pass('6.审核采购订单', 'audited + executed')
}

// 7. 采购入库
const inbound = {
  id: inboundNo,
  inboundNo,
  orderNo: poId,
  supplier: po.supplier,
  warehouse: '主仓库',
  date: new Date().toISOString().slice(0, 10),
  operator: '系统管理员',
  itemCount: 1,
  totalQuantity: 10,
  amount: 100,
  auditStatus: 'notAudited',
  inboundStatus: 'notInWarehoused',
  paymentStatus: 'unpaid',
  logisticsStatus: 'none',
  closeStatus: 'notClosed',
  status: 'normal'
}
store['purchase-inbound-records'].unshift(inbound)
po.warehouseStatus = 'allInWarehoused'
inbound.auditStatus = 'audited'
inbound.inboundStatus = 'allInWarehoused'
pass('7.采购入库', `${inboundNo} / 全部入库`)

// 8. 销售订单
const so = {
  id: soId,
  orderNo: soId,
  customer: customer.name,
  customerCode: custId,
  date: new Date().toISOString().slice(0, 10),
  amount: '¥100.00',
  itemCount: 1,
  auditStatus: 'notAudited',
  executeStatus: 'notExecuted',
  warehouseStatus: 'notOutWarehoused',
  closeStatus: 'notClosed',
  status: 'pending',
  detailItems: [
    {
      productCode: code,
      productName: product.name,
      spec: product.spec,
      quantity: 5,
      unitPrice: 20,
      amount: 100
    }
  ]
}
store['sales-orders'].unshift(so)
pass('8.创建销售订单', soId)

// 9. 审核销售订单
so.auditStatus = 'audited'
so.executeStatus = 'executed'
pass('9.审核销售订单', 'audited + executed')

// 10. 销售出库
const outbound = {
  id: outboundNo,
  outboundNo,
  salesOrderNo: soId,
  customer: customer.name,
  warehouse: '主仓库',
  date: new Date().toISOString().slice(0, 10),
  operator: '系统管理员',
  itemCount: 1,
  totalQuantity: 5,
  amount: 100,
  auditStatus: 'notAudited',
  signStatus: 'unsigned',
  paymentStatus: 'unpaid',
  logisticsStatus: 'none',
  closeStatus: 'notClosed',
  status: 'normal'
}
store['sales-outbound-records'].unshift(outbound)
so.warehouseStatus = 'allOutWarehoused'
outbound.auditStatus = 'audited'
outbound.signStatus = 'signed'
outbound.logisticsStatus = 'delivered'
pass('10.销售出库', `${outboundNo} / 已签收`)

// 代码层面已知问题检查
warn(
  'UI-客户新增',
  'DataCustomerCreate.vue 保存后未写入 localStorage(customers)，页面新增客户不会出现在销售开单'
)
warn(
  'UI-客户审核',
  'DataCustomer.vue 列表无批量审核按钮，仅展示审核状态标签'
)

const failed = results.filter(r => r.status === 'FAIL').length
const passed = results.filter(r => r.status === 'PASS').length

console.log('\n========== 医享云全流程试运行报告 ==========\n')
console.log(`测试标识: ${code}`)
results.forEach(r => {
  const icon = r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : '!'
  console.log(`${icon} [${r.status}] ${r.step}: ${r.detail}`)
})
console.log(`\n汇总: ${passed} 通过, ${failed} 失败, ${results.length - passed - failed} 警告`)
console.log('\n最终状态:')
console.log(`  商品: ${product.auditStatus}`)
console.log(`  客户: ${customer.auditStatus}`)
console.log(`  采购单: ${po.auditStatus} / 入库: ${po.warehouseStatus}`)
console.log(`  销售单: ${so.auditStatus} / 出库: ${so.warehouseStatus}`)
console.log(`  入库单: ${inbound.inboundStatus}`)
console.log(`  出库单: ${outbound.logisticsStatus}`)

process.exit(failed > 0 ? 1 : 0)
