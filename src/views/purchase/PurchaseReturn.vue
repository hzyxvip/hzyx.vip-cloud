<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { print, preview } from '@/utils/printService'

const router = useRouter()

interface OrderItem {
  id: number
  productCode: string
  productName: string
  spec: string
  unit: string
  quantity: number
  price: number
  amount: number
  batchNo: string
  productionDate: string
  expiryDate: string
  registrationNo: string
  productionLicenseNo: string
  storageCondition: string
}

const form = reactive({
  returnNo: '',
  inboundOrderNo: '',
  supplier: '',
  supplierCode: '',
  returnDate: new Date().toISOString().slice(0, 10),
  operator: '',
  returnReason: '',
  returnReasonRemark: '',
  logisticsCompany: '',
  logisticsNo: '',
  remark: ''
})

const items = ref<OrderItem[]>([])

// 物流公司选项
const logisticsCompanies = [
  { label: '顺丰速运', value: 'sf' },
  { label: '圆通速递', value: 'yt' },
  { label: '中通快递', value: 'zt' },
  { label: '申通快递', value: 'st' },
  { label: '韵达快递', value: 'yd' },
  { label: 'EMS', value: 'ems' },
  { label: '京东物流', value: 'jd' },
  { label: '德邦物流', value: 'db' }
]

// 退货原因选项
const returnReasonOptions = [
  { label: '质量问题', value: 'quality' },
  { label: '包装破损', value: 'damaged' },
  { label: '型号错误', value: 'wrongModel' },
  { label: '数量不符', value: 'quantityMismatch' },
  { label: '滞销退货', value: 'unsalable' },
  { label: '其他', value: 'other' }
]

// 供应商列表
const suppliers = [
  { label: '北京医疗器械有限公司', value: '北京医疗器械有限公司', code: 'SP001' },
  { label: '上海医疗科技有限公司', value: '上海医疗科技有限公司', code: 'SP002' },
  { label: '广州医疗器械厂', value: '广州医疗器械厂', code: 'SP003' }
]

// 商品列表（用于模拟选择）
const products = [
  { code: 'PD001', name: '一次性注射器', spec: '5ml', unit: '支' },
  { code: 'PD002', name: '医用口罩', spec: '一次性', unit: '个' },
  { code: 'PD003', name: '手术手套', spec: '无菌', unit: '副' },
  { code: 'PD004', name: '体温计', spec: '电子', unit: '支' }
]

// 入库单选项
const inboundOrderOptions = [
  { label: 'PIN202606180001 - 北京医疗器械有限公司', value: 'PIN202606180001', supplier: '北京医疗器械有限公司', supplierCode: 'SP001' },
  { label: 'PIN202606170002 - 上海医疗科技有限公司', value: 'PIN202606170002', supplier: '上海医疗科技有限公司', supplierCode: 'SP002' },
  { label: 'PIN202606160003 - 广州医疗器械厂', value: 'PIN202606160003', supplier: '广州医疗器械厂', supplierCode: 'SP003' }
]

const totalAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + item.amount, 0)
})

const getLogisticsLabel = (value: string) => {
  const option = logisticsCompanies.find(o => o.value === value)
  return option ? option.label : value
}

const getReturnReasonLabel = (value: string) => {
  const option = returnReasonOptions.find(o => o.value === value)
  return option ? option.label : value
}

const handleInboundOrderChange = (val: string) => {
  const order = inboundOrderOptions.find(o => o.value === val)
  if (order) {
    form.supplier = order.supplier
    form.supplierCode = order.supplierCode
    
    // 模拟从入库单获取商品数据
    if (val === 'PIN202606180001') {
      items.value = [
        { id: 1, productCode: 'PD001', productName: '一次性注射器', spec: '5ml', unit: '支', quantity: 20, price: 1.50, amount: 30.00, batchNo: '20260601', productionDate: '2024-06-01', expiryDate: '2027-06-01', registrationNo: '桂械注准20202140001', productionLicenseNo: '桂食药监械生产许20180001号', storageCondition: '常温干燥' },
        { id: 2, productCode: 'PD002', productName: '医用口罩', spec: '一次性', unit: '个', quantity: 50, price: 0.80, amount: 40.00, batchNo: '20260602', productionDate: '2024-06-02', expiryDate: '2027-06-02', registrationNo: '桂械注准20202140002', productionLicenseNo: '桂食药监械生产许20180001号', storageCondition: '常温干燥' }
      ]
    } else if (val === 'PIN202606170002') {
      items.value = [
        { id: 1, productCode: 'PD003', productName: '手术手套', spec: '无菌', unit: '副', quantity: 30, price: 2.00, amount: 60.00, batchNo: '20260603', productionDate: '2024-06-03', expiryDate: '2027-06-03', registrationNo: '桂械注准20202140003', productionLicenseNo: '桂食药监械生产许20180001号', storageCondition: '常温干燥' }
      ]
    } else {
      items.value = []
    }
  }
}

