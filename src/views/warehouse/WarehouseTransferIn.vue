<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { activeWarehouseOptions, hydrateWarehouseOptionsFromServer } from '@/utils/warehouseSettings'

const router = useRouter()
const warehouseOptions = activeWarehouseOptions

const defaultItems = [
  { id: 1, fromWarehouse: '', toWarehouse: '', productCode: '', productName: '', spec: '', batchNo: '', quantity: 0, unit: '', price: 0, amount: 0, remark: '' }
]

const form = reactive({
  documentNo: '',
  date: new Date().toISOString().slice(0, 10),
  fromWarehouse: '',
  toWarehouse: '',
  fromDept: '',
  toDept: '',
  outType: '',
  operator: '',
  deliveryMethod: '',
  remark: ''
})

const items = ref([...defaultItems])

const outTypeOptions = [
  { label: '正常调拨', value: 'normal' },
  { label: '紧急调拨', value: 'urgent' },
  { label: '退货调拨', value: 'return' }
]

const deliveryMethodOptions = [
  { label: '自提', value: 'self' },
  { label: '送货上门', value: 'delivery' },
  { label: '物流配送', value: 'logistics' }
]

const totalAmount = () => {
  return items.value.reduce((sum, item) => sum + (item.quantity * item.price), 0)
}

const totalQuantity = () => {
  return items.value.reduce((sum, item) => sum + item.quantity, 0)
}

const addItem = () => {
  items.value.push({
    id: Date.now(),
    fromWarehouse: '',
    toWarehouse: '',
    productCode: '',
    productName: '',
    spec: '',
    batchNo: '',
    quantity: 0,
    unit: '',
    price: 0,
    amount: 0,
    remark: ''
  })
}

const deleteItem = (index: number) => {
  if (items.value.length > 1) {
    items.value.splice(index, 1)
  } else {
    ElMessage.warning('至少保留一行明细')
  }
}

const handleProductSelect = (index: number) => {
  ElMessage.info('请在商品资料中选择商品')
}

const handleSave = () => {
  if (!form.fromWarehouse) {
    ElMessage.warning('请选择调出仓库')
    return
  }
  if (!form.toWarehouse) {
    ElMessage.warning('请选择调入仓库')
    return
  }
  
  const validItems = items.value.filter(item => item.productName && item.quantity > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一行有效商品明细')
    return
  }
  
  if (!form.documentNo) {
    form.documentNo = `TRIN${Date.now()}`
  }
  
  const transferOrder = {
    id: Date.now(),
    documentNo: form.documentNo,
    date: form.date,
    fromWarehouse: form.fromWarehouse,
    toWarehouse: form.toWarehouse,
    fromDept: form.fromDept,
    toDept: form.toDept,
    outType: form.outType,
    outTypeName: outTypeOptions.find(t => t.value === form.outType)?.label || '',
    operator: form.operator || '系统操作员',
    deliveryMethod: form.deliveryMethod,
    deliveryMethodName: deliveryMethodOptions.find(d => d.value === form.deliveryMethod)?.label || '',
    remark: form.remark,
    items: validItems,
    totalAmount: totalAmount(),
    totalQuantity: totalQuantity(),
    status: 'pending',
    createTime: new Date().toLocaleString('zh-CN')
  }
  
  const stored = localStorage.getItem('transferInList')
  const list = stored ? JSON.parse(stored) : []
  list.unshift(transferOrder)
  localStorage.setItem('transferInList', JSON.stringify(list))
  
  ElMessage.success('调拨入库单保存成功')
}

const handleSaveAndNew = () => {
  handleSave()
  form.documentNo = `TRIN${Date.now()}`
  form.fromWarehouse = ''
  form.toWarehouse = ''
  form.fromDept = ''
  form.toDept = ''
  form.outType = ''
  form.operator = ''
  form.deliveryMethod = ''
  form.remark = ''
  items.value = [{ ...defaultItems[0], id: Date.now() }]
}

const handleSubmit = () => {
  handleSave()
  router.push('/warehouse/inout')
}

const handleCancel = () => {
  router.back()
}

