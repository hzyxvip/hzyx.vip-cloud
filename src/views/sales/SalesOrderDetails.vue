<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { print, preview } from '@/utils/printService'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Printer, View } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

interface OrderItem {
  productCode: string
  productName: string
  spec: string
  unit: string
  quantity: string
  price: string
  amount: string
}

const orderData = ref({
  id: '',
  customer: '',
  customerCode: '',
  warehouse: '',
  date: '',
  deliveryDate: '',
  contact: '',
  phone: '',
  remark: '',
  items: [] as OrderItem[],
  auditStatus: '',
  executeStatus: '',
  warehouseStatus: '',
  closeStatus: '',
  prepaymentAudit: '',
  receiveStatus: '',
  status: '',
  creator: '',
  auditor: '',
  productName: '',
  spec: ''
})

const loading = ref(false)

const mockOrderData: Record<string, any> = {
  'SO202606001': {
    id: 'SO202606001',
    customer: '广州中心医院',
    customerCode: 'GZZXYYYY001',
    warehouse: 'beijing',
    date: '2026-06-15',
    deliveryDate: '2026-06-20',
    contact: '李经理',
    phone: '020-88888888',
    remark: '紧急订单',
    items: [
      { productCode: 'P001', productName: '一次性注射器', spec: '5ml', unit: '支', quantity: '1000', price: '2.50', amount: '2500.00' },
      { productCode: 'P002', productName: '医用口罩', spec: 'N95', unit: '个', quantity: '500', price: '8.00', amount: '4000.00' }
    ],
    auditStatus: 'audited',
    executeStatus: 'partiallyExecuted',
    warehouseStatus: 'partiallyOutWarehoused',
    closeStatus: 'notClosed',
    prepaymentAudit: 'prepaidAudited',
    receiveStatus: 'received',
    status: 'approved',
    creator: '张三',
    auditor: '王五',
    productName: '注射器',
    spec: '5ml'
  },
  'SO202606002': {
    id: 'SO202606002',
    customer: '上海长征医院',
    customerCode: 'SZCZYYY002',
    warehouse: 'shanghai',
    date: '2026-06-14',
    deliveryDate: '2026-06-19',
    contact: '赵经理',
    phone: '021-66666666',
    remark: '',
    items: [
      { productCode: 'P003', productName: '防护服', spec: '连体式', unit: '套', quantity: '200', price: '120.00', amount: '24000.00' }
    ],
    auditStatus: 'notAudited',
    executeStatus: 'notExecuted',
    warehouseStatus: 'notOutWarehoused',
    closeStatus: 'notClosed',
    prepaymentAudit: 'prepaidNotAudited',
    receiveStatus: 'received',
    status: 'pending',
    creator: '李四',
    auditor: '',
    productName: '防护服',
    spec: '连体式'
  },
  'SO202606003': {
    id: 'SO202606003',
    customer: '北京协和医院',
    customerCode: 'BJXHYYY003',
    warehouse: 'beijing',
    date: '2026-06-13',
    deliveryDate: '2026-06-18',
    contact: '钱经理',
    phone: '010-99999999',
    remark: '需要发票',
    items: [
      { productCode: 'P004', productName: '心电监护仪', spec: '多参数', unit: '台', quantity: '5', price: '15000.00', amount: '75000.00' }
    ],
    auditStatus: 'audited',
    executeStatus: 'allExecuted',
    warehouseStatus: 'allOutWarehoused',
    closeStatus: 'closed',
    prepaymentAudit: 'prepaidPartiallyAudited',
    receiveStatus: 'received',
    status: 'completed',
    creator: '张三',
    auditor: '赵六',
    productName: '监护仪',
    spec: '多参数'
  }
}

const warehouseLabels: Record<string, string> = {
  'beijing': '北京仓库',
  'shanghai': '上海仓库'
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待审核', color: 'warning' },
  approved: { text: '已审核', color: 'primary' },
  completed: { text: '已完成', color: 'success' },
  rejected: { text: '已驳回', color: 'danger' }
}

const auditStatusLabels: Record<string, string> = {
  notAudited: '未审核',
  audited: '已审核'
}