const addItem = () => {
  items.value.push({
    id: Date.now(),
    productCode: '',
    productName: '',
    spec: '',
    unit: '',
    quantity: 0,
    price: 0,
    amount: 0,
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    registrationNo: '',
    productionLicenseNo: '',
    storageCondition: ''
  })
}

const deleteItem = (index: number) => {
  if (items.value.length > 1) {
    items.value.splice(index, 1)
  } else {
    ElMessage.warning('至少保留一行明细')
  }
}

const calculateAmount = (item: OrderItem) => {
  item.amount = item.quantity * item.price
}

const handleSave = () => {
  if (!form.inboundOrderNo) {
    ElMessage.warning('请选择原入库单')
    return
  }
  if (items.value.length === 0) {
    ElMessage.warning('请添加退货商品')
    return
  }
  ElMessage.success('采购退货单保存成功')
}

const handleSubmit = () => {
  if (!form.inboundOrderNo) {
    ElMessage.warning('请选择原入库单')
    return
  }
  if (!form.returnReason) {
    ElMessage.warning('请选择退货原因')
    return
  }
  if (items.value.length === 0) {
    ElMessage.warning('请添加退货商品')
    return
  }
  
  // 保存到本地存储
  const returnOrder = {
    ...form,
    returnNo: form.returnNo || `PR${Date.now()}`,
    items: items.value,
    totalAmount: totalAmount.value,
    createTime: new Date().toISOString()
  }
  
  const stored = localStorage.getItem('purchaseReturnList')
  const list = stored ? JSON.parse(stored) : []
  list.unshift(returnOrder)
  localStorage.setItem('purchaseReturnList', JSON.stringify(list))
  
  ElMessage.success('采购退货单提交成功')
}

const handleCancel = () => {
  router.push('/purchase/return-record')
}

// 打印功能
const handlePrint = () => {
  if (items.value.length === 0) {
    ElMessage.warning('请先添加退货商品')
    return
  }
  
  const printData = {
    returnDate: form.returnDate,
    supplierName: form.supplier,
    supplierAddress: '',
    supplierPhone: '',
    documentNo: form.returnNo || `PR${Date.now()}`,
    returnReason: getReturnReasonLabel(form.returnReason) + (form.returnReasonRemark ? ' - ' + form.returnReasonRemark : ''),
    items: items.value.map(item => ({
      productCode: item.productCode,
      bidType: '',
      productName: item.productName,
      spec: item.spec,
      manufacturer: '',
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.price,
      amount: item.amount,
      batchNo: item.batchNo,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo,
      productionLicenseNo: item.productionLicenseNo,
      storageCondition: item.storageCondition
    })),
    totalAmount: totalAmount.value,
    logisticsCompany: getLogisticsLabel(form.logisticsCompany),
    logisticsNo: form.logisticsNo
  }
  
  try {
    print('purchaseReturn', printData)
  } catch (error) {
    ElMessage.error('打印失败：' + (error as Error).message)
  }
}

const handlePrintPreview = () => {
  if (items.value.length === 0) {
    ElMessage.warning('请先添加退货商品')
    return
  }
  
  const printData = {
    returnDate: form.returnDate,
    supplierName: form.supplier,
    supplierAddress: '',
    supplierPhone: '',
    documentNo: form.returnNo || `PR${Date.now()}`,
    returnReason: getReturnReasonLabel(form.returnReason) + (form.returnReasonRemark ? ' - ' + form.returnReasonRemark : ''),
    items: items.value.map(item => ({
      productCode: item.productCode,
      bidType: '',
      productName: item.productName,
      spec: item.spec,
      manufacturer: '',
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.price,
      amount: item.amount,
      batchNo: item.batchNo,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo,
      productionLicenseNo: item.productionLicenseNo,
      storageCondition: item.storageCondition
    })),
    totalAmount: totalAmount.value,
    logisticsCompany: getLogisticsLabel(form.logisticsCompany),
    logisticsNo: form.logisticsNo
  }
  
  try {
    preview('purchaseReturn', printData)
  } catch (error) {
    ElMessage.error('预览失败：' + (error as Error).message)
  }
}

