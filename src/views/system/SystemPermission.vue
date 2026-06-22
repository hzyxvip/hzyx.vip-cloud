<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('role')
const searchKeyword = ref('')

const showAddRoleDialog = ref(false)
const showEditPermissionDialog = ref(false)
const addRoleForm = ref({
  roleName: '',
  roleCode: '',
  description: ''
})
const currentEditRole = ref<any>(null)

const roles = ref([
  { id: 1, name: '系统管理员', code: 'admin', description: '拥有所有权限，可管理平台和企业数据', status: '启用', isSystem: true },
  { id: 2, name: '平台管理员', code: 'platform_admin', description: '管理平台基础数据，如单位、分类等', status: '启用', isSystem: true },
  { id: 3, name: '企业管理员', code: 'company_admin', description: '管理企业内部数据和人员权限', status: '启用', isSystem: true },
  { id: 4, name: '采购员', code: 'purchaser', description: '负责采购订单、入库等操作', status: '启用', isSystem: false },
  { id: 5, name: '销售员', code: 'sales', description: '负责销售订单、出库等操作', status: '启用', isSystem: false },
  { id: 6, name: '仓库管理员', code: 'warehouse_admin', description: '负责库存管理、盘点等操作', status: '启用', isSystem: false },
  { id: 7, name: '财务员', code: 'finance', description: '负责财务报表、收付款等操作', status: '启用', isSystem: false },
  { id: 8, name: '审核员', code: 'auditor', description: '负责单据审核、价格审核等', status: '启用', isSystem: false },
  { id: 9, name: '查看员', code: 'viewer', description: '只能查看数据，无编辑权限', status: '启用', isSystem: false }
])

const permissionModules = ref([
  {
    id: 1,
    name: '辅助单位管理',
    code: 'unit_manage',
    permissions: [
      { code: 'unit_view', name: '查看单位', checked: false },
      { code: 'unit_add', name: '新增单位', checked: false },
      { code: 'unit_edit', name: '编辑单位', checked: false },
      { code: 'unit_delete', name: '删除单位', checked: false },
      { code: 'unit_sync', name: '同步平台单位', checked: false }
    ]
  },
  {
    id: 2,
    name: '商品管理',
    code: 'product_manage',
    permissions: [
      { code: 'product_view', name: '查看商品', checked: false },
      { code: 'product_add', name: '新增商品', checked: false },
      { code: 'product_edit', name: '编辑商品', checked: false },
      { code: 'product_delete', name: '删除商品', checked: false },
      { code: 'product_audit', name: '审核商品', checked: false }
    ]
  },
  {
    id: 3,
    name: '采购管理',
    code: 'purchase_manage',
    permissions: [
      { code: 'purchase_view', name: '查看采购', checked: false },
      { code: 'purchase_add', name: '新增采购订单', checked: false },
      { code: 'purchase_edit', name: '编辑采购订单', checked: false },
      { code: 'purchase_delete', name: '删除采购订单', checked: false },
      { code: 'purchase_audit', name: '审核采购订单', checked: false },
      { code: 'purchase_inbound', name: '采购入库', checked: false }
    ]
  },
  {
    id: 4,
    name: '销售管理',
    code: 'sales_manage',
    permissions: [
      { code: 'sales_view', name: '查看销售', checked: false },
      { code: 'sales_add', name: '新增销售订单', checked: false },
      { code: 'sales_edit', name: '编辑销售订单', checked: false },
      { code: 'sales_delete', name: '删除销售订单', checked: false },
      { code: 'sales_audit', name: '审核销售订单', checked: false },
      { code: 'sales_outbound', name: '销售出库', checked: false }
    ]
  },
  {
    id: 5,
    name: '仓库管理',
    code: 'warehouse_manage',
    permissions: [
      { code: 'warehouse_view', name: '查看库存', checked: false },
      { code: 'warehouse_in', name: '入库操作', checked: false },
      { code: 'warehouse_out', name: '出库操作', checked: false },
      { code: 'warehouse_transfer', name: '调拨操作', checked: false },
      { code: 'warehouse_check', name: '盘点操作', checked: false }
    ]
  },
  {
    id: 6,
    name: '财务管理',
    code: 'finance_manage',
    permissions: [
      { code: 'finance_view', name: '查看财务', checked: false },
      { code: 'finance_receipt', name: '收款操作', checked: false },
      { code: 'finance_payment', name: '付款操作', checked: false },
      { code: 'finance_report', name: '财务报表', checked: false }
    ]
  },
  {
    id: 7,
    name: '系统设置',
    code: 'system_manage',
    permissions: [
      { code: 'system_user', name: '用户管理', checked: false },
      { code: 'system_role', name: '角色管理', checked: false },
      { code: 'system_permission', name: '权限管理', checked: false },
      { code: 'system_log', name: '日志查看', checked: false }
    ]
  }
])

