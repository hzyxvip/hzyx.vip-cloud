<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { loadTenantCompanyProfile, saveTenantCompanyProfile } from '@/utils/companyDataService'
import { useLayoutNavigateBack } from '@/composables/useLayoutNavigateBack'

const layoutNavigateBack = useLayoutNavigateBack()
const saving = ref(false)
const loading = ref(false)

const form = reactive({
  platformUser: '否',
  settlementPeriod: 0,
  recordStatus: '否',
  recordDate: '',
  remark2: '',
  remark3: '',
  remark4: '',
  remark5: ''
})

const loadData = async () => {
  loading.value = true
  try {
    const profile = await loadTenantCompanyProfile()
    Object.assign(form, {
      platformUser: profile.platformUser || '否',
      settlementPeriod: profile.settlementPeriod ?? 0,
      recordStatus: profile.recordStatus || '否',
      recordDate: profile.recordDate || '',
      remark2: profile.remark2 || '',
      remark3: profile.remark3 || '',
      remark4: profile.remark4 || '',
      remark5: profile.remark5 || ''
    })
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const profile = await loadTenantCompanyProfile()
    await saveTenantCompanyProfile({
      ...profile,
      ...form
    })
    ElMessage.success('招商信息保存成功')
  } finally {
    saving.value = false
  }
}

onMounted(loadData)

const handleBack = () => {
  layoutNavigateBack()
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="handleBack">返回</el-button>
        <div>
          <h1>招商信息</h1>
          <div class="breadcrumb">首页 / 资料管理 / 基础资料 / 公司资料设定 / 招商信息</div>
        </div>
      </div>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </div>

    <div v-loading="loading" class="form-card">
      <div class="card-title">招商信息</div>
      <el-form label-width="140px" class="company-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="平台用户">
              <el-select v-model="form.platformUser" style="width: 100%;">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结算期限(天)">
              <el-input-number v-model="form.settlementPeriod" :min="0" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="平台备案">
              <el-select v-model="form.recordStatus" style="width: 100%;">
                <el-option label="是" value="是" />
                <el-option label="否" value="否" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备案日期">
              <el-date-picker
                v-model="form.recordDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择备案日期"
                style="width: 100%;"
                :disabled="form.recordStatus !== '是'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注2">
              <el-input v-model="form.remark2" type="textarea" :rows="2" placeholder="备注2" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注3">
              <el-input v-model="form.remark3" type="textarea" :rows="2" placeholder="备注3" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注4">
              <el-input v-model="form.remark4" type="textarea" :rows="2" placeholder="备注4" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注5">
              <el-input v-model="form.remark5" type="textarea" :rows="2" placeholder="备注5" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

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

.breadcrumb {
  font-size: 13px;
  color: #667085;
  margin-top: 6px;
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #344054;
  margin-bottom: 16px;
  padding-left: 8px;
  border-left: 3px solid #00bfa5;
}

.company-form :deep(.el-form-item) {
  margin-bottom: 14px;
}
</style>
