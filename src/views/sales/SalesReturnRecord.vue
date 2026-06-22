<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElDialog } from 'element-plus'
import { 
  auditStatusOptions,
  warehouseInStatusOptions,
  logisticsCompanyMap,
  formatStatus
} from '@/utils/statusManager'
import { print, preview, type SalesReturnData } from '@/utils/printService'
import { getCompanyInfo } from '@/utils/companyConfig'

const router = useRouter()

const searchForm = ref({
  returnNo: '',
  orderNo: '',
  customer: '',
  returnType: '',
  status: '',
  auditStatus: '',
  warehouseInStatus: '',
  dateRange: [] as Date[]
})

const returnTypeOptions = [
  { label: '销售退货', value: 'return' },
  { label: '销售换货', value: 'exchange' }
]

const returnReasonOptions: Record<string, string> = {
  quality: '质量问题',
  wrong: '商品错发',
  rejected: '客户拒收',
  unsalable: '滞销积压',
  other: '其他原因'
}

const statusOptions = [
  { label: '待审核', value: 'pending' },
  { label: '已审核', value: 'approved' },
  { label: '已入库', value: 'warehoused' },
  { label: '已拒绝', value: 'rejected' }
]

const tableData = ref<any[]>([])

const pagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const dialogVisible = ref(false)
const currentDetail = ref<any>(null)

const filteredData = computed(() => {
  let data = [...tableData.value]
  
  if (searchForm.value.returnNo) {
    data = data.filter(item => item.returnNo?.includes(searchForm.value.returnNo))
  }
  if (searchForm.value.orderNo) {
    data = data.filter(item => item.originalOrderNo?.includes(searchForm.value.orderNo))
  }
  if (searchForm.value.customer) {
    data = data.filter(item => item.customer?.includes(searchForm.value.customer))
  }
  if (searchForm.value.returnType) {
    data = data.filter(item => item.returnType === searchForm.value.returnType)
  }
  if (searchForm.value.status) {
    data = data.filter(item => item.status === searchForm.value.status)
  }
  if (searchForm.value.auditStatus) {
    data = data.filter(item => item.auditStatus === searchForm.value.auditStatus)
  }
  if (searchForm.value.warehouseInStatus) {
    data = data.filter(item => item.warehouseInStatus === searchForm.value.warehouseInStatus)
  }
  if (searchForm.value.dateRange && searchForm.value.dateRange.length === 2) {
    const startDate = new Date(searchForm.value.dateRange[0])
    const endDate = new Date(searchForm.value.dateRange[1])
    data = data.filter(item => {
      const itemDate = new Date(item.returnDate)
      return itemDate >= startDate && itemDate <= endDate
    })
  }
  
  pagination.value.total = data.length
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return data.slice(start, end)
})

const handleSearch = () => {
  pagination.value.currentPage = 1
}

const handleReset = () => {
  searchForm.value = {
    returnNo: '',
    orderNo: '',
    customer: '',
    returnType: '',
    status: '',
    auditStatus: '',
    warehouseInStatus: '',
    dateRange: []
  }
  pagination.value.currentPage = 1
}

const handleRefresh = () => {
  loadData()
  ElMessage.success('刷新成功')
}

