<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  ShoppingCart,
  Van,
  Shop,
  Wallet,
  ArrowUp,
  ArrowDown,
  WarningFilled,
  CircleCheck
} from '@element-plus/icons-vue'

const stats = ref([
  {
    title: '采购订单',
    value: '1,234',
    change: '+12.5%',
    trend: 'up',
    icon: ShoppingCart,
    color: '#42a5f5'
  },
  {
    title: '销售订单',
    value: '2,567',
    change: '+8.3%',
    trend: 'up',
    icon: Van,
    color: '#66bb6a'
  },
  {
    title: '库存总量',
    value: '56,890',
    change: '-2.1%',
    trend: 'down',
    icon: Shop,
    color: '#ffa726'
  },
  {
    title: '资金流水',
    value: '¥234.5万',
    change: '+15.8%',
    trend: 'up',
    icon: Wallet,
    color: '#ef5350'
  }
])

const recentOrders = ref([
  { id: 'PO202401001', type: '采购', company: '北京医疗器械有限公司', amount: '¥12,500', status: 'pending', date: '2024-01-15 14:30' },
  { id: 'SO202401002', type: '销售', company: '北京协和医院', amount: '¥28,800', status: 'approved', date: '2024-01-15 13:20' },
  { id: 'PO202401003', type: '采购', company: '上海医疗科技有限公司', amount: '¥8,900', status: 'completed', date: '2024-01-15 11:15' },
  { id: 'SO202401004', type: '销售', company: '北京大学人民医院', amount: '¥45,600', status: 'pending', date: '2024-01-15 10:00' },
  { id: 'PO202401005', type: '采购', company: '广州医疗器械厂', amount: '¥15,200', status: 'rejected', date: '2024-01-14 16:45' }
])

const statusLabels = {
  pending: { text: '待审核', color: 'warning' },
  approved: { text: '已审核', color: 'primary' },
  completed: { text: '已完成', color: 'success' },
  rejected: { text: '已驳回', color: 'danger' }
}

const quickActions = ref([
  { label: '新建采购订单', path: '/purchase/create', icon: ShoppingCart },
  { label: '新建销售订单', path: '/sales/create', icon: Van },
  { label: '新建入库单', path: '/purchase/inbound', icon: Shop },
  { label: '新建收款单', path: '/fund/receipt', icon: Wallet }
])

const selectedPeriod = ref('month')

const alerts = ref([
  { type: 'warning', message: '有 5 个采购订单待审核', time: '5分钟前' },
  { type: 'success', message: '销售出库单 SO202401002 已发货', time: '10分钟前' },
  { type: 'danger', message: '库存预警：一次性口罩库存不足', time: '30分钟前' }
])

