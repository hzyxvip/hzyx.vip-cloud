<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  logisticsCompanyOptions,
  logisticsCompanyMap,
  auditStatusOptions,
  warehouseInStatusOptions,
  formatStatus
} from '@/utils/statusManager'
import { activeWarehouseOptions, hydrateWarehouseOptionsFromServer } from '@/utils/warehouseSettings'
import { print, preview, type SalesReturnData, type ProductItem } from '@/utils/printService'
import { getCompanyInfo } from '@/utils/companyConfig'

const router = useRouter()

const warehouseOptions = activeWarehouseOptions

onMounted(() => {
  void hydrateWarehouseOptionsFromServer()
})

interface OrderItem {
  productCode: string
  productName: string
  spec: string
  unit: string
  originalQty: string
  shippedQty: string
  returnQty: string
  price: string
  amount: string
  returnWarehouse: string
  batchNo: string
  productionDate: string
  expiryDate: string
  bidType: string
  manufacturer: string
  registrationNo: string
  productionLicenseNo: string
  storageCondition: string
}

const returnTypeOptions = [
  { label: '销售退货', value: 'return' },
  { label: '销售换货', value: 'exchange' }
]

const returnReasonOptions = [
  { label: '质量问题', value: 'quality' },
  { label: '商品错发', value: 'wrong' },
  { label: '客户拒收', value: 'rejected' },
  { label: '滞销积压', value: 'unsalable' },
  { label: '其他原因', value: 'other' }
]

const form = ref({
  returnType: 'return',
  returnNo: '',
  originalOrderNo: '',
  customer: '',
  customerCode: '',
  warehouse: '',
  returnDate: new Date().toISOString().split('T')[0],
  contact: '',
  phone: '',
  returnReason: '',
  returnReasonRemark: '',
  remark: '',
  status: 'pending',
  auditStatus: 'notAudited',
  warehouseInStatus: 'notInWarehoused',
  logisticsCompany: '',
  logisticsNo: '',
  auditPerson: '',
  auditDate: '',
  warehouseInPerson: '',
  warehouseInDate: '',
  items: [] as OrderItem[]
})

const currentItem = ref<OrderItem>({
  productCode: '',
  productName: '',
  spec: '',
  unit: '',
  originalQty: '',
  shippedQty: '',
  returnQty: '',
  price: '',
  amount: '',
  returnWarehouse: '',
  batchNo: '',
  productionDate: '',
  expiryDate: '',
  bidType: '',
  manufacturer: '',
  registrationNo: '',
  productionLicenseNo: '',
  storageCondition: ''
})

const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + (Number(item.returnQty) * Number(item.price) || 0)
  }, 0).toFixed(2)
})

const addItem = () => {
  if (!currentItem.value.productCode) {
    ElMessage.warning('请填写商品编码')
    return
  }
  if (!currentItem.value.returnQty) {
    ElMessage.warning('请填写退货数量')
    return
  }
  if (!currentItem.value.price) {
    ElMessage.warning('请填写单价')
    return
  }
  currentItem.value.amount = (Number(currentItem.value.returnQty) * Number(currentItem.value.price)).toFixed(2)
  currentItem.value.originalQty = currentItem.value.originalQty || '0'
  currentItem.value.shippedQty = currentItem.value.shippedQty || '0'
  form.value.items.push({ ...currentItem.value })
  currentItem.value = {
    productCode: '',
    productName: '',
    spec: '',
    unit: '',
    originalQty: '',
    shippedQty: '',
    returnQty: '',
    price: '',
    amount: '',
    returnWarehouse: '',
    batchNo: '',
    productionDate: '',
    expiryDate: '',
    bidType: '',
    manufacturer: '',
    registrationNo: '',
    productionLicenseNo: '',
    storageCondition: ''
  }
}

const removeItem = (index: number) => {
  form.value.items.splice(index, 1)
}