const loadData = () => {
  const stored = localStorage.getItem('salesReturnRecords')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        tableData.value = parsed
      }
    } catch {
      console.error('Failed to parse sales return record data')
    }
  }
  
  if (tableData.value.length === 0) {
    tableData.value = [
      { 
        returnNo: 'SR2024010001', 
        returnType: 'return', 
        originalOrderNo: 'SO2024010001', 
        customer: '北京医药公司', 
        customerCode: 'BJYY001',
        returnDate: '2024-01-15', 
        totalAmount: '5000.00',
        itemCount: 3,
        status: 'pending',
        auditStatus: 'notAudited',
        warehouseInStatus: 'notInWarehoused',
        warehouse: '北京仓库',
        contact: '张三',
        phone: '13800138000',
        returnReason: 'quality',
        returnReasonRemark: '部分商品存在质量问题',
        remark: '',
        items: [
          { productCode: 'P001', productName: '一次性注射器', spec: '5ml', unit: '支', originalQty: '100', shippedQty: '100', returnQty: '50', price: '5.00', amount: '250.00', batchNo: '20240101', productionDate: '2024-01-01', expiryDate: '2025-01-01', returnWarehouse: '北京仓库' },
          { productCode: 'P002', productName: '医用纱布', spec: '10cm×10cm', unit: '包', originalQty: '50', shippedQty: '50', returnQty: '30', price: '10.00', amount: '300.00', batchNo: '20240102', productionDate: '2024-01-05', expiryDate: '2025-01-05', returnWarehouse: '北京仓库' },
          { productCode: 'P003', productName: '碘伏消毒液', spec: '500ml', unit: '瓶', originalQty: '20', shippedQty: '20', returnQty: '10', price: '15.00', amount: '150.00', batchNo: '20240103', productionDate: '2024-01-10', expiryDate: '2025-01-10', returnWarehouse: '北京仓库' }
        ]
      },
      { 
        returnNo: 'SR2024010002', 
        returnType: 'exchange', 
        originalOrderNo: 'SO2024010002', 
        customer: '上海医疗器械公司', 
        customerCode: 'SHYL002',
        returnDate: '2024-01-14', 
        totalAmount: '3200.00',
        itemCount: 2,
        status: 'approved',
        auditStatus: 'audited',
        warehouseInStatus: 'notInWarehoused',
        warehouse: '上海仓库',
        contact: '李四',
        phone: '13900139000',
        returnReason: 'wrong',
        returnReasonRemark: '商品型号发错',
        remark: '换货后重新发货',
        auditPerson: '审核员1',
        auditDate: '2024-01-16',
        items: [
          { productCode: 'P004', productName: '电子体温计', spec: 'DT-01', unit: '台', originalQty: '20', shippedQty: '20', returnQty: '10', price: '50.00', amount: '500.00', batchNo: '20240104', productionDate: '2024-01-08', expiryDate: '2025-01-08', returnWarehouse: '上海仓库' },
          { productCode: 'P005', productName: '血压计', spec: 'BP-01', unit: '台', originalQty: '10', shippedQty: '10', returnQty: '5', price: '300.00', amount: '1500.00', batchNo: '20240105', productionDate: '2024-01-06', expiryDate: '2025-01-06', returnWarehouse: '上海仓库' }
        ]
      },
      { 
        returnNo: 'SR2024010003', 
        returnType: 'return', 
        originalOrderNo: 'SO2024010003', 
        customer: '广州制药厂', 
        customerCode: 'GZZY003',
        returnDate: '2024-01-13', 
        totalAmount: '8500.00',
        itemCount: 5,
        status: 'warehoused',
        auditStatus: 'audited',
        warehouseInStatus: 'allInWarehoused',
        warehouse: '广州仓库',
        contact: '王五',
        phone: '13700137000',
        returnReason: 'unsalable',
        returnReasonRemark: '产品滞销，库存积压',
        remark: '',
        auditPerson: '审核员2',
        auditDate: '2024-01-15',
        warehouseInPerson: '仓管员',
        warehouseInDate: '2024-01-17',
        logisticsCompany: 'sf',
        logisticsNo: 'SF1234567890',
        items: [
          { productCode: 'P006', productName: '口罩', spec: '医用一次性', unit: '盒', originalQty: '100', shippedQty: '100', returnQty: '100', price: '20.00', amount: '2000.00', batchNo: '20240106', productionDate: '2024-01-02', expiryDate: '2025-01-02', returnWarehouse: '广州仓库' },
          { productCode: 'P007', productName: '防护服', spec: '一次性', unit: '套', originalQty: '50', shippedQty: '50', returnQty: '50', price: '100.00', amount: '5000.00', batchNo: '20240107', productionDate: '2024-01-03', expiryDate: '2025-01-03', returnWarehouse: '广州仓库' },
          { productCode: 'P008', productName: '手套', spec: '医用检查', unit: '盒', originalQty: '30', shippedQty: '30', returnQty: '30', price: '15.00', amount: '450.00', batchNo: '20240108', productionDate: '2024-01-04', expiryDate: '2025-01-04', returnWarehouse: '广州仓库' }
        ]
      }
    ]
  }
  
  pagination.value.total = tableData.value.length
}