onMounted(() => {
})
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h1>首页</h1>
      <p>欢迎回来，管理员 | 今日数据概览</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.title">
        <div class="stat-icon" :style="{ backgroundColor: stat.color + '20' }">
          <component :is="stat.icon" :style="{ color: stat.color }" />
        </div>
        <div class="stat-info">
          <p class="stat-title">{{ stat.title }}</p>
          <p class="stat-value">{{ stat.value }}</p>
          <div class="stat-trend" :class="stat.trend">
            <component :is="stat.trend === 'up' ? ArrowUp : ArrowDown" />
            {{ stat.change }}
          </div>
        </div>
      </div>
    </div>

    <div class="main-content">
      <div class="left-panel">
        <div class="panel-card">
          <div class="panel-header">
            <h3>快速操作</h3>
          </div>
          <div class="quick-actions">
            <div class="action-item" v-for="action in quickActions" :key="action.label">
              <div class="action-icon">
                <component :is="action.icon" />
              </div>
              <span>{{ action.label }}</span>
            </div>
          </div>
        </div>

        <div class="panel-card">
          <div class="panel-header">
            <h3>系统通知</h3>
          </div>
          <div class="alerts-list">
            <div class="alert-item" v-for="(alert, index) in alerts" :key="index">
              <el-icon :class="'alert-icon alert-' + alert.type">
                <component :is="alert.type === 'warning' ? WarningFilled : alert.type === 'success' ? CircleCheck : WarningFilled" />
              </el-icon>
              <div class="alert-content">
                <p>{{ alert.message }}</p>
                <span class="alert-time">{{ alert.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-card">
          <div class="panel-header">
            <h3>最近订单</h3>
            <el-button type="text" size="small">查看全部</el-button>
          </div>
          <div class="orders-table">
            <table>
              <thead>
                <tr>
                  <th>订单号</th>
                  <th>类型</th>
                  <th>交易单位</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td>{{ order.id }}</td>
                  <td>
                    <span class="order-type" :class="order.type === '采购' ? 'purchase' : 'sales'">
                      {{ order.type }}
                    </span>
                  </td>
                  <td>{{ order.company }}</td>
                  <td>{{ order.amount }}</td>
                  <td>
                    <el-tag :type="statusLabels[order.status as keyof typeof statusLabels].color">
                      {{ statusLabels[order.status as keyof typeof statusLabels].text }}
                    </el-tag>
                  </td>
                  <td>{{ order.date }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-panel">
      <div class="panel-card chart-card">
        <div class="panel-header">
          <h3>采购趋势</h3>
          <el-select v-model="selectedPeriod" placeholder="选择时间段" style="width: 120px;">
            <el-option label="本周" value="week" />
            <el-option label="本月" value="month" />
            <el-option label="本季度" value="quarter" />
          </el-select>
        </div>
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div class="bar-group" v-for="i in 7" :key="i">
              <div class="bar" :style="{ height: (30 + Math.random() * 70) + '%' }"></div>
              <span>周{{ i }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel-card chart-card">
        <div class="panel-header">
          <h3>销售趋势</h3>
        </div>
        <div class="chart-placeholder">
          <div class="chart-bars">
            <div class="bar-group" v-for="i in 7" :key="i">
              <div class="bar sales-bar" :style="{ height: (40 + Math.random() * 60) + '%' }"></div>
              <span>周{{ i }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dashboard {
  padding: 12px;
}

.page-header {
  margin-bottom: 16px;
  
  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #333;
    margin: 0 0 4px;
  }
  
  p {
    font-size: 13px;
    color: #666;
    margin: 0;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  :deep(.el-icon) {
    font-size: 20px;
  }
}

.stat-info {
  flex: 1;
  
  .stat-title {
    font-size: 13px;
    color: #666;
    margin: 0 0 4px;
  }
  
  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #333;
    margin: 0 0 4px;
  }
  
  .stat-trend {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    
    &.up {
      color: #66bb6a;
    }
    
    &.down {
      color: #ef5350;
    }
  }
}

.main-content {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.left-panel {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.right-panel {
  flex: 1;
}

.panel-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  
  h3 {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }
}

.quick-actions {
  padding: 12px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: #f5f7fa;
  }
  
  .action-icon {
    width: 32px;
    height: 32px;
    background-color: #e3f2fd;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1565c0;
    
    :deep(.el-icon) {
      font-size: 16px;
    }
  }
  
  span {
    font-size: 13px;
    color: #333;
  }
}

.alerts-list {
  padding: 12px;
}

.alert-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background-color: #fafafa;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .alert-icon {
    font-size: 18px;
    
    &.alert-warning {
      color: #ffa726;
    }
    
    &.alert-success {
      color: #66bb6a;
    }
    
    &.alert-danger {
      color: #ef5350;
    }
  }
  
  .alert-content {
    flex: 1;
    
    p {
      font-size: 13px;
      color: #333;
      margin: 0 0 4px;
    }
    
    .alert-time {
      font-size: 11px;
      color: #999;
    }
  }
}

.orders-table {
  overflow-x: auto;
  
  table {
    width: 100%;
    border-collapse: collapse;
    
    th, td {
      padding: 10px 12px;
      text-align: left;
      font-size: 12px;
    }
    
    th {
      background-color: #fafafa;
      font-weight: 600;
      color: #666;
      border-bottom: 1px solid #f0f0f0;
    }
    
    td {
      color: #333;
      border-bottom: 1px solid #f5f5f5;
    }
    
    tr:hover {
      background-color: #fafafa;
    }
  }
}

.order-type {
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  
  &.purchase {
    background-color: #e3f2fd;
    color: #1565c0;
  }
  
  &.sales {
    background-color: #e8f5e9;
    color: #388e3c;
  }
}

.bottom-panel {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.chart-card {
  .chart-placeholder {
    padding: 16px;
  }
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 150px;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  
  .bar {
    width: 40px;
    background: linear-gradient(to top, #42a5f5, #90caf9);
    border-radius: 6px 6px 0 0;
    transition: height 0.3s;
    
    &.sales-bar {
      background: linear-gradient(to top, #66bb6a, #a5d6a7);
    }
  }
  
  span {
    font-size: 12px;
    color: #666;
  }
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .main-content {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100%;
  }
  
  .bottom-panel {
    grid-template-columns: 1fr;
  }
}
</style>