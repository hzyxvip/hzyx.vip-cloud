<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { activeWarehouseOptions, refreshWarehouseOptions } from '@/utils/warehouseSettings'

const router = useRouter()

const defaultItems = [
  { id: 1, productCode: '', productName: '', spec: '', batchNo: '', expireDate: '', outQuantity: 0, inQuantity: 0, unit: '', price: 0, amount: 0, fromWarehouse: '', fromLocation: '', toWarehouse: '', toLocation: '', remark: '' }
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
  carrier: '',
  freight: 0,
  discountRate: 0,
  discountAmount: 0,
  totalAmount: 0,
  paidAmount: 0,
  unpaidAmount: 0,
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

const warehouseOptions = activeWarehouseOptions

const locationOptions = [
  { label: 'A区货架1', value: 'A1' },
  { label: 'A区货架2', value: 'A2' },
  { label: 'B区货架1', value: 'B1' },
  { label: 'B区货架2', value: 'B2' }
]

const deptOptions = [
  { label: '销售部', value: 'sales' },
  { label: '采购部', value: 'purchase' },
  { label: '生产部', value: 'production' },
  { label: '仓储部', value: 'warehouse' }
]

const calculateAmount = (item: any) => {
  item.amount = item.outQuantity * item.price
}

const subTotalAmount = computed(() => {
  return items.value.reduce((sum, item) => sum + item.amount, 0)
})

const totalAmount = computed(() =>
  subTotalAmount.value + form.freight - form.discountAmount
)

const unpaidAmount = computed(() => totalAmount.value - form.paidAmount)

const totalQuantity = computed(() => {
  return items.value.reduce((sum, item) => sum + item.outQuantity, 0)
})

const addItem = () => {
  items.value.push({
    id: Date.now(),
    productCode: '',
    productName: '',
    spec: '',
    batchNo: '',
    expireDate: '',
    outQuantity: 0,
    inQuantity: 0,
    unit: '',
    price: 0,
    amount: 0,
    fromWarehouse: form.fromWarehouse,
    fromLocation: '',
    toWarehouse: form.toWarehouse,
    toLocation: '',
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
  
  const validItems = items.value.filter(item => item.productName && item.outQuantity > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一行有效商品明细')
    return
  }
  
  if (!form.documentNo) {
    form.documentNo = `TROUT${Date.now()}`
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
    carrier: form.carrier,
    freight: form.freight,
    discountRate: form.discountRate,
    discountAmount: form.discountAmount,
    totalAmount: totalAmount.value,
    paidAmount: form.paidAmount,
    unpaidAmount: totalAmount.value - form.paidAmount,
    remark: form.remark,
    items: validItems,
    subTotalAmount: subTotalAmount.value,
    totalQuantity: totalQuantity.value,
    status: 'pending',
    createTime: new Date().toLocaleString('zh-CN')
  }
  
  const stored = localStorage.getItem('transferOutList')
  const list = stored ? JSON.parse(stored) : []
  list.unshift(transferOrder)
  localStorage.setItem('transferOutList', JSON.stringify(list))
  
  ElMessage.success('调拨出库单保存成功')
}

const handleSaveAndNew = () => {
  handleSave()
  form.documentNo = `TROUT${Date.now()}`
  form.fromWarehouse = ''
  form.toWarehouse = ''
  form.fromDept = ''
  form.toDept = ''
  form.outType = ''
  form.operator = ''
  form.deliveryMethod = ''
  form.carrier = ''
  form.freight = 0
  form.discountRate = 0
  form.discountAmount = 0
  form.paidAmount = 0
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
  refreshWarehouseOptions()
  form.documentNo = `TROUT${Date.now()}`
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleCancel" icon="ArrowLeft">返回</el-button>
        <h1>调拨出库单</h1>
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
              <el-option v-for="opt in deptOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="调入部门">
            <el-select v-model="form.toDept" placeholder="请选择调入部门" style="width: 100%;">
              <el-option v-for="opt in deptOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="调出仓库" required>
            <el-select v-model="form.fromWarehouse" placeholder="请选择调出仓库" style="width: 100%;">
              <el-option v-for="opt in warehouseOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="调入仓库" required>
            <el-select v-model="form.toWarehouse" placeholder="请选择调入仓库" style="width: 100%;">
              <el-option v-for="opt in warehouseOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="出库类型">
            <el-select v-model="form.outType" placeholder="请选择类型" style="width: 100%;">
              <el-option v-for="opt in outTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="form.operator" placeholder="请输入经办人" />
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
            <el-table-column label="有效期至" width="120">
              <template #default="scope">
                <el-date-picker 
                  v-model="scope.row.expireDate" 
                  type="date" 
                  placeholder="选择日期"
                  value-format="YYYY-MM-DD"
                  style="width: 100%;"
                />
              </template>
            </el-table-column>
            <el-table-column label="调出仓库" width="120">
              <template #default="scope">
                <el-select v-model="scope.row.fromWarehouse" placeholder="选择仓库" style="width: 100%;">
                  <el-option v-for="opt in warehouseOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="调出库位" width="100">
              <template #default="scope">
                <el-select v-model="scope.row.fromLocation" placeholder="选择库位" style="width: 100%;">
                  <el-option v-for="opt in locationOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="调出数量" width="100" align="center">
              <template #default="scope">
                <el-input-number 
                  v-model="scope.row.outQuantity" 
                  :min="0" 
                  :precision="0"
                  controls-position="right"
                  style="width: 80px;"
                  @change="calculateAmount(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="调入仓库" width="120">
              <template #default="scope">
                <el-select v-model="scope.row.toWarehouse" placeholder="选择仓库" style="width: 100%;">
                  <el-option v-for="opt in warehouseOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="调入库位" width="100">
              <template #default="scope">
                <el-select v-model="scope.row.toLocation" placeholder="选择库位" style="width: 100%;">
                  <el-option v-for="opt in locationOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="调入数量" width="100" align="center">
              <template #default="scope">
                <el-input-number 
                  v-model="scope.row.inQuantity" 
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
                  @change="calculateAmount(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="金额" width="120" align="right">
              <template #default="scope">
                <span class="amount-text">¥{{ scope.row.amount.toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="备注" width="120">
              <template #default="scope">
                <el-input v-model="scope.row.remark" placeholder="备注" />
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
              <span style="margin-left: 20px;">合计数量：{{ totalQuantity }}</span>
            </div>
            <div class="footer-total">
              <span class="total-label">合计金额：</span>
              <span class="total-amount">¥{{ subTotalAmount.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <div class="section-header">
          <span class="section-icon">●</span>
          <span>金额信息</span>
        </div>
        <div class="form-row">
          <el-form-item label="明细金额">
            <el-input v-model="subTotalAmount" type="number" :precision="2" disabled />
          </el-form-item>
          <el-form-item label="运费">
            <el-input-number v-model="form.freight" :min="0" :precision="2" controls-position="right" />
          </el-form-item>
          <el-form-item label="折扣率(%)">
            <el-input-number v-model="form.discountRate" :min="0" :max="100" :precision="2" controls-position="right" />
          </el-form-item>
          <el-form-item label="折扣金额">
            <el-input-number v-model="form.discountAmount" :min="0" :precision="2" controls-position="right" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="金额合计">
            <el-input v-model="totalAmount" type="number" :precision="2" disabled />
          </el-form-item>
          <el-form-item label="已收金额">
            <el-input-number v-model="form.paidAmount" :min="0" :precision="2" controls-position="right" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="未收金额">
              <el-input v-model="unpaidAmount" type="number" :precision="2" disabled />
            </el-form-item>
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
              <el-option v-for="opt in deliveryMethodOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="承运商">
            <el-input v-model="form.carrier" placeholder="请输入承运商" />
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