const executeStatusLabels: Record<string, string> = {
  notExecuted: '未执行',
  partiallyExecuted: '部分执行',
  allExecuted: '全部执行'
}

const warehouseStatusLabels: Record<string, string> = {
  notOutWarehoused: '未出库',
  partiallyOutWarehoused: '部分出库',
  allOutWarehoused: '全部出库'
}

const closeStatusLabels: Record<string, string> = {
  notClosed: '未关闭',
  closed: '已关闭',
  manualClosed: '手动关闭'
}

const prepaymentAuditLabels: Record<string, string> = {
  prepaidNotAudited: '已预收未审核',
  prepaidPartiallyAudited: '已预收部分审核',
  prepaidAudited: '已预收已审核'
}

const receiveStatusLabels: Record<string, string> = {
  received: '已接单',
  notReceived: '未接单'
}

onMounted(() => {
  const orderId = route.query.id as string
  if (orderId && mockOrderData[orderId]) {
    orderData.value = mockOrderData[orderId]
  } else if (route.query.id) {
    ElMessage.error('订单不存在')
    router.push('/sales')
  }
})

const totalAmount = () => {
  return orderData.value.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

const handlePrint = () => {
  const printData = {
    orderDate: orderData.value.date,
    deliveryDate: orderData.value.deliveryDate,
    customerName: orderData.value.customer,
    customerCode: orderData.value.customerCode,
    customerAddress: '',
    customerPhone: orderData.value.phone,
    contact: orderData.value.contact,
    documentNo: orderData.value.id,
    warehouseName: warehouseLabels[orderData.value.warehouse] || orderData.value.warehouse,
    remark: orderData.value.remark,
    items: orderData.value.items.map((item: any) => ({
      productCode: item.productCode,
      bidType: '',
      productName: item.productName,
      spec: item.spec,
      manufacturer: '',
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.price),
      amount: Number(item.amount),
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      registrationNo: '',
      productionLicenseNo: '',
      storageCondition: ''
    })),
    totalAmount: totalAmount()
  }

  try {
    print('salesOrder', printData)
  } catch (error) {
    ElMessage.error('打印失败：' + (error as Error).message)
  }
}