onMounted(() => {
  void hydrateWarehouseOptionsFromServer()
  form.documentNo = `TRIN${Date.now()}`
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleCancel" icon="ArrowLeft">返回</el-button>
        <h1>调拨入库单</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleSave">保存</el-button>
        <el-button @click="handleSaveAndNew">保存并新增</el-button>
        <el-button type="primary" @click="handleSubmit">审核</el-button>
        <el-button icon="Printer">打印</el-button>
        <el-button icon="Download">导出</el-button>
      </div>
    </div>
    
    <div class="form-card">
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>基本信息</span>
        </div>
        <div class="form-row">
          <el-form-item label="单据编号" required>
            <el-input v-model="form.documentNo" placeholder="系统自动生成" disabled />
          </el-form-item>
          <el-form-item label="单据日期" required>
            <el-date-picker 
              v-model="form.date" 
              type="date" 
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%;"
            />
          </el-form-item>
          <el-form-item label="调出部门">
            <el-select v-model="form.fromDept" placeholder="请选择调出部门" style="width: 100%;">
              <el-option label="销售部" value="sales" />
              <el-option label="采购部" value="purchase" />
              <el-option label="生产部" value="production" />
            </el-select>
          </el-form-item>
          <el-form-item label="调入部门">
            <el-select v-model="form.toDept" placeholder="请选择调入部门" style="width: 100%;">
              <el-option label="销售部" value="sales" />
              <el-option label="采购部" value="purchase" />
              <el-option label="生产部" value="production" />
            </el-select>
          </el-form-item>
          <el-form-item label="出库类型">
            <el-select v-model="form.outType" placeholder="请选择类型" style="width: 100%;">
              <el-option 
                v-for="opt in outTypeOptions" 
                :key="opt.value" 
                :label="opt.label" 
                :value="opt.value" 
              />
            </el-select>
          </el-form-item>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>商品信息</span>
          <span class="section-sub">明细内容</span>
        </div>
        <div class="table-section">
          <div class="table-header">
            <span>调拨明细</span>
            <el-button type="primary" size="small" @click="addItem">添加商品</el-button>
          </div>
          <el-table :data="items" border style="width: 100%;">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column label="调出仓库" width="120">
              <template #default="scope">
                <el-select v-model="scope.row.fromWarehouse" placeholder="选择仓库" style="width: 100%;">
                  <el-option v-for="w in warehouseOptions" :key="w.value" :label="w.label" :value="w.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="调入仓库" width="120">
              <template #default="scope">
                <el-select v-model="scope.row.toWarehouse" placeholder="选择仓库" style="width: 100%;">
                  <el-option v-for="w in warehouseOptions" :key="w.value" :label="w.label" :value="w.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="商品编码" width="140">
              <template #default="scope">
                <el-input 
                  v-model="scope.row.productCode" 
                  placeholder="选择商品"
                  @focus="handleProductSelect(scope.$index)"
                />
              </template>
            </el-table-column>
            <el-table-column label="商品名称" min-width="180">
              <template #default="scope">
                <el-input v-model="scope.row.productName" placeholder="商品名称" />
              </template>
            </el-table-column>
            <el-table-column label="规格型号" width="140">
              <template #default="scope">
                <el-input v-model="scope.row.spec" placeholder="规格型号" />
              </template>
            </el-table-column>
            <el-table-column label="批号" width="120">
              <template #default="scope">
                <el-input v-model="scope.row.batchNo" placeholder="批号" />
              </template>
            </el-table-column>
            <el-table-column label="数量" width="100" align="center">
              <template #default="scope">
                <el-input-number 
                  v-model="scope.row.quantity" 
                  :min="0" 
                  :precision="0"
                  controls-position="right"
                  style="width: 80px;"
                />
              </template>
            </el-table-column>
            <el-table-column label="单位" width="80" align="center">
              <template #default="scope">
                <el-input v-model="scope.row.unit" placeholder="单位" />
              </template>
            </el-table-column>
            <el-table-column label="单价" width="100" align="center">
              <template #default="scope">
                <el-input-number 
                  v-model="scope.row.price" 
                  :min="0" 
                  :precision="2"
                  controls-position="right"
                  style="width: 80px;"
                />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="right">
              <template #default="scope">
                <span class="amount-text">¥{{ (scope.row.quantity * scope.row.price).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="scope">
                <el-button type="danger" size="small" text @click="deleteItem(scope.$index)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="table-footer">
            <div class="footer-info">
              <span>共 {{ items.length }} 条明细</span>
              <span style="margin-left: 20px;">合计数量：{{ totalQuantity() }}</span>
            </div>
            <div class="footer-total">
              <span class="total-label">合计金额：</span>
              <span class="total-amount">¥{{ totalAmount().toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>交货信息</span>
        </div>
        <div class="form-row">
          <el-form-item label="交货方式">
            <el-select v-model="form.deliveryMethod" placeholder="请选择交货方式" style="width: 100%;">
              <el-option 
                v-for="opt in deliveryMethodOptions" 
                :key="opt.value" 
                :label="opt.label" 
                :value="opt.value" 
              />
            </el-select>
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="form.operator" placeholder="请输入经办人" />
          </el-form-item>
          <el-form-item label="备注" style="flex: 2;">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
          </el-form-item>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>附件</span>
        </div>
        <div class="upload-section">
          <el-upload
            class="upload-demo"
            drag
            action=""
            :on-preview="() => {}"
            :on-remove="() => {}"
            multiple
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传图片、PDF、Word等格式文件，单个文件不超过10MB
              </div>
            </template>
          </el-upload>
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
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    
    h1 { 
      font-size: 22px; 
      font-weight: 600; 
      margin: 0; 
    }
  }
  
  .header-right {
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
  padding-bottom: 20px;
  border-bottom: 1px solid #F2F4F7;
  
  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  
  .section-icon {
    color: #00bfa5;
    font-size: 12px;
  }
  
  span {
    font-weight: 600;
    color: #344054;
    font-size: 16px;
  }
  
  .section-sub {
    font-weight: 400;
    color: #667085;
    font-size: 14px;
  }
}

.form-row { 
  display: flex; 
  gap: 24px; 
  margin-bottom: 16px;
  
  .el-form-item { 
    flex: 1; 
    margin-bottom: 0;
  }
}

.table-section {
  border: 1px solid #E4E7EC;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #E4E7EC;
  
  span {
    font-weight: 600;
    color: #344054;
  }
}

:deep(.el-table) {
  .el-table__header-wrapper th {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
  }
  .el-table__row:nth-child(odd) {
    background-color: #F0F9F7;
  }
  
  .el-table__row:nth-child(even) {
    background-color: #FFFFFF;
  }
  
  .el-table__body tr:hover > td {
    background-color: #D4EDE6 !important;
  }
}

.amount-text {
  font-weight: 600;
  color: #00bfa5;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f7fa;
  border-top: 1px solid #E4E7EC;
  
  .footer-info {
    color: #667085;
    font-size: 14px;
  }
  
  .footer-total {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .total-label {
      font-weight: 600;
      color: #344054;
    }
    
    .total-amount {
      font-size: 20px;
      font-weight: 700;
      color: #00bfa5;
    }
  }
}

.upload-section {
  margin-top: 8px;
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>