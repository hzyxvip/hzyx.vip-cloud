<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCompanyInfo, setCompanyInfo, resetCompanyInfo, CompanyInfo } from '@/utils/companyConfig'
import { logisticsCompanyOptions, warehouseOptions } from '@/utils/statusManager'

// 公司信息
const companyForm = reactive<CompanyInfo>({
  name: '',
  address: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  businessLicense: '',
  gspCertificate: '',
  medicalDeviceLicense: '',
  bankName: '',
  bankAccount: '',
  taxNo: ''
})

// 仓库配置
const warehouseList = ref([...warehouseOptions])

// 物流配置
const logisticsList = ref([...logisticsCompanyOptions])

// 加载公司信息
const loadCompanyInfo = () => {
  const info = getCompanyInfo()
  Object.assign(companyForm, info)
}

// 保存公司信息
const saveCompanyInfo = () => {
  setCompanyInfo(companyForm)
  ElMessage.success('公司信息保存成功')
}

// 重置公司信息
const resetCompany = () => {
  ElMessageBox.confirm('确定要重置为公司默认信息吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    resetCompanyInfo()
    loadCompanyInfo()
    ElMessage.success('已重置为默认信息')
  }).catch(() => {})
}

// 保存仓库配置到localStorage
const saveWarehouse = () => {
  localStorage.setItem('system_warehouse_list', JSON.stringify(warehouseList.value))
  ElMessage.success('仓库配置保存成功')
}

// 保存物流配置到localStorage
const saveLogistics = () => {
  localStorage.setItem('system_logistics_list', JSON.stringify(logisticsList.value))
  ElMessage.success('物流配置保存成功')
}

onMounted(() => {
  loadCompanyInfo()
  // 从localStorage加载自定义配置
  const savedWarehouse = localStorage.getItem('system_warehouse_list')
  if (savedWarehouse) {
    warehouseList.value = JSON.parse(savedWarehouse)
  }
  const savedLogistics = localStorage.getItem('system_logistics_list')
  if (savedLogistics) {
    logisticsList.value = JSON.parse(savedLogistics)
  }
})

// 当前Tab
const activeTab = ref('company')
</script>

<template>
  <div class="param-config">
    <div class="page-header">
      <h2>系统参数配置</h2>
    </div>

    <el-tabs v-model="activeTab" class="param-tabs">
      <!-- 公司信息 -->
      <el-tab-pane label="公司信息" name="company">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>公司基本信息</span>
              <el-button type="primary" size="small" @click="saveCompanyInfo">保存</el-button>
            </div>
          </template>
          <el-form :model="companyForm" label-width="140px" class="company-form">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="公司名称">
                  <el-input v-model="companyForm.name" placeholder="请输入公司名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="companyForm.phone" placeholder="请输入联系电话" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="传真">
                  <el-input v-model="companyForm.fax" placeholder="请输入传真" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱">
                  <el-input v-model="companyForm.email" placeholder="请输入邮箱" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="网址">
                  <el-input v-model="companyForm.website" placeholder="请输入网址" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="公司地址">
                  <el-input v-model="companyForm.address" placeholder="请输入公司地址" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>证照信息</span>
              <el-button type="warning" size="small" @click="resetCompany">重置默认</el-button>
            </div>
          </template>
          <el-form :model="companyForm" label-width="140px" class="company-form">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="营业执照号">
                  <el-input v-model="companyForm.businessLicense" placeholder="请输入营业执照号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="税号">
                  <el-input v-model="companyForm.taxNo" placeholder="请输入税号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="GSP证书编号">
                  <el-input v-model="companyForm.gspCertificate" placeholder="请输入GSP证书编号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="医疗器械许可证">
                  <el-input v-model="companyForm.medicalDeviceLicense" placeholder="请输入医疗器械许可证" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>

        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>银行信息</span>
            </div>
          </template>
          <el-form :model="companyForm" label-width="140px" class="company-form">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="开户行">
                  <el-input v-model="companyForm.bankName" placeholder="请输入开户行" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="银行账号">
                  <el-input v-model="companyForm.bankAccount" placeholder="请输入银行账号" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </el-card>
      </el-tab-pane>

      <!-- 仓库配置 -->
      <el-tab-pane label="仓库配置" name="warehouse">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>仓库列表</span>
              <el-button type="primary" size="small" @click="saveWarehouse">保存配置</el-button>
            </div>
          </template>
          <el-table :data="warehouseList" border stripe>
            <el-table-column prop="value" label="仓库编码" width="120" />
            <el-table-column prop="label" label="仓库名称" />
            <el-table-column prop="code" label="仓库代码" width="120" />
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 物流配置 -->
      <el-tab-pane label="物流配置" name="logistics">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>物流公司列表</span>
              <el-button type="primary" size="small" @click="saveLogistics">保存配置</el-button>
            </div>
          </template>
          <el-table :data="logisticsList" border stripe>
            <el-table-column prop="value" label="物流编码" width="120" />
            <el-table-column prop="label" label="物流公司名称" />
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 单据状态 -->
      <el-tab-pane label="单据状态" name="status">
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <span>单据状态说明</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="草稿">draft - 单据初始状态</el-descriptions-item>
            <el-descriptions-item label="待审核">pending - 等待审核</el-descriptions-item>
            <el-descriptions-item label="审核中">processing - 正在审核</el-descriptions-item>
            <el-descriptions-item label="已完成">completed - 审核通过</el-descriptions-item>
            <el-descriptions-item label="已作废">cancelled - 已取消</el-descriptions-item>
            <el-descriptions-item label="已驳回">rejected - 审核未通过</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="config-card" style="margin-top: 16px;">
          <template #header>
            <div class="card-header">
              <span>仓库状态说明</span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="未入库/未出库">info - 尚未操作</el-descriptions-item>
            <el-descriptions-item label="部分入库/部分出库">warning - 部分完成</el-descriptions-item>
            <el-descriptions-item label="全部入库/全部出库">success - 全部完成</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style lang="scss" scoped>
.param-config {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100%;

  .page-header {
    margin-bottom: 20px;

    h2 {
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }

  .param-tabs {
    background: #fff;
    padding: 20px;
    border-radius: 4px;
  }

  .config-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  .company-form {
    .el-form-item {
      margin-bottom: 18px;
    }
  }
}
</style>
