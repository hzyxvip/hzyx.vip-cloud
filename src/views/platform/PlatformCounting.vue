<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const searchKeyword = ref('')
const activeCategory = ref('')

const activeQueryTab = ref('packing')

const packingQueryRows = ref([
  { leftUnit: '', rate: '', rightUnit: '' },
  { leftUnit: '', rate: '', rightUnit: '' },
  { leftUnit: '', rate: '', rightUnit: '' }
])

const conversionQueryRows = ref([
  { leftUnit: '', rate: '', rightUnit: '' },
  { leftUnit: '', rate: '', rightUnit: '' },
  { leftUnit: '', rate: '', rightUnit: '' }
])

const purchaseUnit = ref('')
const saleUnit = ref('')

const currentUserRole = ref(localStorage.getItem('userRole') || 'company_admin')
const isPlatformAdmin = computed(() => currentUserRole.value === 'admin' || currentUserRole.value === 'platform_admin')
const isCompanyAdmin = computed(() => currentUserRole.value === 'company_admin')

const userPermissions = computed(() => {
  const storedPermissions = localStorage.getItem('userPermissions')
  if (storedPermissions) {
    return JSON.parse(storedPermissions)
  }
  if (isPlatformAdmin.value) {
    return ['unit_view', 'unit_add', 'unit_edit', 'unit_delete', 'unit_sync']
  }
  if (isCompanyAdmin.value) {
    return ['unit_view', 'unit_add', 'unit_edit']
  }
  return ['unit_view']
})

const canView = computed(() => userPermissions.value.includes('unit_view'))
const canAdd = computed(() => userPermissions.value.includes('unit_add'))
const canEdit = computed(() => userPermissions.value.includes('unit_edit'))
const canDelete = computed(() => userPermissions.value.includes('unit_delete'))
const canSync = computed(() => userPermissions.value.includes('unit_sync'))

const showAddDialog = ref(false)
const showEditDialog = ref(false)

const addForm = ref({
  code: '',
  name: '',
  symbol: '',
  type: '',
  category: '',
  enableMulti: false,
  mainUnit: '',
  subUnit: '',
  conversionRate: ''
})

const editForm = ref({
  id: 0,
  code: '',
  name: '',
  symbol: '',
  type: '',
  category: '',
  enableMulti: false,
  mainUnit: '',
  subUnit: '',
  conversionRate: '',
  status: '',
  syncFromPlatform: false
})

const unitTypes = ['数量', '包装', '成套', '重量', '容积', '长度', '面积', '特殊', '设备']
const unitCategories = ['单件器械', '片状敷料', '液体/容器类', '重量单位', '容积单位', '长度单位', '面积单位', '检验/医用特殊', '设备仪器', '包装计价']