const handleSelectOrder = () => {
  ElMessage.info('请输入原销售订单号后点击查询')
}

const handleSave = () => {
  if (!form.value.originalOrderNo) {
    ElMessage.warning('请输入原销售订单号')
    return
  }
  if (!form.value.warehouse) {
    ElMessage.warning('请选择退货仓库')
    return
  }
  if (form.value.items.length === 0) {
    ElMessage.warning('请添加退货商品')
    return
  }
  
  const returnData = {
    ...form.value,
    returnNo: form.value.returnNo || `SR${Date.now()}`,
    totalAmount: totalAmount.value,
    itemCount: form.value.items.length,
    createDate: form.value.returnDate,
    creator: '当前用户'
  }
  
  const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
  const existingIndex = existingRecords.findIndex((r: any) => r.returnNo === returnData.returnNo)
  if (existingIndex > -1) {
    existingRecords[existingIndex] = returnData
  } else {
    existingRecords.push(returnData)
  }
  localStorage.setItem('salesReturnRecords', JSON.stringify(existingRecords))
  
  ElMessage.success('销售退换单保存成功')
}

const handleAudit = () => {
  if (form.value.items.length === 0) {
    ElMessage.warning('请添加退货商品')
    return
  }
  
  ElMessageBox.confirm('确定审核通过此退换单吗？', '审核确认', {
    confirmButtonText: '确认审核',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    form.value.auditStatus = 'audited'
    form.value.auditPerson = '当前用户'
    form.value.auditDate = new Date().toISOString().split('T')[0]
    form.value.status = 'approved'
    
    const returnData = {
      ...form.value,
      returnNo: form.value.returnNo || `SR${Date.now()}`,
      totalAmount: totalAmount.value,
      itemCount: form.value.items.length,
      createDate: form.value.returnDate,
      creator: '当前用户'
    }
    
    const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
    const existingIndex = existingRecords.findIndex((r: any) => r.returnNo === returnData.returnNo)
    if (existingIndex > -1) {
      existingRecords[existingIndex] = returnData
    } else {
      existingRecords.push(returnData)
    }
    localStorage.setItem('salesReturnRecords', JSON.stringify(existingRecords))
    
    ElMessage.success('审核通过')
  }).catch(() => {
    ElMessage.info('已取消审核')
  })
}

const handleReject = () => {
  ElMessageBox.prompt('请输入驳回原因', '驳回确认', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入驳回原因'
  }).then(({ value }) => {
    if (!value.trim()) {
      ElMessage.warning('请输入驳回原因')
      return
    }
    form.value.auditStatus = 'rejected'
    form.value.auditPerson = '当前用户'
    form.value.auditDate = new Date().toISOString().split('T')[0]
    form.value.status = 'rejected'
    
    ElMessage.success('已驳回')
  }).catch(() => {
    ElMessage.info('已取消驳回')
  })
}

const handleWarehouseIn = () => {
  if (form.value.auditStatus !== 'audited') {
    ElMessage.warning('请先审核通过')
    return
  }
  
  ElMessageBox.confirm('确定确认入库吗？', '入库确认', {
    confirmButtonText: '确认入库',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    form.value.warehouseInStatus = 'allInWarehoused'
    form.value.warehouseInPerson = '当前用户'
    form.value.warehouseInDate = new Date().toISOString().split('T')[0]
    form.value.status = 'warehoused'
    
    const returnData = {
      ...form.value,
      returnNo: form.value.returnNo || `SR${Date.now()}`,
      totalAmount: totalAmount.value,
      itemCount: form.value.items.length,
      createDate: form.value.returnDate,
      creator: '当前用户'
    }
    
    const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
    const existingIndex = existingRecords.findIndex((r: any) => r.returnNo === returnData.returnNo)
    if (existingIndex > -1) {
      existingRecords[existingIndex] = returnData
    } else {
      existingRecords.push(returnData)
    }
    localStorage.setItem('salesReturnRecords', JSON.stringify(existingRecords))
    
    ElMessage.success('入库成功')
  }).catch(() => {
    ElMessage.info('已取消入库')
  })
}

