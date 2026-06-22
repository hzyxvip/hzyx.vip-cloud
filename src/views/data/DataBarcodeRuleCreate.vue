<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

const isEdit = ref(false)

const form = reactive({
  code: '',
  name: '',
  digitCount: 1,
  ruleType: '',
  remark: ''
})

const ruleTypeOptions = [
  { label: '自定义', value: 'custom' },
  { label: '商品编码', value: 'productCode' },
  { label: '生产日期', value: 'productionDate' },
  { label: '批次号', value: 'batchNo' },
  { label: '序列号', value: 'serialNo' },
  { label: '有效期', value: 'expiryDate' }
]

onMounted(() => {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    loadRuleData(id as string)
  } else {
    form.code = `BR${Date.now().toString().slice(-3)}`
  }
})

const loadRuleData = (id: string) => {
  const mockData = {
    code: 'BR001',
    name: '医疗器械条码规则',
    digitCount: 1,
    ruleType: 'custom',
    remark: ''
  }
  Object.assign(form, mockData)
}

const handleSave = () => {
  if (!form.code) {
    ElMessage.warning('请输入规则编码')
    return
  }
  if (!form.name) {
    ElMessage.warning('请输入规则名称')
    return
  }
  if (!form.ruleType) {
    ElMessage.warning('请选择规则类型')
    return
  }

  ElMessage.success(isEdit.value ? '修改成功' : '新增成功')
  router.push('/data/barcode-rule')
}

const handleBack = () => {
  router.push('/data/barcode-rule')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <el-button @click="handleBack()" icon="ArrowLeft">返回</el-button>
        <h1>{{ isEdit ? '编辑条码规则' : '新增条码规则' }}</h1>
      </div>
      <div class="header-right">
        <el-button @click="handleBack">取消</el-button>
        <el-button type="primary" @click="handleSave">{{ isEdit ? '保存修改' : '保存' }}</el-button>
      </div>
    </div>

    <div class="form-card">
      <el-form :model="form" label-width="120px" class="rule-form">
        <el-form-item label="规则编码" required>
          <el-input v-model="form.code" placeholder="请输入规则编码" />
        </el-form-item>
        
        <el-form-item label="规则名称" required>
          <el-input v-model="form.name" placeholder="请输入规则名称" />
        </el-form-item>
        
        <el-form-item label="编码位数">
          <el-input-number 
            v-model="form.digitCount" 
            :min="1" 
            :max="32" 
            :precision="0"
            controls-position="right"
            placeholder="请输入编码位数"
            style="width: 200px;"
          />
        </el-form-item>
        
        <el-form-item label="规则类型" required>
          <el-select v-model="form.ruleType" placeholder="请选择规则类型" style="width: 200px;">
            <el-option v-for="opt in ruleTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }

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
    gap: 8px;
  }
}

.form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);

  .rule-form {
    :deep(.el-form-item) {
      margin-bottom: 20px;

      :deep(.el-form-item__label) {
        font-weight: 500;
        color: #667085;
      }

      :deep(.el-input__wrapper) {
        border-radius: 4px;
      }
    }
  }
}

:deep(.el-button--primary) {
  background-color: #00bfa5 !important;
  border-color: #00bfa5 !important;
  color: #fff !important;
}
</style>