const handleCreate = () => {
  router.push('/sales/return')
}

const handleView = (row: any) => {
  currentDetail.value = row
  dialogVisible.value = true
}

const handleCloseDialog = () => {
  dialogVisible.value = false
  currentDetail.value = null
}

const handleEdit = (row: any) => {
  ElMessage.info(`编辑退换单: ${row.returnNo}`)
}

const handleAudit = (row: any) => {
  ElMessageBox.confirm('确定审核通过此退换单吗？', '审核确认', {
    confirmButtonText: '确认审核',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    row.auditStatus = 'audited'
    row.auditPerson = '当前用户'
    row.auditDate = new Date().toISOString().split('T')[0]
    row.status = 'approved'
    
    const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
    const existingIndex = existingRecords.findIndex((r: any) => r.returnNo === row.returnNo)
    if (existingIndex > -1) {
      existingRecords[existingIndex] = row
      localStorage.setItem('salesReturnRecords', JSON.stringify(existingRecords))
    }
    
    ElMessage.success(`退换单 ${row.returnNo} 审核通过`)
  }).catch(() => {
    ElMessage.info('已取消审核')
  })
}

const handleReject = (row: any) => {
  ElMessageBox.prompt('请输入驳回原因', '驳回确认', {
    confirmButtonText: '确认驳回',
    cancelButtonText: '取消',
    inputPlaceholder: '请输入驳回原因'
  }).then(({ value }) => {
    if (!value.trim()) {
      ElMessage.warning('请输入驳回原因')
      return
    }
    row.auditStatus = 'rejected'
    row.auditPerson = '当前用户'
    row.auditDate = new Date().toISOString().split('T')[0]
    row.status = 'rejected'
    
    const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
    const existingIndex = existingRecords.findIndex((r: any) => r.returnNo === row.returnNo)
    if (existingIndex > -1) {
      existingRecords[existingIndex] = row
      localStorage.setItem('salesReturnRecords', JSON.stringify(existingRecords))
    }
    
    ElMessage.success(`退换单 ${row.returnNo} 已驳回`)
  }).catch(() => {
    ElMessage.info('已取消驳回')
  })
}