const handleCancel = () => {
  router.push('/sales/return-record')
}

const getLogisticsLabel = (value: string) => {
  return logisticsCompanyMap[value] || value
}

const getReturnReasonLabel = (value: string) => {
  const option = returnReasonOptions.find(o => o.value === value)
  return option ? option.label : value
}

const handlePrint = () => {
  const company = getCompanyInfo()
  const printData: SalesReturnData = {
    companyName: company.name,
    companyAddress: company.address,
    companyPhone: company.phone,
    returnDate: form.value.returnDate,
    buyerName: form.value.customer,
    buyerAddress: '',
    buyerPhone: form.value.phone,
    documentNo: form.value.returnNo || 'SR-' + Date.now(),
    returnType: form.value.returnType,
    returnReason: getReturnReasonLabel(form.value.returnReason) + (form.value.returnReasonRemark ? ' - ' + form.value.returnReasonRemark : ''),
    items: form.value.items.map(item => ({
      productCode: item.productCode,
      bidType: item.bidType,
      productName: item.productName,
      spec: item.spec,
      manufacturer: item.manufacturer,
      unit: item.unit,
      quantity: Number(item.returnQty),
      unitPrice: Number(item.price),
      amount: Number(item.amount),
      batchNo: item.batchNo,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo,
      productionLicenseNo: item.productionLicenseNo,
      storageCondition: item.storageCondition
    })),
    totalAmount: Number(totalAmount.value),
    logisticsCompany: getLogisticsLabel(form.value.logisticsCompany),
    logisticsNo: form.value.logisticsNo
  }
  
  try {
    print('salesReturn', printData)
  } catch (error) {
    ElMessage.error('打印失败：' + (error as Error).message)
  }
}