// 初始化退货单号
form.returnNo = `PR${Date.now()}`
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>采购退货单</h1>
        <div class="breadcrumb">首页 / 采购管理 / 采购退货 / 新增退货单</div>
      </div>
      <div class="header-buttons">
        <el-button @click="handleCancel">取消</el-button>
        <el-button @click="handleSave">保存</el-button>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
        <el-button icon="ZoomIn" @click="handlePrintPreview">预览</el-button>
        <el-button icon="Printer" @click="handlePrint">打印</el-button>
      </div>
    </div>
    
    <div class="form-card">
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>基本信息</span>
        </div>
        <div class="form-row">
          <el-form-item label="退货单号" required>
            <el-input v-model="form.returnNo" placeholder="自动生成" disabled />
          </el-form-item>
          <el-form-item label="原入库单" required>
            <el-select v-model="form.inboundOrderNo" placeholder="请选择原入库单" style="width: 100%;" @change="handleInboundOrderChange">
              <el-option v-for="opt in inboundOrderOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="供应商" required>
            <el-select v-model="form.supplier" placeholder="请选择供应商" style="width: 100%;">
              <el-option v-for="s in suppliers" :key="s.code" :label="s.label" :value="s.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="供应商编码">
            <el-input v-model="form.supplierCode" placeholder="自动填充" disabled />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="退货日期" required>
            <el-date-picker v-model="form.returnDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%;" />
          </el-form-item>
          <el-form-item label="操作员">
            <el-input v-model="form.operator" placeholder="请输入操作员" />
          </el-form-item>
          <el-form-item label="退货原因" required>
            <el-select v-model="form.returnReason" placeholder="请选择" style="width: 100%;">
              <el-option v-for="opt in returnReasonOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="原因说明">
            <el-input v-model="form.returnReasonRemark" placeholder="请输入详细说明" />
          </el-form-item>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>物流信息</span>
        </div>
        <div class="form-row">
          <el-form-item label="物流公司">
            <el-select v-model="form.logisticsCompany" placeholder="请选择" style="width: 100%;">
              <el-option v-for="opt in logisticsCompanies" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="物流单号">
            <el-input v-model="form.logisticsNo" placeholder="请输入物流单号" />
          </el-form-item>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>退货商品明细</span>
          <span class="section-sub">明细内容</span>
        </div>
        <div class="table-section">
          <div class="table-header">
            <span>退货明细</span>
            <el-button type="primary" size="small" @click="addItem">添加商品</el-button>
          </div>
          <el-table :data="items" border style="width: 100%;">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column label="商品编码" width="120">
              <template #default="scope">
                <el-input v-model="scope.row.productCode" placeholder="编码" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="商品名称" min-width="150">
              <template #default="scope">
                <el-input v-model="scope.row.productName" placeholder="名称" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="规格" width="100">
              <template #default="scope">
                <el-input v-model="scope.row.spec" placeholder="规格" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="单位" width="60">
              <template #default="scope">
                <el-input v-model="scope.row.unit" placeholder="单位" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="退货数量" width="100">
              <template #default="scope">
                <el-input-number v-model="scope.row.quantity" :min="1" size="small" style="width: 100%;" @change="calculateAmount(scope.row)" />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100">
              <template #default="scope">
                <el-input-number v-model="scope.row.price" :precision="2" :min="0" size="small" style="width: 100%;" @change="calculateAmount(scope.row)" />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="100">
              <template #default="scope">
                <span style="color: #F53F2D;">¥{{ scope.row.amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="批号" width="100">
              <template #default="scope">
                <el-input v-model="scope.row.batchNo" placeholder="批号" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="失效日期" width="120">
              <template #default="scope">
                <el-input v-model="scope.row.expiryDate" placeholder="日期" size="small" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="scope">
                <el-button type="danger" size="small" @click="deleteItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <div class="amount-summary">
          <div class="summary-item">
            <span class="label">退货总数量：</span>
            <span class="value">{{ items.reduce((sum, item) => sum + item.quantity, 0) }}</span>
          </div>
          <div class="summary-item total">
            <span class="label">退货总金额：</span>
            <span class="value">¥{{ totalAmount.toFixed(2) }}</span>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>备注信息</span>
        </div>
        <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .page-info {
    h1 {
      font-size: 22px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
    }
    
    .breadcrumb {
      font-size: 13px;
      color: #667085;
    }
  }
  
  .header-buttons {
    display: flex;
    gap: 12px;
  }
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.form-section {
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #00bfa5;
    
    .section-icon {
      color: #00bfa5;
      font-size: 14px;
    }
    
    span:first-of-type {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .section-sub {
      font-size: 13px;
      color: #667085;
      font-weight: normal;
      margin-left: 8px;
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.table-section {
  margin-top: 16px;
  
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    
    span {
      font-size: 14px;
      font-weight: 500;
      color: #333;
    }
  }
}

.amount-summary {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 32px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E4E7ED;
  
  .summary-item {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .label {
      font-size: 14px;
      color: #667085;
    }
    
    .value {
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }
    
    &.total {
      .value {
        font-size: 18px;
        font-weight: 700;
        color: #F53F2D;
      }
    }
  }
}

:deep(.el-form-item) {
  margin-bottom: 0;
}

:deep(.el-table) {
  .el-table__header-wrapper th {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
  }
}
</style>