const handleWarehouseIn = (row: any) => {
  ElMessageBox.confirm('确定确认入库吗？', '入库确认', {
    confirmButtonText: '确认入库',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    row.warehouseInStatus = 'allInWarehoused'
    row.warehouseInPerson = '当前用户'
    row.warehouseInDate = new Date().toISOString().split('T')[0]
    row.status = 'warehoused'
    
    const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
    const existingIndex = existingRecords.findIndex((r: any) => r.returnNo === row.returnNo)
    if (existingIndex > -1) {
      existingRecords[existingIndex] = row
      localStorage.setItem('salesReturnRecords', JSON.stringify(existingRecords))
    }
    
    ElMessage.success(`退换单 ${row.returnNo} 入库成功`)
  }).catch(() => {
    ElMessage.info('已取消入库')
  })
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm('确定删除此退换单吗？', '删除确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    tableData.value = tableData.value.filter(item => item.returnNo !== row.returnNo)
    
    const existingRecords = JSON.parse(localStorage.getItem('salesReturnRecords') || '[]')
    const filteredRecords = existingRecords.filter((r: any) => r.returnNo !== row.returnNo)
    localStorage.setItem('salesReturnRecords', JSON.stringify(filteredRecords))
    
    pagination.value.total = tableData.value.length
    ElMessage.success(`退换单 ${row.returnNo} 已删除`)
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleExport = () => {
  ElMessage.info('导出退换记录')
}

const handlePrint = () => {
  if (!currentDetail.value) {
    ElMessage.warning('请先选择一条退换单查看详情')
    return
  }
  
  const company = getCompanyInfo()
  const printData: SalesReturnData = {
    companyName: company.name,
    companyAddress: company.address,
    companyPhone: company.phone,
    returnDate: currentDetail.value.returnDate,
    buyerName: currentDetail.value.customer,
    buyerAddress: '',
    buyerPhone: currentDetail.value.phone,
    documentNo: currentDetail.value.returnNo,
    returnType: currentDetail.value.returnType,
    returnReason: getReturnReasonLabel(currentDetail.value.returnReason) + (currentDetail.value.returnReasonRemark ? ' - ' + currentDetail.value.returnReasonRemark : ''),
    items: (currentDetail.value.items || []).map(item => ({
      productCode: item.productCode,
      bidType: item.bidType || '',
      productName: item.productName,
      spec: item.spec,
      manufacturer: item.manufacturer || '',
      unit: item.unit,
      quantity: Number(item.returnQty),
      unitPrice: Number(item.price),
      amount: Number(item.amount),
      batchNo: item.batchNo,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo || '',
      productionLicenseNo: item.productionLicenseNo || '',
      storageCondition: item.storageCondition || ''
    })),
    totalAmount: Number(currentDetail.value.totalAmount),
    logisticsCompany: getLogisticsLabel(currentDetail.value.logisticsCompany),
    logisticsNo: currentDetail.value.logisticsNo || ''
  }
  
  try {
    print('salesReturn', printData)
  } catch (error) {
    ElMessage.error('打印失败：' + (error as Error).message)
  }
}

const handlePrintPreview = () => {
  if (!currentDetail.value) {
    ElMessage.warning('请先选择一条退换单查看详情')
    return
  }
  
  const company = getCompanyInfo()
  const printData: SalesReturnData = {
    companyName: company.name,
    companyAddress: company.address,
    companyPhone: company.phone,
    returnDate: currentDetail.value.returnDate,
    buyerName: currentDetail.value.customer,
    buyerAddress: '',
    buyerPhone: currentDetail.value.phone,
    documentNo: currentDetail.value.returnNo,
    returnType: currentDetail.value.returnType,
    returnReason: getReturnReasonLabel(currentDetail.value.returnReason) + (currentDetail.value.returnReasonRemark ? ' - ' + currentDetail.value.returnReasonRemark : ''),
    items: (currentDetail.value.items || []).map(item => ({
      productCode: item.productCode,
      bidType: item.bidType || '',
      productName: item.productName,
      spec: item.spec,
      manufacturer: item.manufacturer || '',
      unit: item.unit,
      quantity: Number(item.returnQty),
      unitPrice: Number(item.price),
      amount: Number(item.amount),
      batchNo: item.batchNo,
      productionDate: item.productionDate,
      expiryDate: item.expiryDate,
      registrationNo: item.registrationNo || '',
      productionLicenseNo: item.productionLicenseNo || '',
      storageCondition: item.storageCondition || ''
    })),
    totalAmount: Number(currentDetail.value.totalAmount),
    logisticsCompany: getLogisticsLabel(currentDetail.value.logisticsCompany),
    logisticsNo: currentDetail.value.logisticsNo || ''
  }
  
  try {
    preview('salesReturn', printData)
  } catch (error) {
    ElMessage.error('预览失败：' + (error as Error).message)
  }
}

const formatReturnType = (type: string) => {
  return type === 'return' ? '退货' : '换货'
}

const getLogisticsLabel = (value: string) => {
  return logisticsCompanyMap[value] || value
}

const getReturnReasonLabel = (value: string) => {
  return returnReasonOptions[value] || value
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>销售退换单记录</h1>
      <div class="header-actions">
        <el-button type="primary" icon="Plus" @click="handleCreate">新建退换单</el-button>
        <el-button icon="Download" @click="handleExport">导出</el-button>
        <el-button icon="ZoomIn" @click="handlePrintPreview">预览</el-button>
        <el-button icon="Printer" @click="handlePrint">打印</el-button>
      </div>
    </div>
    
    <div class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="退换单号">
          <el-input v-model="searchForm.returnNo" placeholder="请输入退换单号" clearable style="width: 160px;" />
        </el-form-item>
        <el-form-item label="原订单号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入原订单号" clearable style="width: 160px;" />
        </el-form-item>
        <el-form-item label="客户">
          <el-input v-model="searchForm.customer" placeholder="请输入客户名称" clearable style="width: 140px;" />
        </el-form-item>
        <el-form-item label="单据类型">
          <el-select v-model="searchForm.returnType" placeholder="请选择" clearable style="width: 120px;">
            <el-option v-for="item in returnTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 100px;">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核状态">
          <el-select v-model="searchForm.auditStatus" placeholder="请选择" clearable style="width: 100px;">
            <el-option v-for="item in auditStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="入库状态">
          <el-select v-model="searchForm.warehouseInStatus" placeholder="请选择" clearable style="width: 100px;">
            <el-option v-for="item in warehouseInStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="退换日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px;" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button icon="Refresh" @click="handleRefresh">刷新</el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <div class="table-card">
      <el-table :data="filteredData" border stripe>
        <el-table-column prop="returnNo" label="退换单号" width="140" />
        <el-table-column prop="returnType" label="单据类型" width="100" :formatter="(row) => formatReturnType(row.returnType)" />
        <el-table-column prop="originalOrderNo" label="原订单号" width="140" />
        <el-table-column prop="customer" label="客户名称" width="160" />
        <el-table-column prop="customerCode" label="客户编码" width="110" />
        <el-table-column prop="returnDate" label="退换日期" width="110" />
        <el-table-column prop="totalAmount" label="退换金额" width="120" align="right">
          <template #default="{ row }">
            ¥{{ row.totalAmount }}
          </template>
        </el-table-column>
        <el-table-column prop="itemCount" label="商品数量" width="100" align="right" />
        <el-table-column prop="warehouse" label="退货仓库" width="100" />
        <el-table-column prop="auditStatus" label="审核状态" width="100">
          <template #default="{ row }">
            <el-tag :type="formatStatus(row.auditStatus, auditStatusOptions).type">
              {{ formatStatus(row.auditStatus, auditStatusOptions).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="warehouseInStatus" label="入库状态" width="100">
          <template #default="{ row }">
            <el-tag :type="formatStatus(row.warehouseInStatus, warehouseInStatusOptions).type">
              {{ formatStatus(row.warehouseInStatus, warehouseInStatusOptions).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="logisticsCompany" label="物流公司" width="100">
          <template #default="{ row }">
            {{ getLogisticsLabel(row.logisticsCompany) || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="logisticsNo" label="物流单号" width="140" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="text" size="small" @click="handleView(row)">查看</el-button>
            <el-button v-if="row.auditStatus === 'notAudited'" type="text" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button v-if="row.auditStatus === 'notAudited'" type="text" size="small" @click="handleAudit(row)">审核</el-button>
            <el-button v-if="row.auditStatus === 'notAudited'" type="text" size="small" class="danger" @click="handleReject(row)">驳回</el-button>
            <el-button v-if="row.auditStatus === 'audited' && row.warehouseInStatus !== 'allInWarehoused'" type="text" size="small" @click="handleWarehouseIn(row)">入库</el-button>
            <el-button type="text" size="small" class="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </div>
    
    <el-dialog v-model="dialogVisible" :title="`${currentDetail?.returnType === 'return' ? '销售退货单' : '销售换货单'} - ${currentDetail?.returnNo}`" width="800px" destroy-on-close draggable>
      <div v-if="currentDetail" class="detail-content">
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">单据类型：</span>
              <span class="value">{{ formatReturnType(currentDetail.returnType) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">单据编号：</span>
              <span class="value">{{ currentDetail.returnNo }}</span>
            </div>
            <div class="detail-item">
              <span class="label">退换日期：</span>
              <span class="value">{{ currentDetail.returnDate }}</span>
            </div>
            <div class="detail-item">
              <span class="label">审核状态：</span>
              <el-tag :type="formatStatus(currentDetail.auditStatus, auditStatusOptions).type">
                {{ formatStatus(currentDetail.auditStatus, auditStatusOptions).label }}
              </el-tag>
            </div>
            <div class="detail-item">
              <span class="label">入库状态：</span>
              <el-tag :type="formatStatus(currentDetail.warehouseInStatus, warehouseInStatusOptions).type">
                {{ formatStatus(currentDetail.warehouseInStatus, warehouseInStatusOptions).label }}
              </el-tag>
            </div>
            <div class="detail-item">
              <span class="label">原订单号：</span>
              <span class="value">{{ currentDetail.originalOrderNo }}</span>
            </div>
            <div class="detail-item">
              <span class="label">客户：</span>
              <span class="value">{{ currentDetail.customer }}</span>
            </div>
            <div class="detail-item">
              <span class="label">客户编码：</span>
              <span class="value">{{ currentDetail.customerCode }}</span>
            </div>
            <div class="detail-item">
              <span class="label">退货仓库：</span>
              <span class="value">{{ currentDetail.warehouse }}</span>
            </div>
            <div class="detail-item">
              <span class="label">联系人：</span>
              <span class="value">{{ currentDetail.contact }}</span>
            </div>
            <div class="detail-item">
              <span class="label">联系电话：</span>
              <span class="value">{{ currentDetail.phone }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>退货原因</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">退货原因：</span>
              <span class="value">{{ getReturnReasonLabel(currentDetail.returnReason) }}</span>
            </div>
            <div class="detail-item full">
              <span class="label">原因说明：</span>
              <span class="value">{{ currentDetail.returnReasonRemark || '-' }}</span>
            </div>
            <div class="detail-item full">
              <span class="label">备注：</span>
              <span class="value">{{ currentDetail.remark || '-' }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>退货商品明细</h4>
          <el-table :data="currentDetail.items || []" border size="small">
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
          </el-table>
          <div class="amount-summary">
            <span class="label">退货总金额：</span>
            <span class="amount">¥{{ currentDetail.totalAmount }}</span>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>物流信息</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">物流公司：</span>
              <span class="value">{{ getLogisticsLabel(currentDetail.logisticsCompany) || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">物流单号：</span>
              <span class="value">{{ currentDetail.logisticsNo || '-' }}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4>审核记录</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="label">审核人：</span>
              <span class="value">{{ currentDetail.auditPerson || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">审核日期：</span>
              <span class="value">{{ currentDetail.auditDate || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">入库人：</span>
              <span class="value">{{ currentDetail.warehouseInPerson || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">入库日期：</span>
              <span class="value">{{ currentDetail.warehouseInDate || '-' }}</span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="handleCloseDialog">关闭</el-button>
      </template>
    </el-dialog>
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
  .header-actions { display: flex; gap: 12px; } 
}

.search-card { 
  background: #fff; 
  border-radius: 12px; 
  padding: 20px; 
  margin-bottom: 20px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
}

.table-card { 
  background: #fff; 
  border-radius: 12px; 
  padding: 20px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.06); 
  
  :deep(.el-table__header-wrapper th) {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
    text-align: center !important;
  }
  
  .danger {
    color: #F53F2D;
  }
  :deep(.el-table__row:nth-child(odd)) {
    background-color: #F0F9F7;
  }
  
  :deep(.el-table__row:nth-child(even)) {
    background-color: #FFFFFF;
  }
  
  :deep(.el-table__body tr:hover > td) {
    background-color: #D4EDE6 !important;
  }
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.detail-content {
  .detail-section {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #F2F4F7;
    
    &:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    
    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #344054;
      margin: 0 0 16px;
    }
  }
  
  .detail-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }
  
  .detail-item {
    display: flex;
    align-items: center;
    min-width: 200px;
    width: calc(50% - 8px);
    
    &.full {
      width: 100%;
    }
    
    .label {
      font-size: 13px;
      color: #667085;
      width: 80px;
      flex-shrink: 0;
    }
    
    .value {
      font-size: 14px;
      color: #344054;
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
      margin-left: 8px;
    }
  }
}
</style>