const handlePrintPreview = () => {
  const company = getCompanyInfo()
  const printData: SalesReturnData = {
    companyName: company.name,
    companyAddress: company.address,
    companyPhone: company.phone,
    returnDate: form.value.returnDate,
    buyerName: form.value.customer,
    buyerAddress: '',
    buyerPhone: form.value.phone,
    documentNo: form.value.returnNo || 'SR-' + Date.now(),
    returnType: form.value.returnType,
    returnReason: getReturnReasonLabel(form.value.returnReason) + (form.value.returnReasonRemark ? ' - ' + form.value.returnReasonRemark : ''),
    items: form.value.items.map(item => ({
      productCode: item.productCode,
      bidType: item.bidType,
      productName: item.productName,
      spec: item.spec,
      manufacturer: item.manufacturer,
      unit: item.unit,
      quantity: Number(item.returnQty),
      unitPrice: Number(item.price),
      amount: Number(item.amount),
      batchNo: item.batchNo,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo,
      productionLicenseNo: item.productionLicenseNo,
      storageCondition: item.storageCondition
    })),
    totalAmount: Number(totalAmount.value),
    logisticsCompany: getLogisticsLabel(form.value.logisticsCompany),
    logisticsNo: form.value.logisticsNo
  }
  
  try {
    preview('salesReturn', printData)
  } catch (error) {
    ElMessage.error('预览失败：' + (error as Error).message)
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>{{ form.returnType === 'return' ? '销售退货单' : '销售换货单' }}</h1>
      <div class="header-buttons">
        <el-button @click="handleCancel">取消</el-button>
        <el-button @click="handleSave">保存</el-button>
        <el-button v-if="form.auditStatus === 'notAudited'" type="warning" @click="handleReject">驳回</el-button>
        <el-button v-if="form.auditStatus === 'notAudited'" type="primary" @click="handleAudit">审核通过</el-button>
        <el-button v-if="form.auditStatus === 'audited' && form.warehouseInStatus !== 'allInWarehoused'" type="success" @click="handleWarehouseIn">确认入库</el-button>
        <el-button icon="ZoomIn" @click="handlePrintPreview">预览</el-button>
        <el-button icon="Printer" @click="handlePrint">打印</el-button>
      </div>
    </div>
    
    <div class="form-card">
      <div class="form-section">
        <h3>基本信息</h3>
        <div class="form-group">
          <div class="form-row">
            <div class="form-item">
              <el-form-item label="单据类型">
                <el-select v-model="form.returnType" placeholder="请选择" style="width: 150px;">
                  <el-option v-for="item in returnTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="单据编号">
                <el-input v-model="form.returnNo" placeholder="系统自动生成" disabled style="width: 180px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="退货日期">
                <el-date-picker v-model="form.returnDate" type="date" placeholder="选择日期" style="width: 150px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="审核状态">
                <el-tag :type="formatStatus(form.auditStatus, auditStatusOptions).type">
                  {{ formatStatus(form.auditStatus, auditStatusOptions).label }}
                </el-tag>
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="入库状态">
                <el-tag :type="formatStatus(form.warehouseInStatus, warehouseInStatusOptions).type">
                  {{ formatStatus(form.warehouseInStatus, warehouseInStatusOptions).label }}
                </el-tag>
              </el-form-item>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <el-form-item label="原订单号">
                <el-input v-model="form.originalOrderNo" placeholder="请输入原销售订单号" style="width: 180px;">
                  <template #append>
                    <el-button icon="Search" @click="handleSelectOrder" />
                  </template>
                </el-input>
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="客户">
                <el-input v-model="form.customer" placeholder="自动获取" disabled style="width: 180px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="客户编码">
                <el-input v-model="form.customerCode" placeholder="自动获取" disabled style="width: 150px;" />
              </el-form-item>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-item">
              <el-form-item label="退货仓库">
                <el-select v-model="form.warehouse" placeholder="请选择仓库" style="width: 180px;">
                  <el-option v-for="item in warehouseOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="联系人">
                <el-input v-model="form.contact" placeholder="请输入联系人" style="width: 150px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="联系电话">
                <el-input v-model="form.phone" placeholder="请输入电话" style="width: 180px;" />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>退货原因</h3>
        <div class="form-group">
          <div class="form-row">
            <div class="form-item">
              <el-form-item label="退货原因">
                <el-select v-model="form.returnReason" placeholder="请选择退货原因" style="width: 200px;">
                  <el-option v-for="item in returnReasonOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </div>
            <div class="form-item" style="flex: 1;">
              <el-form-item label="原因说明">
                <el-input v-model="form.returnReasonRemark" placeholder="请输入详细原因" />
              </el-form-item>
            </div>
          </div>
          <div class="form-row">
            <div class="form-item" style="flex: 1;">
              <el-form-item label="备注">
                <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>退货商品明细</h3>
        <div class="items-header">
          <div class="add-item-form">
            <el-input v-model="currentItem.productCode" placeholder="商品编码" style="width: 100px;" />
            <el-input v-model="currentItem.productName" placeholder="商品名称" style="width: 150px;" />
            <el-input v-model="currentItem.spec" placeholder="规格" style="width: 100px;" />
            <el-input v-model="currentItem.unit" placeholder="单位" style="width: 60px;" />
            <el-input v-model="currentItem.originalQty" type="number" placeholder="原数量" style="width: 70px;" />
            <el-input v-model="currentItem.shippedQty" type="number" placeholder="已发货" style="width: 70px;" />
            <el-input v-model="currentItem.returnQty" type="number" placeholder="退货数量" style="width: 80px;" />
            <el-input v-model="currentItem.price" type="number" placeholder="单价" style="width: 80px;" />
            <el-input v-model="currentItem.batchNo" placeholder="批次号" style="width: 100px;" />
            <el-date-picker v-model="currentItem.productionDate" type="date" placeholder="生产日期" style="width: 120px;" />
            <el-date-picker v-model="currentItem.expiryDate" type="date" placeholder="有效期" style="width: 120px;" />
            <el-select v-model="currentItem.returnWarehouse" placeholder="退货仓库" style="width: 100px;">
              <el-option v-for="item in warehouseOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button type="primary" icon="Plus" @click="addItem">添加</el-button>
          </div>
        </div>
        
        <el-table :data="form.items" border>
          <el-table-column prop="productCode" label="商品编码" width="100" />
          <el-table-column prop="productName" label="商品名称" width="150" />
          <el-table-column prop="spec" label="规格型号" width="100" />
          <el-table-column prop="unit" label="单位" width="60" />
          <el-table-column prop="originalQty" label="原订单数量" width="100" align="right" />
          <el-table-column prop="shippedQty" label="已发货数量" width="100" align="right" />
          <el-table-column prop="returnQty" label="退货数量" width="100" align="right" />
          <el-table-column prop="price" label="单价" width="80" align="right" />
          <el-table-column prop="amount" label="金额" width="100" align="right" />
          <el-table-column prop="batchNo" label="批次号" width="100" />
          <el-table-column prop="productionDate" label="生产日期" width="110" />
          <el-table-column prop="expiryDate" label="有效期" width="110" />
          <el-table-column prop="returnWarehouse" label="退货仓库" width="100" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ $index }">
              <el-button type="danger" size="small" text @click="removeItem($index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="amount-summary">
          <span class="label">退货总金额：</span>
          <span class="amount">¥{{ totalAmount }}</span>
        </div>
      </div>
      
      <div class="form-section">
        <h3>物流信息</h3>
        <div class="form-group">
          <div class="form-row">
            <div class="form-item">
              <el-form-item label="物流公司">
                <el-select v-model="form.logisticsCompany" placeholder="请选择物流公司" style="width: 180px;">
                  <el-option v-for="item in logisticsCompanyOptions" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="物流单号">
                <el-input v-model="form.logisticsNo" placeholder="请输入物流单号" style="width: 200px;" />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>审核记录</h3>
        <div class="form-group">
          <div class="form-row">
            <div class="form-item">
              <el-form-item label="审核人">
                <el-input v-model="form.auditPerson" disabled style="width: 150px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="审核日期">
                <el-input v-model="form.auditDate" disabled style="width: 150px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="入库人">
                <el-input v-model="form.warehouseInPerson" disabled style="width: 150px;" />
              </el-form-item>
            </div>
            <div class="form-item">
              <el-form-item label="入库日期">
                <el-input v-model="form.warehouseInDate" disabled style="width: 150px;" />
              </el-form-item>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  margin-bottom: 20px; 
  h1 { font-size: 22px; font-weight: 600; margin: 0; color: #333; } 
  .header-buttons { display: flex; gap: 12px; } 
}
.form-card { 
  background: #fff; 
  border-radius: 8px; 
  padding: 24px; 
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); 
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F2F4F7;
  
  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
  
  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #344054;
    margin: 0 0 16px;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row { 
  display: flex; 
  gap: 24px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.form-item {
  display: flex;
  align-items: flex-start;
  
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
  
  :deep(.el-form-item__label) {
    padding-bottom: 4px;
    line-height: 20px;
    font-size: 13px;
    color: #667085;
    white-space: nowrap;
  }
  
  :deep(.el-form-item__content) {
    line-height: 28px;
  }
}

.items-header {
  margin-bottom: 16px;
  
  .add-item-form {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
}

.amount-summary {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #F2F4F7;
  
  .label {
    font-size: 14px;
    color: #667085;
  }
  
  .amount {
    font-size: 20px;
    font-weight: 600;
    color: #F53F2D;
  }
}

:deep(.el-table) {
  .el-table__header-wrapper th {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
  }
}
</style>
