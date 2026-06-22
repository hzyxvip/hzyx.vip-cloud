<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

const defaultItems = [
  { id: 1, productCode: '', productName: '', spec: '', manufacturer: '', batchNo: '', quantity: 0, unit: '', price: 0, amount: 0, expiryDate: '', productionDate: '', validDate: '', remark: '' }
]

const form = reactive({
  documentNo: '',
  warehouse: '',
  date: new Date().toISOString().slice(0, 10),
  purchaser: '',
  supplier: '',
  remark: ''
})

const items = ref([...defaultItems])

const totalAmount = () => {
  return items.value.reduce((sum, item) => sum + (item.quantity * item.price), 0)
}

const totalQuantity = () => {
  return items.value.reduce((sum, item) => sum + item.quantity, 0)
}

const addItem = () => {
  items.value.push({
    id: Date.now(),
    productCode: '',
    productName: '',
    spec: '',
    manufacturer: '',
    batchNo: '',
    quantity: 0,
    unit: '',
    price: 0,
    amount: 0,
    expiryDate: '',
    productionDate: '',
    validDate: '',
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
  if (!form.warehouse) {
    ElMessage.warning('请选择仓库')
    return
  }
  
  const validItems = items.value.filter(item => item.productName && item.quantity > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一行有效商品明细')
    return
  }
  
  if (!form.documentNo) {
    form.documentNo = `PR${Date.now()}`
  }
  
  const productionOrder = {
    id: Date.now(),
    documentNo: form.documentNo,
    warehouse: form.warehouse,
    date: form.date,
    purchaser: form.purchaser || '系统操作员',
    supplier: form.supplier,
    remark: form.remark,
    items: validItems,
    totalAmount: totalAmount(),
    totalQuantity: totalQuantity(),
    createTime: new Date().toLocaleString('zh-CN')
  }
  
  const stored = localStorage.getItem('productionOrderList')
  const list = stored ? JSON.parse(stored) : []
  list.unshift(productionOrder)
  localStorage.setItem('productionOrderList', JSON.stringify(list))
  
  ElMessage.success('生产入库单保存成功')
  router.push('/warehouse/inout')
}

const handleSubmit = () => {
  handleSave()
}

const handleCancel = () => {
  router.back()
}

onMounted(() => {
  form.documentNo = `PR${Date.now()}`
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleCancel" icon="ArrowLeft">返回</el-button>
        <h1>生产入库单</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSubmit">提交</el-button>
      </div>
    </div>
    
    <div class="form-card">
      <div class="form-header">
        <div class="form-row">
          <el-form-item label="单据编号" required>
            <el-input v-model="form.documentNo" placeholder="系统自动生成" disabled />
          </el-form-item>
          <el-form-item label="入库日期" required>
            <el-date-picker 
              v-model="form.date" 
              type="date" 
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%;"
            />
          </el-form-item>
          <el-form-item label="采购人">
            <el-input v-model="form.purchaser" placeholder="请输入采购人" />
          </el-form-item>
          <el-form-item label="供应商">
            <el-input v-model="form.supplier" placeholder="请输入供应商" />
          </el-form-item>
          <el-form-item label="仓库" required>
            <el-select v-model="form.warehouse" placeholder="请选择仓库" style="width: 100%;">
              <el-option label="北京仓库" value="beijing" />
              <el-option label="上海仓库" value="shanghai" />
              <el-option label="广州仓库" value="guangzhou" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="备注" style="flex: 2;">
            <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注信息" />
          </el-form-item>
        </div>
      </div>
      
      <div class="table-section">
        <div class="table-header">
          <span>入库明细</span>
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
          <el-table-column label="生产厂家" width="140">
            <template #default="scope">
              <el-input v-model="scope.row.manufacturer" placeholder="生产厂家" />
            </template>
          </el-table-column>
          <el-table-column label="批号" width="120">
            <template #default="scope">
              <el-input v-model="scope.row.batchNo" placeholder="批号" />
            </template>
          </el-table-column>
          <el-table-column label="入库数量" width="100" align="center">
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
          <el-table-column label="生产日期" width="120">
            <template #default="scope">
              <el-date-picker 
                v-model="scope.row.productionDate" 
                type="date" 
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </template>
          </el-table-column>
          <el-table-column label="有效期至" width="120">
            <template #default="scope">
              <el-date-picker 
                v-model="scope.row.expiryDate" 
                type="date" 
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
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

.form-header {
  margin-bottom: 24px;
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

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>