const rolePermissions = ref<Record<number, string[]>>({
  1: ['unit_view', 'unit_add', 'unit_edit', 'unit_delete', 'unit_sync', 'product_view', 'product_add', 'product_edit', 'product_delete', 'product_audit', 'purchase_view', 'purchase_add', 'purchase_edit', 'purchase_delete', 'purchase_audit', 'purchase_inbound', 'sales_view', 'sales_add', 'sales_edit', 'sales_delete', 'sales_audit', 'sales_outbound', 'warehouse_view', 'warehouse_in', 'warehouse_out', 'warehouse_transfer', 'warehouse_check', 'finance_view', 'finance_receipt', 'finance_payment', 'finance_report', 'system_user', 'system_role', 'system_permission', 'system_log'],
  2: ['unit_view', 'unit_add', 'unit_edit', 'unit_delete', 'unit_sync', 'product_view', 'product_add', 'product_edit', 'product_delete', 'product_audit', 'system_user', 'system_role'],
  3: ['unit_view', 'unit_add', 'unit_edit', 'product_view', 'product_add', 'product_edit', 'purchase_view', 'purchase_add', 'purchase_edit', 'sales_view', 'sales_add', 'sales_edit', 'warehouse_view', 'finance_view', 'system_user'],
  4: ['purchase_view', 'purchase_add', 'purchase_edit', 'purchase_inbound', 'warehouse_view'],
  5: ['sales_view', 'sales_add', 'sales_edit', 'sales_outbound', 'warehouse_view'],
  6: ['warehouse_view', 'warehouse_in', 'warehouse_out', 'warehouse_transfer', 'warehouse_check'],
  7: ['finance_view', 'finance_receipt', 'finance_payment', 'finance_report'],
  8: ['purchase_audit', 'sales_audit', 'product_audit'],
  9: ['unit_view', 'product_view', 'purchase_view', 'sales_view', 'warehouse_view', 'finance_view']
})

const filteredRoles = computed(() => {
  if (!searchKeyword.value) return roles.value
  const keyword = searchKeyword.value.toLowerCase()
  return roles.value.filter(role => 
    role.name.toLowerCase().includes(keyword) ||
    role.code.toLowerCase().includes(keyword) ||
    role.description.toLowerCase().includes(keyword)
  )
})

const handleAddRole = () => {
  showAddRoleDialog.value = true
}

const handleCloseAddRoleDialog = () => {
  showAddRoleDialog.value = false
  addRoleForm.value = { roleName: '', roleCode: '', description: '' }
}

const handleSubmitAddRole = () => {
  if (!addRoleForm.value.roleName.trim()) {
    ElMessage.warning('请输入角色名称')
    return
  }
  if (!addRoleForm.value.roleCode.trim()) {
    ElMessage.warning('请输入角色编码')
    return
  }
  
  if (roles.value.some(r => r.code === addRoleForm.value.roleCode)) {
    ElMessage.warning('角色编码已存在')
    return
  }
  
  const newId = Math.max(...roles.value.map(r => r.id)) + 1
  roles.value.push({
    id: newId,
    name: addRoleForm.value.roleName,
    code: addRoleForm.value.roleCode,
    description: addRoleForm.value.description,
    status: '启用',
    isSystem: false
  })
  
  rolePermissions.value[newId] = []
  
  ElMessage.success('角色添加成功')
  handleCloseAddRoleDialog()
}