const handlePrintPreview = () => {
  const printData = {
    orderDate: orderData.value.date,
    deliveryDate: orderData.value.deliveryDate,
    customerName: orderData.value.customer,
    customerCode: orderData.value.customerCode,
    customerAddress: '',
    customerPhone: orderData.value.phone,
    contact: orderData.value.contact,
    documentNo: orderData.value.id,
    warehouseName: warehouseLabels[orderData.value.warehouse] || orderData.value.warehouse,
    remark: orderData.value.remark,
    items: orderData.value.items.map((item: any) => ({
      productCode: item.productCode,
      bidType: '',
      productName: item.productName,
      spec: item.spec,
      manufacturer: '',
      unit: item.unit,
      quantity: Number(item.quantity),
      unitPrice: Number(item.price),
      amount: Number(item.amount),
      batchNo: '',
      productionDate: '',
      expiryDate: '',
      registrationNo: '',
      productionLicenseNo: '',
      storageCondition: ''
    })),
    totalAmount: totalAmount()
  }

  try {
    preview('salesOrder', printData)
  } catch (error) {
    ElMessage.error('预览失败：' + (error as Error).message)
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="router.push('/sales')">返回</el-button>
        <h1>销售订单详情</h1>
      </div>
      <div class="header-buttons">
        <el-button :icon="View" @click="handlePrintPreview">打印预览</el-button>
        <el-button :icon="Printer" type="primary" @click="handlePrint">打印</el-button>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-section">
        <h3>基本信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">订单编号：</span>
            <span class="value">{{ orderData.id }}</span>
          </div>
          <div class="info-item">
            <span class="label">客户名称：</span>
            <span class="value">{{ orderData.customer }}</span>
          </div>
          <div class="info-item">
            <span class="label">客户编码：</span>
            <span class="value">{{ orderData.customerCode }}</span>
          </div>
          <div class="info-item">
            <span class="label">下单日期：</span>
            <span class="value">{{ orderData.date }}</span>
          </div>
          <div class="info-item">
            <span class="label">预计发货日期：</span>
            <span class="value">{{ orderData.deliveryDate }}</span>
          </div>
          <div class="info-item">
            <span class="label">仓库：</span>
            <span class="value">{{ warehouseLabels[orderData.warehouse] || orderData.warehouse }}</span>
          </div>
          <div class="info-item">
            <span class="label">联系人：</span>
            <span class="value">{{ orderData.contact }}</span>
          </div>
          <div class="info-item">
            <span class="label">联系电话：</span>
            <span class="value">{{ orderData.phone }}</span>
          </div>
          <div class="info-item">
            <span class="label">备注：</span>
            <span class="value">{{ orderData.remark || '-' }}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>状态信息</h3>
        <div class="status-grid">
          <div class="status-item">
            <el-tag :type="statusLabels[orderData.status]?.color as any" size="large">
              {{ statusLabels[orderData.status]?.text }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="label">审核状态：</span>
            <el-tag size="small" :type="orderData.auditStatus === 'audited' ? 'success' : 'info'">
              {{ auditStatusLabels[orderData.auditStatus] }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="label">执行状态：</span>
            <el-tag size="small" :type="orderData.executeStatus === 'allExecuted' ? 'success' : (orderData.executeStatus === 'partiallyExecuted' ? 'warning' : 'info')">
              {{ executeStatusLabels[orderData.executeStatus] }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="label">出库状态：</span>
            <el-tag size="small" :type="orderData.warehouseStatus === 'allOutWarehoused' ? 'success' : (orderData.warehouseStatus === 'partiallyOutWarehoused' ? 'warning' : 'info')">
              {{ warehouseStatusLabels[orderData.warehouseStatus] }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="label">关闭状态：</span>
            <el-tag size="small" :type="orderData.closeStatus === 'closed' ? 'danger' : (orderData.closeStatus === 'manualClosed' ? 'warning' : 'info')">
              {{ closeStatusLabels[orderData.closeStatus] }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="label">预收审核：</span>
            <el-tag size="small" :type="orderData.prepaymentAudit === 'prepaidAudited' ? 'success' : (orderData.prepaymentAudit === 'prepaidPartiallyAudited' ? 'warning' : 'info')">
              {{ prepaymentAuditLabels[orderData.prepaymentAudit] }}
            </el-tag>
          </div>
          <div class="status-item">
            <span class="label">接单状态：</span>
            <el-tag size="small" :type="orderData.receiveStatus === 'received' ? 'success' : 'info'">
              {{ receiveStatusLabels[orderData.receiveStatus] }}
            </el-tag>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h3>商品明细</h3>
        <el-table :data="orderData.items" border style="width: 100%">
          <el-table-column prop="productCode" label="商品编码" width="120" />
          <el-table-column prop="productName" label="商品名称" width="180" />
          <el-table-column prop="spec" label="规格型号" width="120" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="quantity" label="数量" width="100" />
          <el-table-column prop="price" label="单价" width="120" />
          <el-table-column prop="amount" label="金额" width="120" />
        </el-table>
        <div class="total-amount">
          订单总金额：<span class="amount">¥{{ totalAmount().toFixed(2) }}</span>
        </div>
      </div>

      <div class="detail-section">
        <h3>操作信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">制单人：</span>
            <span class="value">{{ orderData.creator }}</span>
          </div>
          <div class="info-item">
            <span class="label">审核人：</span>
            <span class="value">{{ orderData.auditor || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
    color: #333;
  }

  .header-buttons {
    display: flex;
    gap: 12px;
  }
}

.detail-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.detail-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #409eff;
    display: inline-block;
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;

  .label {
    color: #666;
    font-size: 14px;
    min-width: 100px;
  }

  .value {
    color: #333;
    font-size: 14px;
    font-weight: 500;
  }
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  .status-item {
    display: flex;
    align-items: center;
    gap: 8px;

    .label {
      color: #666;
      font-size: 14px;
    }
  }
}

.total-amount {
  margin-top: 16px;
  text-align: right;
  font-size: 16px;
  color: #666;

  .amount {
    font-size: 20px;
    font-weight: bold;
    color: #f56c6c;
    margin-left: 8px;
  }
}
</style>
