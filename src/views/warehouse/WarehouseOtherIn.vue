<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 从 localStorage 获取仓库列表
const getWarehouseList = () => {
  const stored = localStorage.getItem('warehouseList')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }
  return []
}

// 默认入库明细
const defaultItems = [
  { id: 1, productCode: '', productName: '', spec: '', unit: '', quantity: 0, price: 0, amount: 0, remark: '' }
]

const form = reactive({
  documentNo: '',
  warehouse: '',
  inType: '',
  date: new Date().toISOString().slice(0, 10),
  operator: '',
  remark: ''
})

const items = ref([...defaultItems])

// 入库类别选项
const inTypeOptions = [
  { label: '报损入库', value: 'damage' },
  { label: '报溢入库', value: 'overflow' },
  { label: '赠送入库', value: 'gift' },
  { label: '退货入库', value: 'return' },
  { label: '其他入库', value: 'other' }
]

// 计算总金额
const totalAmount = () => {
  return items.value.reduce((sum, item) => sum + (item.quantity * item.price), 0)
}

// 添加明细行
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
    remark: ''
  })
}

// 删除明细行
const deleteItem = (index: number) => {
  if (items.value.length > 1) {
    items.value.splice(index, 1)
  } else {
    ElMessage.warning('至少保留一行明细')
  }
}

// 商品选择处理（模拟）
const handleProductSelect = (index: number) => {
  // 实际应用中应该打开商品选择对话框
  ElMessage.info('请在商品资料中选择商品')
}

// 保存入库单
const handleSave = () => {
  if (!form.warehouse) {
    ElMessage.warning('请选择仓库')
    return
  }
  if (!form.inType) {
    ElMessage.warning('请选择入库类别')
    return
  }
  
  const validItems = items.value.filter(item => item.productName && item.quantity > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一行有效商品明细')
    return
  }
  
  // 生成单据编号
  if (!form.documentNo) {
    form.documentNo = `IN${Date.now()}`
  }
  
  const inOrder = {
    id: Date.now(),
    documentNo: form.documentNo,
    warehouse: form.warehouse,
    inType: form.inType,
    inTypeName: inTypeOptions.find(t => t.value === form.inType)?.label || '',
    date: form.date,
    operator: form.operator || '系统操作员',
    remark: form.remark,
    items: validItems,
    totalAmount: totalAmount(),
    createTime: new Date().toLocaleString('zh-CN')
  }
  
  // 保存到 localStorage
  const stored = localStorage.getItem('warehouseInList')
  const list = stored ? JSON.parse(stored) : []
  list.unshift(inOrder)
  localStorage.setItem('warehouseInList', JSON.stringify(list))
  
  ElMessage.success('保存成功')
  router.push('/warehouse/inout')
}

// 初始化
onMounted(() => {
  // 生成初始单据编号
  form.documentNo = `IN${Date.now()}`
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="router.back()" icon="ArrowLeft">返回</el-button>
        <h1>其他入库单</h1>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleSave">保存</el-button>
      </div>
    </div>
    
    <div class="form-card">
      <div class="form-header">
        <div class="form-row">
          <el-form-item label="单据编号">
            <el-input v-model="form.documentNo" placeholder="系统自动生成" disabled />
          </el-form-item>
          <el-form-item label="仓库" required>
            <el-select v-model="form.warehouse" placeholder="请选择仓库" style="width: 100%;">
              <el-option 
                v-for="wh in getWarehouseList()" 
                :key="wh.id" 
                :label="wh.name" 
                :value="wh.name" 
              />
            </el-select>
          </el-form-item>
          <el-form-item label="入库类别" required>
            <el-select v-model="form.inType" placeholder="请选择类别" style="width: 100%;">
              <el-option 
                v-for="opt in inTypeOptions" 
                :key="opt.value" 
                :label="opt.label" 
                :value="opt.value" 
              />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="入库日期">
            <el-date-picker 
              v-model="form.date" 
              type="date" 
              placeholder="选择日期"
              value-format="YYYY-MM-DD"
              style="width: 100%;"
            />
          </el-form-item>
          <el-form-item label="经办人">
            <el-input v-model="form.operator" placeholder="请输入经办人" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="请输入备注" />
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
          <el-table-column label="商品名称" min-width="150">
            <template #default="scope">
              <el-input v-model="scope.row.productName" placeholder="商品名称" />
            </template>
          </el-table-column>
          <el-table-column label="规格型号" min-width="120">
            <template #default="scope">
              <el-input v-model="scope.row.spec" placeholder="规格" />
            </template>
          </el-table-column>
          <el-table-column label="单位" width="80" align="center">
            <template #default="scope">
              <el-input v-model="scope.row.unit" placeholder="单位" />
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
          <el-table-column label="备注" min-width="120">
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