const handleEditPermission = (role: any) => {
  currentEditRole.value = role
  
  permissionModules.value.forEach(module => {
    module.permissions.forEach(perm => {
      perm.checked = rolePermissions.value[role.id]?.includes(perm.code) || false
    })
  })
  
  showEditPermissionDialog.value = true
}

const handleCloseEditPermissionDialog = () => {
  showEditPermissionDialog.value = false
  currentEditRole.value = null
}

const handleSubmitEditPermission = () => {
  if (!currentEditRole.value) return
  
  const checkedPermissions: string[] = []
  permissionModules.value.forEach(module => {
    module.permissions.forEach(perm => {
      if (perm.checked) {
        checkedPermissions.push(perm.code)
      }
    })
  })
  
  rolePermissions.value[currentEditRole.value.id] = checkedPermissions
  ElMessage.success('权限配置已保存')
  handleCloseEditPermissionDialog()
}

const handleToggleRoleStatus = (role: any) => {
  if (role.isSystem && role.status === '启用') {
    ElMessage.warning('系统预设角色不能禁用')
    return
  }
  
  role.status = role.status === '启用' ? '禁用' : '启用'
  ElMessage.success(`角色状态已更新为${role.status}`)
}

const handleDeleteRole = (role: any) => {
  if (role.isSystem) {
    ElMessage.warning('系统预设角色不能删除')
    return
  }
  
  ElMessageBox.confirm(`确定要删除角色 "${role.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    roles.value = roles.value.filter(r => r.id !== role.id)
    delete rolePermissions.value[role.id]
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleSelectAllModule = (module: any) => {
  const allChecked = module.permissions.every(p => p.checked)
  module.permissions.forEach(p => {
    p.checked = !allChecked
  })
}

const getRolePermissionCount = (roleId: number) => {
  return rolePermissions.value[roleId]?.length || 0
}

const getTotalPermissionCount = () => {
  let total = 0
  permissionModules.value.forEach(m => {
    total += m.permissions.length
  })
  return total
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>系统权限管理</h1>
        <div class="breadcrumb">首页 / 系统设置 / 权限管理</div>
      </div>
      <el-button type="primary" @click="handleAddRole">新增角色</el-button>
    </div>
    
    <div class="search-bar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="搜索角色名称或编码" 
        style="width: 300px;"
        clearable
      >
        <template #prefix>
          <span style="color: #667085;">🔍</span>
        </template>
      </el-input>
      <el-button @click="searchKeyword = ''">重置</el-button>
    </div>
    
    <el-tabs v-model="activeTab" class="permission-tabs">
      <el-tab-pane label="角色管理" name="role">
        <div class="tab-content">
          <el-table :data="filteredRoles" border class="role-table">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="角色名称" width="150">
              <template #default="scope">
                <span class="role-name">
                  {{ scope.row.name }}
                  <el-tag v-if="scope.row.isSystem" type="primary" size="small" style="margin-left: 8px;">系统</el-tag>
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="code" label="角色编码" width="150" />
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column label="权限数量" width="100">
              <template #default="scope">
                <span class="permission-count">
                  {{ getRolePermissionCount(scope.row.id) }} / {{ getTotalPermissionCount() }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-switch
                  :model-value="scope.row.status === '启用'"
                  @change="handleToggleRoleStatus(scope.row)"
                  :disabled="scope.row.isSystem"
                  active-text="启用"
                  inactive-text="禁用"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" text size="small" @click="handleEditPermission(scope.row)">
                  配置权限
                </el-button>
                <el-button type="text" size="small" @click="handleDeleteRole(scope.row)" :disabled="scope.row.isSystem">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
      
      <el-tab-pane label="权限模块" name="module">
        <div class="tab-content">
          <div class="module-grid">
            <div class="module-card" v-for="module in permissionModules" :key="module.id">
              <div class="module-header">
                <span class="module-icon">🔐</span>
                <span class="module-name">{{ module.name }}</span>
                <span class="module-code">{{ module.code }}</span>
              </div>
              <div class="module-permissions">
                <div class="permission-item" v-for="perm in module.permissions" :key="perm.code">
                  <span class="permission-name">{{ perm.name }}</span>
                  <span class="permission-code">{{ perm.code }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    
    <el-dialog 
      title="新增角色" 
      v-model="showAddRoleDialog" 
      width="480px"
      @close="handleCloseAddRoleDialog"
    >
      <el-form :model="addRoleForm" label-width="100px">
        <el-form-item label="角色名称" required>
          <el-input v-model="addRoleForm.roleName" placeholder="请输入角色名称" maxlength="20" />
        </el-form-item>
        <el-form-item label="角色编码" required>
          <el-input v-model="addRoleForm.roleCode" placeholder="请输入角色编码（英文）" maxlength="30" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="addRoleForm.description" type="textarea" placeholder="请输入角色描述" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseAddRoleDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmitAddRole">确定</el-button>
      </template>
    </el-dialog>
    
    <el-dialog 
      :title="`配置权限 - ${currentEditRole?.name || ''}`" 
      v-model="showEditPermissionDialog" 
      width="700px"
      @close="handleCloseEditPermissionDialog"
    >
      <div class="permission-config">
        <div class="module-section" v-for="module in permissionModules" :key="module.id">
          <div class="module-title-row">
            <span class="module-title">{{ module.name }}</span>
            <el-button type="text" size="small" @click="handleSelectAllModule(module)">
              {{ module.permissions.every(p => p.checked) ? '取消全选' : '全选' }}
            </el-button>
          </div>
          <div class="permission-checkboxes">
            <el-checkbox 
              v-for="perm in module.permissions" 
              :key="perm.code"
              v-model="perm.checked"
              :label="perm.name"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="handleCloseEditPermissionDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmitEditPermission">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; background-color: #F5F7FA; min-height: calc(100vh - 60px); }

.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }

.page-info { 
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px 0; color: #344054; } 
}

.breadcrumb { font-size: 14px; color: #667085; }

.search-bar { 
  display: flex; gap: 12px; padding: 16px; background: #fff; border-radius: 8px; margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.permission-tabs { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.tab-content { margin-top: 16px; }

.role-table { width: 100%; }

.role-name { display: flex; align-items: center; }

.permission-count { 
  color: #00bfa5; font-weight: 500;
}

.module-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }

.module-card { 
  background: #F9FAFB; border-radius: 8px; padding: 16px;
  border: 1px solid #E5E7EB;
}

.module-header { 
  display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
  padding-bottom: 12px; border-bottom: 1px solid #E5E7EB;
}

.module-icon { font-size: 18px; }

.module-name { font-size: 15px; font-weight: 600; color: #344054; }

.module-code { 
  font-size: 12px; color: #667085; background: #E5E7EB; padding: 2px 8px; border-radius: 4px;
}

.module-permissions { display: flex; flex-direction: column; gap: 8px; }

.permission-item { 
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px; background: #fff; border-radius: 4px;
}

.permission-name { font-size: 14px; color: #344054; }

.permission-code { font-size: 12px; color: #667085; }

.permission-config { max-height: 500px; overflow-y: auto; }

.module-section { 
  margin-bottom: 20px; padding: 16px; background: #F9FAFB; border-radius: 8px;
}

.module-title-row { 
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}

.module-title { font-size: 15px; font-weight: 600; color: #344054; }

.permission-checkboxes { display: flex; flex-wrap: wrap; gap: 12px; }
</style>