const tableData = ref([
  { id: 1, code: 'UNIT001', name: '个', symbol: '个', type: '数量', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 2, code: 'UNIT002', name: '包', symbol: '包', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '个', subUnit: '包', conversionRate: 10, syncFromPlatform: true },
  { id: 3, code: 'UNIT003', name: '盒', symbol: '盒', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '个', subUnit: '盒', conversionRate: 20, syncFromPlatform: true },
  { id: 4, code: 'UNIT004', name: '箱', symbol: '箱', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '个', subUnit: '箱', conversionRate: 100, syncFromPlatform: true },
  { id: 5, code: 'UNIT005', name: '套', symbol: '套', type: '成套', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 6, code: 'UNIT006', name: '支', symbol: '支', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '支', subUnit: '盒', conversionRate: 12, syncFromPlatform: true },
  { id: 7, code: 'UNIT007', name: '瓶', symbol: '瓶', type: '包装', category: '液体/容器类', status: '禁用', enableMulti: true, mainUnit: 'ml', subUnit: '瓶', conversionRate: 100, syncFromPlatform: true },
  { id: 8, code: 'UNIT008', name: 'kg', symbol: 'kg', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: 'g', subUnit: 'kg', conversionRate: 1000, syncFromPlatform: true },
  { id: 9, code: 'UNIT009', name: 'g', symbol: 'g', type: '重量', category: '重量单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 10, code: 'UNIT010', name: 'mg', symbol: 'mg', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: 'mg', subUnit: 'g', conversionRate: 1000, syncFromPlatform: true },
  { id: 11, code: 'UNIT011', name: 'μg', symbol: 'μg', type: '重量', category: '重量单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 12, code: 'UNIT012', name: 'L', symbol: 'L', type: '容积', category: '容积单位', status: '启用', enableMulti: true, mainUnit: 'ml', subUnit: 'L', conversionRate: 1000, syncFromPlatform: true },
  { id: 13, code: 'UNIT013', name: 'ml', symbol: 'ml', type: '容积', category: '容积单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 14, code: 'UNIT014', name: 'μL', symbol: 'μL', type: '容积', category: '容积单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 15, code: 'UNIT015', name: 'm', symbol: 'm', type: '长度', category: '长度单位', status: '启用', enableMulti: true, mainUnit: 'cm', subUnit: 'm', conversionRate: 100, syncFromPlatform: true },
  { id: 16, code: 'UNIT016', name: 'cm', symbol: 'cm', type: '长度', category: '长度单位', status: '启用', enableMulti: true, mainUnit: 'mm', subUnit: 'cm', conversionRate: 10, syncFromPlatform: true },
  { id: 17, code: 'UNIT017', name: 'mm', symbol: 'mm', type: '长度', category: '长度单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 18, code: 'UNIT018', name: '㎡', symbol: '㎡', type: '面积', category: '面积单位', status: '启用', enableMulti: true, mainUnit: 'c㎡', subUnit: '㎡', conversionRate: 10000, syncFromPlatform: true },
  { id: 19, code: 'UNIT019', name: 'c㎡', symbol: 'c㎡', type: '面积', category: '面积单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 20, code: 'UNIT020', name: '人份', symbol: '人份', type: '特殊', category: '检验/医用特殊', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 21, code: 'UNIT021', name: '次', symbol: '次', type: '特殊', category: '检验/医用特殊', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 22, code: 'UNIT022', name: '疗程', symbol: '疗程', type: '特殊', category: '检验/医用特殊', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 23, code: 'UNIT023', name: '台', symbol: '台', type: '设备', category: '设备仪器', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 24, code: 'UNIT024', name: '片', symbol: '片', type: '数量', category: '片状敷料', status: '启用', enableMulti: true, mainUnit: '片', subUnit: '盒', conversionRate: 50, syncFromPlatform: true },
  { id: 25, code: 'UNIT025', name: '张', symbol: '张', type: '数量', category: '片状敷料', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 26, code: 'UNIT026', name: '贴', symbol: '贴', type: '数量', category: '片状敷料', status: '启用', enableMulti: true, mainUnit: '贴', subUnit: '盒', conversionRate: 30, syncFromPlatform: true },
  { id: 27, code: 'UNIT027', name: '卷', symbol: '卷', type: '数量', category: '片状敷料', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 28, code: 'UNIT028', name: '根', symbol: '根', type: '数量', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 29, code: 'UNIT029', name: '枚', symbol: '枚', type: '数量', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 30, code: 'UNIT030', name: '管', symbol: '管', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '管', subUnit: '盒', conversionRate: 24, syncFromPlatform: true },
  { id: 31, code: 'UNIT031', name: '粒', symbol: '粒', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '粒', subUnit: '瓶', conversionRate: 100, syncFromPlatform: true },
  { id: 32, code: 'UNIT032', name: '丸', symbol: '丸', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '丸', subUnit: '瓶', conversionRate: 50, syncFromPlatform: true },
  { id: 33, code: 'UNIT033', name: '颗', symbol: '颗', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '颗', subUnit: '袋', conversionRate: 30, syncFromPlatform: true },
  { id: 34, code: 'UNIT034', name: '组', symbol: '组', type: '数量', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 35, code: 'UNIT035', name: '件', symbol: '件', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '件', subUnit: '箱', conversionRate: 50, syncFromPlatform: true },
  { id: 36, code: 'UNIT036', name: '单元', symbol: '单元', type: '数量', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 37, code: 'UNIT037', name: '桶', symbol: '桶', type: '包装', category: '液体/容器类', status: '启用', enableMulti: true, mainUnit: 'L', subUnit: '桶', conversionRate: 20, syncFromPlatform: true },
  { id: 38, code: 'UNIT038', name: '袋', symbol: '袋', type: '包装', category: '液体/容器类', status: '启用', enableMulti: true, mainUnit: 'g', subUnit: '袋', conversionRate: 500, syncFromPlatform: true },
  { id: 39, code: 'UNIT039', name: '罐', symbol: '罐', type: '包装', category: '液体/容器类', status: '启用', enableMulti: true, mainUnit: 'ml', subUnit: '罐', conversionRate: 250, syncFromPlatform: true },
  { id: 40, code: 'UNIT040', name: '大箱', symbol: '大箱', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '箱', subUnit: '大箱', conversionRate: 5, syncFromPlatform: true },
  { id: 41, code: 'UNIT041', name: '中箱', symbol: '中箱', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '箱', subUnit: '中箱', conversionRate: 2, syncFromPlatform: true },
  { id: 42, code: 'UNIT042', name: '小箱', symbol: '小箱', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '盒', subUnit: '小箱', conversionRate: 10, syncFromPlatform: true },
  { id: 43, code: 'UNIT043', name: '大包', symbol: '大包', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '小包', subUnit: '大包', conversionRate: 10, syncFromPlatform: true },
  { id: 44, code: 'UNIT044', name: '小包', symbol: '小包', type: '包装', category: '包装计价', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 45, code: 'UNIT045', name: '捆', symbol: '捆', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '根', subUnit: '捆', conversionRate: 50, syncFromPlatform: true },
  { id: 46, code: 'UNIT046', name: '扎', symbol: '扎', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '支', subUnit: '扎', conversionRate: 10, syncFromPlatform: true },
  { id: 47, code: 'UNIT047', name: '托盘', symbol: '托盘', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '盒', subUnit: '托盘', conversionRate: 24, syncFromPlatform: true },
  { id: 48, code: 'UNIT048', name: '塑封', symbol: '塑封', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '片', subUnit: '塑封', conversionRate: 50, syncFromPlatform: true },
  { id: 49, code: 'UNIT049', name: '整批', symbol: '整批', type: '包装', category: '包装计价', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 50, code: 'UNIT050', name: '板', symbol: '板', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '片', subUnit: '板', conversionRate: 10, syncFromPlatform: true },
  { id: 51, code: 'UNIT051', name: '排', symbol: '排', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '片', subUnit: '排', conversionRate: 5, syncFromPlatform: true },
  { id: 52, code: 'UNIT052', name: '层', symbol: '层', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '盒', subUnit: '层', conversionRate: 6, syncFromPlatform: true },
  { id: 53, code: 'UNIT053', name: '托', symbol: '托', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '盒', subUnit: '托', conversionRate: 4, syncFromPlatform: true },
  { id: 54, code: 'UNIT054', name: '塑封袋', symbol: '塑封袋', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '个', subUnit: '塑封袋', conversionRate: 20, syncFromPlatform: true },
  { id: 55, code: 'UNIT055', name: '周转箱', symbol: '周转箱', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '箱', subUnit: '周转箱', conversionRate: 2, syncFromPlatform: true },
  { id: 56, code: 'UNIT056', name: '纸箱', symbol: '纸箱', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '箱', subUnit: '纸箱', conversionRate: 1, syncFromPlatform: true },
  { id: 57, code: 'UNIT057', name: '塑盒', symbol: '塑盒', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '片', subUnit: '塑盒', conversionRate: 20, syncFromPlatform: true },
  { id: 58, code: 'UNIT058', name: '铝箔袋', symbol: '铝箔袋', type: '包装', category: '包装计价', status: '启用', enableMulti: true, mainUnit: '粒', subUnit: '铝箔袋', conversionRate: 10, syncFromPlatform: true },
  { id: 59, code: 'UNIT059', name: '微克', symbol: '微克', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: '微克', subUnit: '毫克', conversionRate: 1000, syncFromPlatform: true },
  { id: 60, code: 'UNIT060', name: '毫克', symbol: '毫克', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: '毫克', subUnit: '克', conversionRate: 1000, syncFromPlatform: true },
  { id: 61, code: 'UNIT061', name: '克', symbol: '克', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: '克', subUnit: '千克', conversionRate: 1000, syncFromPlatform: true },
  { id: 62, code: 'UNIT062', name: '千克', symbol: '千克', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: '千克', subUnit: '吨', conversionRate: 1000, syncFromPlatform: true },
  { id: 63, code: 'UNIT063', name: '吨', symbol: '吨', type: '重量', category: '重量单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 64, code: 'UNIT064', name: '微升', symbol: '微升', type: '容积', category: '容积单位', status: '启用', enableMulti: true, mainUnit: '微升', subUnit: '毫升', conversionRate: 1000, syncFromPlatform: true },
  { id: 65, code: 'UNIT065', name: '毫升', symbol: '毫升', type: '容积', category: '容积单位', status: '启用', enableMulti: true, mainUnit: '毫升', subUnit: '升', conversionRate: 1000, syncFromPlatform: true },
  { id: 66, code: 'UNIT066', name: '升', symbol: '升', type: '容积', category: '容积单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 67, code: 'UNIT067', name: '毫米', symbol: '毫米', type: '长度', category: '长度单位', status: '启用', enableMulti: true, mainUnit: '毫米', subUnit: '厘米', conversionRate: 10, syncFromPlatform: true },
  { id: 68, code: 'UNIT068', name: '厘米', symbol: '厘米', type: '长度', category: '长度单位', status: '启用', enableMulti: true, mainUnit: '厘米', subUnit: '米', conversionRate: 100, syncFromPlatform: true },
  { id: 69, code: 'UNIT069', name: '米', symbol: '米', type: '长度', category: '长度单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 70, code: 'UNIT070', name: '平方厘米', symbol: 'c㎡', type: '面积', category: '面积单位', status: '启用', enableMulti: true, mainUnit: '平方厘米', subUnit: '平方米', conversionRate: 10000, syncFromPlatform: true },
  { id: 71, code: 'UNIT071', name: '平方米', symbol: '㎡', type: '面积', category: '面积单位', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 72, code: 'UNIT072', name: 'cc', symbol: 'cc', type: '容积', category: '容积单位', status: '启用', enableMulti: true, mainUnit: 'ml', subUnit: 'cc', conversionRate: 1, syncFromPlatform: true },
  { id: 73, code: 'UNIT073', name: 't', symbol: 't', type: '重量', category: '重量单位', status: '启用', enableMulti: true, mainUnit: 'kg', subUnit: 't', conversionRate: 1000, syncFromPlatform: true },
  { id: 74, code: 'UNIT074', name: '柄', symbol: '柄', type: '数量', category: '单件器械', status: '启用', enableMulti: false, mainUnit: '', subUnit: '', conversionRate: '', syncFromPlatform: true },
  { id: 75, code: 'UNIT075', name: '条', symbol: '条', type: '数量', category: '单件器械', status: '启用', enableMulti: true, mainUnit: '条', subUnit: '包', conversionRate: 20, syncFromPlatform: true }
])

const allUnitNames = computed(() => {
  return tableData.value.map(item => item.name)
})

const filteredData = computed(() => {
  return tableData.value.filter(item => {
    const matchKeyword = !searchKeyword.value || 
      item.name.includes(searchKeyword.value) || 
      item.symbol.includes(searchKeyword.value) ||
      item.code.includes(searchKeyword.value)
    const matchCategory = !activeCategory.value || item.category === activeCategory.value
    
    const currentQueryRows = activeQueryTab.value === 'packing' ? packingQueryRows.value : conversionQueryRows.value
    const matchConversion = currentQueryRows.every(row => {
      if (!row.leftUnit && !row.rightUnit && !row.rate) return true
      
      const hasLeftMatch = !row.leftUnit || item.mainUnit === row.leftUnit || item.subUnit === row.leftUnit
      const hasRightMatch = !row.rightUnit || item.mainUnit === row.rightUnit || item.subUnit === row.rightUnit
      const hasRateMatch = !row.rate || String(item.conversionRate) === String(row.rate)
      
      return hasLeftMatch && hasRightMatch && hasRateMatch
    })
    
    return matchKeyword && matchCategory && matchConversion
  })
})

const clearPackingRow = (index: number) => {
  packingQueryRows.value[index] = { leftUnit: '', rate: '', rightUnit: '' }
}

const clearConversionRow = (index: number) => {
  conversionQueryRows.value[index] = { leftUnit: '', rate: '', rightUnit: '' }
}

const resetQuery = () => {
  packingQueryRows.value = [
    { leftUnit: '', rate: '', rightUnit: '' },
    { leftUnit: '', rate: '', rightUnit: '' },
    { leftUnit: '', rate: '', rightUnit: '' }
  ]
  conversionQueryRows.value = [
    { leftUnit: '', rate: '', rightUnit: '' },
    { leftUnit: '', rate: '', rightUnit: '' },
    { leftUnit: '', rate: '', rightUnit: '' }
  ]
  searchKeyword.value = ''
  activeCategory.value = ''
  purchaseUnit.value = ''
  saleUnit.value = ''
}

const groupedData = computed(() => {
  const groups: Record<string, typeof tableData.value> = {}
  filteredData.value.forEach(item => {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
  })
  return groups
})

const handleAddUnit = () => {
  showAddDialog.value = true
}

const handleCloseAddDialog = () => {
  showAddDialog.value = false
  addForm.value = {
    code: '',
    name: '',
    symbol: '',
    type: '',
    category: '',
    enableMulti: false,
    mainUnit: '',
    subUnit: '',
    conversionRate: ''
  }
}

const handleSubmitAdd = () => {
  if (!addForm.value.name.trim()) {
    ElMessage.warning('请输入单位名称')
    return
  }
  if (!addForm.value.category) {
    ElMessage.warning('请选择分类')
    return
  }
  if (!addForm.value.type) {
    ElMessage.warning('请选择单位类型')
    return
  }
  
  if (allUnitNames.value.includes(addForm.value.name)) {
    ElMessage.warning('该单位名称已存在')
    return
  }
  
  if (addForm.value.enableMulti) {
    if (!addForm.value.mainUnit) {
      ElMessage.warning('请输入主计量单位')
      return
    }
    if (!addForm.value.subUnit) {
      ElMessage.warning('请输入辅计量单位')
      return
    }
    if (!addForm.value.conversionRate || parseFloat(addForm.value.conversionRate) <= 0) {
      ElMessage.warning('请输入有效的换算率')
      return
    }
  }
  
  const newId = tableData.value.length > 0 ? Math.max(...tableData.value.map(item => item.id)) + 1 : 1
  const newCode = `UNIT${String(newId).padStart(3, '0')}`
  
  tableData.value.push({
    id: newId,
    code: newCode,
    name: addForm.value.name,
    symbol: addForm.value.symbol || addForm.value.name,
    type: addForm.value.type,
    category: addForm.value.category,
    status: '启用',
    enableMulti: addForm.value.enableMulti,
    mainUnit: addForm.value.mainUnit,
    subUnit: addForm.value.subUnit,
    conversionRate: addForm.value.conversionRate ? parseFloat(addForm.value.conversionRate) : '',
    syncFromPlatform: false
  })
  
  ElMessage.success('添加成功')
  handleCloseAddDialog()
}

const handleEditUnit = (row: any) => {
  editForm.value = { ...row }
  showEditDialog.value = true
}

const handleCloseEditDialog = () => {
  showEditDialog.value = false
}

const handleSubmitEdit = () => {
  const index = tableData.value.findIndex(item => item.id === editForm.value.id)
  if (index !== -1) {
    if (editForm.value.enableMulti) {
      if (!editForm.value.mainUnit || !editForm.value.subUnit) {
        ElMessage.warning('请填写主辅计量单位')
        return
      }
    }
    
    tableData.value[index] = {
      ...tableData.value[index],
      name: editForm.value.name,
      symbol: editForm.value.symbol || editForm.value.name,
      type: editForm.value.type,
      category: editForm.value.category,
      enableMulti: editForm.value.enableMulti,
      mainUnit: editForm.value.enableMulti ? editForm.value.mainUnit : '',
      subUnit: editForm.value.enableMulti ? editForm.value.subUnit : '',
      conversionRate: editForm.value.enableMulti ? editForm.value.conversionRate : ''
    }
    
    ElMessage.success('修改成功')
    handleCloseEditDialog()
  }
}

const handleDeleteUnit = (row: any) => {
  if (row.status === '启用') {
    ElMessage.warning('启用状态的单位不能删除，请先禁用')
    return
  }
  
  if (row.syncFromPlatform) {
    ElMessage.warning('平台同步的单位不能删除，请联系平台管理员')
    return
  }
  
  ElMessageBox.confirm(`确定要删除计量单位 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    tableData.value = tableData.value.filter(item => item.id !== row.id)
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleToggleMulti = (row: any) => {
  row.enableMulti = !row.enableMulti
  if (!row.enableMulti) {
    row.mainUnit = ''
    row.subUnit = ''
    row.conversionRate = ''
  }
}

const handleToggleStatus = (row: any) => {
  row.status = row.status === '启用' ? '禁用' : '启用'
  ElMessage.success(`${row.name}已${row.status}`)
}

const getTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    '数量': 'primary',
    '包装': 'warning',
    '成套': 'info',
    '重量': 'success',
    '容积': 'success',
    '长度': 'success',
    '面积': 'success',
    '特殊': 'danger',
    '设备': 'info'
  }
  return tagMap[type] || 'info'
}

const handleSyncFromPlatform = () => {
  ElMessage.success('已从平台同步最新单位数据')
}

const getConversionDisplay = (row: any) => {
  if (!row.enableMulti || !row.mainUnit || !row.subUnit || !row.conversionRate) {
    return '-'
  }
  return `${row.conversionRate} ${row.mainUnit} = 1 ${row.subUnit}`
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>辅助单位换算</h1>
        <div class="breadcrumb">首页 / 平台管理 / 数据维护 / 辅助单位换算</div>
      </div>
      <div class="header-actions">
        <el-button v-if="canSync" @click="handleSyncFromPlatform" icon="Refresh">同步平台单位</el-button>
        <el-button v-if="canAdd" type="primary" @click="handleAddUnit">新增单位</el-button>
      </div>
    </div>
    
    <div class="search-form">
      <div class="quick-search">
        <el-input 
          v-model="searchKeyword" 
          placeholder="单位名称/符号/编码" 
          class="input-long"
          clearable
        />
        <el-select v-model="activeCategory" placeholder="选择分类" class="input-normal" clearable>
          <el-option v-for="cat in unitCategories" :key="cat" :label="cat" :value="cat" />
        </el-select>
      </div>
      
      <div class="advanced-search">
        <div class="query-title">辅助单位换算查询</div>
        <el-tabs v-model="activeQueryTab" class="query-tabs">
          <el-tab-pane label="上级包装单位" name="packing">
            <div class="conversion-rows">
              <div class="conversion-row" v-for="(row, index) in packingQueryRows" :key="index">
                <span class="row-number">{{ index + 1 }}</span>
                <el-input v-model="row.leftUnit" placeholder="上级单位" class="input-short" />
                <span class="conversion-operator">=</span>
                <el-input v-model="row.rate" type="number" placeholder="换算率" class="input-xs" />
                <span class="conversion-operator">×</span>
                <el-input v-model="row.rightUnit" placeholder="下级单位" class="input-short" />
                <el-button type="text" @click="clearPackingRow(index)" class="clear-btn">清空</el-button>
              </div>
            </div>
          </el-tab-pane>
          <el-tab-pane label="计量单位换算率" name="conversion">
            <div class="conversion-rows">
              <div class="conversion-row" v-for="(row, index) in conversionQueryRows" :key="index">
                <span class="row-number">{{ index + 1 }}</span>
                <el-input v-model="row.leftUnit" placeholder="主单位" class="input-short" />
                <span class="conversion-operator">=</span>
                <el-input v-model="row.rate" type="number" placeholder="换算率" class="input-xs" />
                <span class="conversion-operator">×</span>
                <el-input v-model="row.rightUnit" placeholder="辅单位" class="input-short" />
                <el-button type="text" @click="clearConversionRow(index)" class="clear-btn">清空</el-button>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
        
        <div class="purchase-sale-row">
          <div class="purchase-sale-item">
            <span class="field-label">采购单位</span>
            <el-input v-model="purchaseUnit" placeholder="采购单位" class="input-short" />
          </div>
          <div class="purchase-sale-item">
            <span class="field-label">销售单位</span>
            <el-input v-model="saleUnit" placeholder="销售单位" class="input-short" />
          </div>
        </div>
        
        <div class="query-actions">
          <el-button type="text" icon="Refresh" @click="resetQuery">清空</el-button>
          <el-button type="primary" icon="Search">查询</el-button>
        </div>
      </div>
    </div>
    
    <div class="unit-section">
      <div 
        v-for="(items, category) in groupedData" 
        :key="category" 
        class="category-card"
      >
        <div class="category-header">
          <span class="category-icon">📦</span>
          <span class="category-name">{{ category }}</span>
          <span class="unit-count">{{ items.length }}个单位</span>
        </div>
        
        <div class="unit-grid">
          <div 
            v-for="item in items" 
            :key="item.id" 
            class="unit-card"
            :class="{ 'unit-card-disabled': item.status === '禁用' }"
          >
            <div class="unit-header">
              <div class="unit-info">
                <span class="unit-symbol">{{ item.symbol }}</span>
                <span class="unit-name">{{ item.name }}</span>
                <el-tag :type="getTypeTag(item.type)" size="small">{{ item.type }}</el-tag>
              </div>
              <div class="unit-status">
                <el-switch 
                  v-if="canEdit"
                  :active-value="'启用'" 
                  :inactive-value="'禁用'"
                  :value="item.status"
                  @change="handleToggleStatus(item)"
                  size="small"
                />
                <el-tag v-else :type="item.status === '启用' ? 'success' : 'info'" size="small">
                  {{ item.status }}
                </el-tag>
              </div>
            </div>
            
            <div class="unit-detail" v-if="item.enableMulti && item.mainUnit && item.subUnit">
              <div class="conversion-row">
                <span class="conversion-label">换算关系:</span>
                <span class="conversion-value">{{ item.conversionRate }} {{ item.mainUnit }} = 1 {{ item.subUnit }}</span>
              </div>
              <div class="unit-types">
                <span class="type-item">
                  <span class="type-label">主单位:</span>
                  <span class="type-value">{{ item.mainUnit }}</span>
                </span>
                <span class="type-item">
                  <span class="type-label">辅单位:</span>
                  <span class="type-value">{{ item.subUnit }}</span>
                </span>
              </div>
            </div>
            
            <div class="unit-detail" v-else-if="!item.enableMulti">
              <div class="single-unit">单单位模式</div>
            </div>
            
            <div class="unit-actions">
              <el-switch 
                v-if="canEdit"
                v-model="item.enableMulti" 
                @change="handleToggleMulti(item)"
                active-text="启用换算"
                inactive-text="单单位"
                size="small"
              />
              <el-button v-if="canEdit" type="text" size="small" @click="handleEditUnit(item)">编辑</el-button>
              <el-button 
                v-if="canDelete"
                type="text" 
                size="small" 
                :disabled="item.status === '启用' || (item.syncFromPlatform && !isPlatformAdmin)"
                @click="handleDeleteUnit(item)"
              >删除</el-button>
            </div>
            
            <div class="unit-source" v-if="item.syncFromPlatform">
              <el-tag type="primary" size="small">平台同步</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="tips-card">
      <el-alert 
        title="提示" 
        type="info" 
        :closable="false"
      >
        <ul style="margin: 0; padding-left: 20px;">
          <li v-if="isPlatformAdmin">您是平台管理员，可以管理所有单位数据</li>
          <li v-if="isCompanyAdmin">您是企业管理员，可以添加和编辑自定义单位，平台同步的单位不可删除</li>
          <li v-if="!canEdit && canView">您只有查看权限，如需编辑请联系管理员</li>
          <li>平台单位会自动同步到各用户，作为可选单位使用</li>
          <li>启用状态的单位不能删除，请先禁用</li>
          <li>启用多单位后，可设置主辅单位及换算率</li>
        </ul>
      </el-alert>
    </div>
    
    <el-dialog 
      title="新增计量单位" 
      v-model="showAddDialog" 
      width="480px"
      @close="handleCloseAddDialog"
    >
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="单位名称" required>
          <el-input v-model="addForm.name" placeholder="请输入单位名称" class="input-full" />
        </el-form-item>
        <el-form-item label="单位符号">
          <el-input v-model="addForm.symbol" placeholder="如: kg、个、盒" class="input-short" />
        </el-form-item>
        <el-form-item label="单位类型" required>
          <el-select v-model="addForm.type" class="input-full">
            <el-option v-for="type in unitTypes" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属分类" required>
          <el-select v-model="addForm.category" class="input-full">
            <el-option v-for="cat in unitCategories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用辅助单位">
          <el-switch v-model="addForm.enableMulti" active-text="是" inactive-text="否" />
        </el-form-item>
        <div v-if="addForm.enableMulti" class="multi-unit-section">
          <el-form-item label="主计量单位">
            <el-input v-model="addForm.mainUnit" placeholder="如: g、ml、个" class="input-short" />
          </el-form-item>
          <el-form-item label="辅计量单位">
            <el-input v-model="addForm.subUnit" placeholder="如: kg、L、盒" class="input-short" />
          </el-form-item>
          <el-form-item label="换算率">
            <div class="conversion-input">
              <el-input v-model="addForm.conversionRate" placeholder="请输入换算率" class="input-short" />
              <span class="conversion-hint">主单位数量 = 辅单位数量 × 换算率</span>
            </div>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseAddDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmitAdd">确定</el-button>
      </template>
    </el-dialog>
    
    <el-dialog 
      title="编辑计量单位" 
      v-model="showEditDialog" 
      width="480px"
      @close="handleCloseEditDialog"
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="单位编码">
          <el-input v-model="editForm.code" disabled class="input-short" />
        </el-form-item>
        <el-form-item label="单位名称" required>
          <el-input v-model="editForm.name" placeholder="请输入单位名称" class="input-full" />
        </el-form-item>
        <el-form-item label="单位符号">
          <el-input v-model="editForm.symbol" placeholder="如: kg、个、盒" class="input-short" />
        </el-form-item>
        <el-form-item label="单位类型" required>
          <el-select v-model="editForm.type" class="input-full">
            <el-option v-for="type in unitTypes" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属分类" required>
          <el-select v-model="editForm.category" class="input-full">
            <el-option v-for="cat in unitCategories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用辅助单位">
          <el-switch v-model="editForm.enableMulti" active-text="是" inactive-text="否" />
        </el-form-item>
        <div v-if="editForm.enableMulti" class="multi-unit-section">
          <el-form-item label="主计量单位">
            <el-input v-model="editForm.mainUnit" placeholder="如: g、ml、个" class="input-short" />
          </el-form-item>
          <el-form-item label="辅计量单位">
            <el-input v-model="editForm.subUnit" placeholder="如: kg、L、盒" class="input-short" />
          </el-form-item>
          <el-form-item label="换算率">
            <div class="conversion-input">
              <el-input v-model="editForm.conversionRate" placeholder="请输入换算率" class="input-short" />
              <span class="conversion-hint">主单位数量 = 辅单位数量 × 换算率</span>
            </div>
          </el-form-item>
        </div>
        <el-form-item label="状态">
          <el-tag :type="editForm.status === '启用' ? 'success' : 'info'">{{ editForm.status }}</el-tag>
        </el-form-item>
        <el-form-item label="来源">
          <el-tag :type="editForm.syncFromPlatform ? 'primary' : 'info'">
            {{ editForm.syncFromPlatform ? '平台同步' : '自定义' }}
          </el-tag>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseEditDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmitEdit">确定</el-button>
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

.header-actions { display: flex; gap: 12px; }

.search-form { 
  background: #fff; border-radius: 8px; margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
}

.quick-search { 
  display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid #F2F4F7;
}

.advanced-search { 
  padding: 16px;
}

.query-title { 
  font-size: 14px; font-weight: 600; color: #344054; margin-bottom: 12px;
}

.query-tabs { 
  margin-bottom: 16px;
  
  :deep(.el-tabs__header) { 
    margin-bottom: 12px; 
  }
  
  :deep(.el-tabs__item) { 
    font-size: 13px; 
  }
}

.conversion-rows { 
  display: flex; flex-direction: column; gap: 12px; 
}

.conversion-row { 
  display: flex; align-items: center; gap: 8px; 
}

.row-number { 
  width: 24px; height: 24px; line-height: 24px; 
  text-align: center; background: #E55353; color: #fff; 
  border-radius: 50%; font-size: 12px; font-weight: 600; 
}

.unit-input { 
  width: 100px; 
}

.rate-input { 
  width: 80px; 
}

.conversion-operator { 
  color: #667085; font-weight: 500; font-size: 14px; 
}

.clear-btn { 
  color: #98A2B3; font-size: 12px; 
  
  &:hover { 
    color: #00bfa5; 
  }
}

.purchase-sale-row { 
  display: flex; gap: 32px; margin-top: 16px; 
  padding-top: 16px; border-top: 1px dashed #E5E7EB; 
}

.purchase-sale-item { 
  display: flex; align-items: center; gap: 8px; 
}

.field-label { 
  font-size: 13px; color: #667085; font-weight: 500; 
}

.purchase-sale-input { 
  width: 150px; 
}

.query-actions { 
  display: flex; justify-content: flex-end; gap: 12px; margin-top: 16px; 
  padding-top: 16px; border-top: 1px solid #F2F4F7; 
}

.unit-section { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }

.category-card { 
  background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.category-header { 
  display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding-bottom: 12px;
  border-bottom: 1px solid #F2F4F7;
}

.category-icon { font-size: 18px; }

.category-name { font-size: 15px; font-weight: 600; color: #344054; }

.unit-count { font-size: 13px; color: #667085; background: #F5F7FA; padding: 2px 8px; border-radius: 10px; }

.unit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }

.unit-card { 
  background: #F9FAFB; border-radius: 8px; padding: 12px; position: relative;
  border: 1px solid #E5E7EB; transition: all 0.2s;
}

.unit-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

.unit-card-disabled { opacity: 0.6; }

.unit-header { display: flex; justify-content: space-between; align-items: flex-start; }

.unit-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.unit-symbol { font-size: 20px; font-weight: 600; color: #00bfa5; }

.unit-name { font-size: 14px; font-weight: 500; color: #344054; }

.unit-detail { margin: 12px 0; padding-top: 12px; border-top: 1px dashed #E5E7EB; }

.conversion-row { margin-bottom: 8px; }

.conversion-label { font-size: 12px; color: #667085; margin-right: 8px; }

.conversion-value { font-size: 13px; font-weight: 500; color: #344054; }

.unit-types { display: flex; gap: 16px; }

.type-item { display: flex; gap: 4px; }

.type-label { font-size: 12px; color: #667085; }

.type-value { font-size: 12px; font-weight: 500; color: #00bfa5; }

.single-unit { font-size: 13px; color: #999; }

.unit-actions { display: flex; justify-content: flex-end; gap: 8px; }

.unit-source { position: absolute; top: 8px; right: 8px; }

.tips-card { 
  background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.multi-unit-section { background: #F9FAFB; padding: 12px; border-radius: 8px; margin-top: 8px; }

.conversion-input { display: flex; align-items: center; gap: 12px; }

.conversion-hint { font-size: 12px; color: #667085; }
</style>