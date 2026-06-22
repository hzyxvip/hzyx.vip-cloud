<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, ArrowDown, ArrowUp, Plus, Download, Upload } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { warehouses, warehouseStore, refreshData, getCurrentCompany } from '@/utils/dataStore'
import { useTableStyle } from '@/composables/useTableStyle'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchKeyword = ref('')
const showActiveOnly = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const dialogVisible = ref(false)
const isEditing = ref(false)
const selectedIds = ref<number[]>([])
const selectAll = ref(false)
const showFilter = ref(false)
const selectedCategory = ref('全部')

interface EditForm {
  id: number | null
  code: string
  name: string
  category: string
  manager: string
  phone: string
  mobile: string
  province: string
  city: string
  district: string
  address: string
  remark: string
  allowNegativeStock: boolean
  isPublic: boolean
  status: string
}

const editForm = ref<EditForm>({
  id: null,
  code: '',
  name: '',
  category: '企业',
  manager: '',
  phone: '',
  mobile: '',
  province: '',
  city: '',
  district: '',
  address: '',
  remark: '',
  allowNegativeStock: false,
  isPublic: false,
  status: '启用'
})

const { columnWidths, handleHeaderDragend } = useTableStyle('warehouse-data', [
  { key: 'selection', label: '', defaultWidth: 50 },
  { key: 'action', label: '操作', defaultWidth: 80 },
  { key: 'code', label: '仓库编码', defaultWidth: 120 },
  { key: 'name', label: '仓库名称', defaultWidth: 150 },
  { key: 'allowNegativeStock', label: '允许负库存', defaultWidth: 100 },
  { key: 'companyManage', label: '适用企业管理', defaultWidth: 120 },
  { key: 'isPublic', label: '公用', defaultWidth: 80 },
  { key: 'manager', label: '主管', defaultWidth: 100 },
  { key: 'mobile', label: '手机', defaultWidth: 120 },
  { key: 'phone', label: '电话', defaultWidth: 120 },
  { key: 'address', label: '地址', defaultWidth: 200 },
  { key: 'remark', label: '备注', defaultWidth: 150 },
  { key: 'status', label: '状态', defaultWidth: 80 }
])

const categories = ref([
  {
    label: '企业',
    children: [
      { label: '全部', value: '全部' }
    ]
  }
])

const provinces = ['北京市', '天津市', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省', '黑龙江省', '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省', '重庆市', '四川省', '贵州省', '云南省', '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区']
const cities: Record<string, string[]> = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '顺义区'],
  '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区'],
  '河北省': ['石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市'],
  '山西省': ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市'],
  '内蒙古自治区': ['呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市'],
  '辽宁省': ['沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市'],
  '吉林省': ['长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市'],
  '黑龙江省': ['哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '浦东新区'],
  '江苏省': ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市'],
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市'],
  '安徽省': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市'],
  '福建省': ['福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市'],
  '江西省': ['南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市'],
  '山东省': ['济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市'],
  '河南省': ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市'],
  '湖北省': ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市'],
  '湖南省': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市'],
  '广东省': ['广州市', '深圳市', '珠海市', '汕头市', '佛山市', '韶关市'],
  '广西壮族自治区': ['南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市'],
  '海南省': ['海口市', '三亚市', '三沙市', '儋州市'],
  '重庆市': ['万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区'],
  '四川省': ['成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市'],
  '贵州省': ['贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市'],
  '云南省': ['昆明市', '曲靖市', '玉溪市', '保山市', '昭通市'],
  '西藏自治区': ['拉萨市', '日喀则市', '昌都市', '林芝市'],
  '陕西省': ['西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市'],
  '甘肃省': ['兰州市', '嘉峪关市', '金昌市', '白银市', '天水市'],
  '青海省': ['西宁市', '海东市'],
  '宁夏回族自治区': ['银川市', '石嘴山市', '吴忠市', '固原市'],
  '新疆维吾尔自治区': ['乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市']
}
const districts: Record<string, string[]> = {
  '杭州市': ['上城区', '下城区', '江干区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区'],
  '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区'],
  '温州市': ['鹿城区', '龙湾区', '瓯海区', '洞头区', '瑞安市', '乐清市'],
  '广州市': ['荔湾区', '越秀区', '海珠区', '天河区', '白云区', '黄埔区'],
  '深圳市': ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '龙华区'],
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区'],
  '南京市': ['玄武区', '秦淮区', '建邺区', '鼓楼区', '浦口区', '栖霞区'],
  '苏州市': ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '昆山市'],
  '成都市': ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区'],
  '武汉市': ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区'],
  '天津市': ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区'],
  '重庆市': ['渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区'],
  '石家庄市': ['长安区', '桥西区', '新华区', '裕华区', '井陉矿区'],
  '沈阳市': ['和平区', '沈河区', '大东区', '皇姑区', '铁西区'],
  '长春市': ['南关区', '宽城区', '朝阳区', '二道区', '绿园区'],
  '哈尔滨市': ['道里区', '南岗区', '道外区', '平房区', '松北区'],
  '合肥市': ['瑶海区', '庐阳区', '蜀山区', '包河区'],
  '福州市': ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区'],
  '厦门市': ['思明区', '海沧区', '湖里区', '集美区', '同安区'],
  '南昌市': ['东湖区', '西湖区', '青云谱区', '湾里区', '青山湖区'],
  '济南市': ['历下区', '市中区', '槐荫区', '天桥区', '历城区'],
  '青岛市': ['市南区', '市北区', '黄岛区', '崂山区', '李沧区'],
  '郑州市': ['中原区', '二七区', '管城回族区', '金水区', '上街区'],
  '长沙市': ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区'],
  '南宁市': ['兴宁区', '青秀区', '江南区', '西乡塘区', '良庆区'],
  '西安市': ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区'],
  '兰州市': ['城关区', '七里河区', '西固区', '安宁区'],
  '贵阳市': ['南明区', '云岩区', '花溪区', '乌当区', '白云区'],
  '昆明市': ['五华区', '盘龙区', '官渡区', '西山区', '呈贡区'],
  '银川市': ['兴庆区', '西夏区', '金凤区'],
  '乌鲁木齐市': ['天山区', '沙依巴克区', '新市区', '水磨沟区']
}

const filteredWarehouses = computed(() => {
  const currentCompanyId = getCurrentCompany()
  let data = warehouses.value.filter(w => w.companyId === currentCompanyId)

  if (showActiveOnly.value) {
    data = data.filter(w => w.status === '启用')
  }

  if (!searchKeyword.value) return data

  const keyword = searchKeyword.value.toLowerCase()
  return data.filter(w =>
    w.code.toLowerCase().includes(keyword) ||
    w.name.toLowerCase().includes(keyword) ||
    (w.manager && w.manager.toLowerCase().includes(keyword)) ||
    (w.phone && w.phone.toLowerCase().includes(keyword)) ||
    (w.address && w.address.toLowerCase().includes(keyword))
  )
})

const total = computed(() => filteredWarehouses.value.length)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredWarehouses.value.slice(start, end)
})

const handleSearch = () => {
  currentPage.value = 1
}

const handleReset = () => {
  searchKeyword.value = ''
  showActiveOnly.value = true
  currentPage.value = 1
}

const handleAdd = () => {
  isEditing.value = false
  editForm.value = {
    id: null,
    code: '',
    name: '',
    category: '企业',
    manager: '',
    phone: '',
    mobile: '',
    province: '',
    city: '',
    district: '',
    address: '',
    remark: '',
    allowNegativeStock: false,
    isPublic: false,
    status: '启用'
  }
  dialogVisible.value = true
}

const handleEdit = (row: typeof warehouses.value[0]) => {
  isEditing.value = true
  const addrParts = row.address ? row.address.split(' ') : []
  editForm.value = {
    id: row.id,
    code: row.code,
    name: row.name,
    category: '企业',
    manager: row.manager || '',
    phone: row.phone || '',
    mobile: '',
    province: addrParts[0] || '',
    city: addrParts[1] || '',
    district: addrParts[2] || '',
    address: addrParts.slice(3).join(' ') || '',
    remark: '',
    allowNegativeStock: row.allowNegativeStock || false,
    isPublic: false,
    status: row.status || '启用'
  }
  dialogVisible.value = true
}

const handleViewDetails = (row: typeof warehouses.value[0]) => {
  router.push(`/data/warehouse/${row.id}`)
}

const handleSave = () => {
  if (!editForm.value.code || !editForm.value.name) {
    ElMessage.warning('请填写仓库编码和仓库名称')
    return
  }

  const codeExists = warehouses.value.some(w => w.code === editForm.value.code && w.id !== editForm.value.id)
  if (codeExists) {
    ElMessage.warning('仓库编码已存在')
    return
  }

  const nameExists = warehouses.value.some(w => w.name === editForm.value.name && w.id !== editForm.value.id)
  if (nameExists) {
    ElMessage.warning('仓库名称已存在')
    return
  }

  const fullAddress = [editForm.value.province, editForm.value.city, editForm.value.district, editForm.value.address].filter(Boolean).join(' ')

  if (isEditing.value && editForm.value.id) {
    warehouseStore.update(editForm.value.id, {
      code: editForm.value.code,
      name: editForm.value.name,
      manager: editForm.value.manager,
      phone: editForm.value.phone,
      address: fullAddress,
      status: editForm.value.status,
      allowNegativeStock: editForm.value.allowNegativeStock
    })
    ElMessage.success('编辑成功')
  } else {
    warehouseStore.add({
      companyId: getCurrentCompany(),
      code: editForm.value.code,
      name: editForm.value.name,
      manager: editForm.value.manager,
      phone: editForm.value.phone,
      address: fullAddress,
      status: '启用',
      allowNegativeStock: editForm.value.allowNegativeStock
    })
    ElMessage.success('新增成功')
  }

  dialogVisible.value = false
}

const handleSaveAndNew = () => {
  handleSave()
  if (!dialogVisible.value) {
    handleAdd()
  }
}

const handleDelete = (row: typeof warehouses.value[0]) => {
  ElMessageBox.confirm(`确定删除仓库 "${row.name}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    warehouseStore.delete(row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

const handleToggleStatus = (row: typeof warehouses.value[0]) => {
  const newStatus = row.status === '启用' ? '停用' : '启用'
  warehouseStore.update(row.id, { status: newStatus })
  ElMessage.success(newStatus === '启用' ? '已启用' : '已停用')
}

const handleBatchEnable = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要启用的仓库')
    return
  }
  selectedIds.value.forEach(id => {
    warehouseStore.update(id, { status: '启用' })
  })
  ElMessage.success(`成功启用 ${selectedIds.value.length} 个仓库`)
  selectedIds.value = []
  selectAll.value = false
}

const handleBatchDisable = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要禁用的仓库')
    return
  }
  selectedIds.value.forEach(id => {
    warehouseStore.update(id, { status: '停用' })
  })
  ElMessage.success(`成功禁用 ${selectedIds.value.length} 个仓库`)
  selectedIds.value = []
  selectAll.value = false
}

const handleBatchDelete = () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的仓库')
    return
  }
  ElMessageBox.confirm(`确定删除选中的 ${selectedIds.value.length} 个仓库吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    selectedIds.value.forEach(id => warehouseStore.delete(id))
    ElMessage.success(`成功删除 ${selectedIds.value.length} 个仓库`)
    selectedIds.value = []
    selectAll.value = false
  }).catch(() => {})
}

const handleRefresh = () => {
  refreshData()
  currentPage.value = 1
  selectedIds.value = []
  selectAll.value = false
  ElMessage.success('刷新成功')
}

const exportToExcel = () => {
  const exportData = filteredWarehouses.value.map((item, index) => ({
    '行号': index + 1,
    '仓库编码': item.code,
    '仓库名称': item.name,
    '允许负库存': item.allowNegativeStock ? '是' : '否',
    '主管': item.manager || '',
    '手机': item.phone || '',
    '地址': item.address || '',
    '备注': '',
    '状态': item.status
  }))

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '仓库管理')

  const now = new Date()
  const month = now.getMonth() + 1 < 10 ? '0' + (now.getMonth() + 1) : String(now.getMonth() + 1)
  const day = now.getDate() < 10 ? '0' + now.getDate() : String(now.getDate())
  const fileName = `仓库管理_${now.getFullYear()}${month}${day}.xlsx`

  XLSX.writeFile(workbook, fileName)
  ElMessage.success('导出成功')
}

const handleSelectAll = () => {
  if (selectAll.value) {
    selectedIds.value = paginatedData.value.map(row => row.id)
  } else {
    selectedIds.value = []
  }
}

const handleSelectRow = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
  selectAll.value = selectedIds.value.length === paginatedData.value.length
}

const getCities = () => cities[editForm.value.province] || []
const getDistricts = () => districts[editForm.value.city] || []
</script>

<template>
  <div class="warehouse-page">
    <!-- 左侧分类树 -->
    <div class="left-sidebar">
      <div class="sidebar-header">
        <span>仓库分类</span>
        <el-link type="primary" :underline="false" @click="handleAdd">
          <el-icon><Plus /></el-icon>
        </el-link>
      </div>
      <el-tree
        :data="categories"
        :props="{ label: 'label', children: 'children' }"
        node-key="label"
        :default-expand-all="true"
        :highlight-current="true"
        @node-click="(data: any) => selectedCategory = data.value || data.label"
      >
        <template #default="{ node }">
          <span class="tree-node">
            <el-icon v-if="node.level === 1"><OfficeBuilding /></el-icon>
            <el-icon v-else><Folder /></el-icon>
            <span>{{ node.label }}</span>
          </span>
        </template>
      </el-tree>
    </div>

    <!-- 右侧内容区 -->
    <div class="right-content">
      <div class="page-header">
        <h1>仓库列表</h1>
      </div>

      <!-- 搜索和操作栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索仓库编码或名称或联系人或电话或自定义项"
            style="width: 320px"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button class="btn-gray" @click="showFilter = !showFilter">
            <el-icon><component :is="showFilter ? ArrowUp : ArrowDown" /></el-icon>
            展开过滤
          </el-button>
          <el-select v-model="showActiveOnly" style="width: 100px" @change="currentPage = 1">
            <el-option :value="true" label="显示在用" />
            <el-option :value="false" label="全部" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button type="success" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增
          </el-button>
          <el-button class="btn-gray" @click="exportToExcel">
            <el-icon><Download /></el-icon>导出
          </el-button>
          <el-button class="btn-gray">
            <el-icon><Upload /></el-icon>引入
          </el-button>
        </div>
      </div>

      <!-- 高级筛选 -->
      <div v-show="showFilter" class="filter-panel">
        <el-form :inline="true">
          <el-form-item label="状态">
            <el-select v-model="showActiveOnly" style="width: 120px">
              <el-option :value="true" label="启用" />
              <el-option :value="false" label="全部" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 批量操作 -->
      <div class="batch-bar">
        <el-button class="btn-gray" size="small" @click="handleBatchEnable">启用</el-button>
        <el-button class="btn-gray" size="small" @click="handleBatchDisable">禁用</el-button>
        <el-button class="btn-gray" size="small" @click="handleBatchDelete">删除</el-button>
        <el-button class="btn-gray" size="small">复制</el-button>
      </div>

      <!-- 表格 -->
      <div class="table-card">
        <el-table
          :data="paginatedData"
          border
          stripe
          size="small"
          :fit="true"
          :row-key="(row: any) => row.id"
          @header-dragend="handleHeaderDragend"
        >
          <el-table-column type="selection" :width="columnWidths.selection" :selectable="(row: any) => row.status !== '停用'" @select-all="handleSelectAll" @select="(_val: any, row: any) => handleSelectRow(row.id)" />
          <el-table-column label="操作" :width="columnWidths.action" align="center">
            <template #default="scope">
              <el-button type="text" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
          <el-table-column prop="code" label="仓库编码" :width="columnWidths.code" />
          <el-table-column prop="name" label="仓库名称" :width="columnWidths.name" />
          <el-table-column label="允许负库存" :width="columnWidths.allowNegativeStock" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.allowNegativeStock" size="small" @change="warehouseStore.update(scope.row.id, { allowNegativeStock: scope.row.allowNegativeStock })" />
            </template>
          </el-table-column>
          <el-table-column label="适用企业管理" :width="columnWidths.companyManage" align="center">
            <template #default="scope">
              <span>{{ scope.row.companyManage || '全部' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="公用" :width="columnWidths.isPublic" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.isPublic" size="small" />
            </template>
          </el-table-column>
          <el-table-column prop="manager" label="主管" :width="columnWidths.manager" />
          <el-table-column prop="phone" label="手机" :width="columnWidths.mobile" />
          <el-table-column prop="phone" label="电话" :width="columnWidths.phone" />
          <el-table-column prop="address" label="地址" :width="columnWidths.address" show-overflow-tooltip />
          <el-table-column label="备注" :width="columnWidths.remark" />
          <el-table-column label="状态" :width="columnWidths.status" align="center">
            <template #default="scope">
              <el-switch v-model="scope.row.status" active-value="启用" inactive-value="停用" size="small" @change="handleToggleStatus(scope.row)" />
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            size="small"
            @size-change="currentPage = 1"
          >
            <template #total>共 {{ total }} 条</template>
          </el-pagination>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog :title="isEditing ? '编辑仓库' : '新增仓库'" v-model="dialogVisible" width="700px" destroy-on-close>
      <el-form :model="editForm" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="仓库编码" required>
              <el-input v-model="editForm.code" :disabled="isEditing" placeholder="请输入仓库编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓库名称" required>
              <el-input v-model="editForm.name" placeholder="请输入仓库名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="允许负库存">
              <el-switch v-model="editForm.allowNegativeStock" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公用">
              <el-switch v-model="editForm.isPublic" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="主管">
              <el-input v-model="editForm.manager" placeholder="请输入主管姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机">
              <el-input v-model="editForm.mobile" placeholder="请输入手机号码" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电话">
              <el-input v-model="editForm.phone" placeholder="请输入电话号码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="editForm.status" style="width: 100%">
                <el-option label="启用" value="启用" />
                <el-option label="停用" value="停用" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-row :gutter="8">
            <el-col :span="6">
              <el-select v-model="editForm.province" placeholder="省" @change="editForm.city = ''; editForm.district = ''">
                <el-option v-for="p in provinces" :key="p" :value="p" :label="p" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select v-model="editForm.city" placeholder="市" @change="editForm.district = ''">
                <el-option v-for="c in getCities()" :key="c" :value="c" :label="c" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-select v-model="editForm.district" placeholder="区">
                <el-option v-for="d in getDistricts()" :key="d" :value="d" :label="d" />
              </el-select>
            </el-col>
            <el-col :span="6">
              <el-input v-model="editForm.address" placeholder="详细地址" />
            </el-col>
          </el-row>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定并关闭</el-button>
        <el-button type="primary" @click="handleSaveAndNew">确定并新增</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.warehouse-page {
  display: flex;
  height: calc(100vh - 60px);
  background: #F5F7FA;
}

.left-sidebar {
  width: 200px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  padding: 16px;

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 14px;
    color: #344054;
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }
}

.right-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 16px;

  h1 {
    font-size: 20px;
    font-weight: 600;
    color: #344054;
    margin: 0;
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.filter-panel {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 12px;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e4e7ed;
}

.table-card {
  background: #fff;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  :deep(.el-table__header-wrapper th) {
    background: #f5f7fa;
    color: #344054;
    font-weight: 600;
    text-align: center !important;
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
  padding: 16px;
}

.btn-gray {
  --el-button-text-color: #666666 !important;
  --el-button-bg-color: transparent !important;
  --el-button-border-color: #d9d9d9 !important;

  &:hover {
    --el-button-text-color: #409eff !important;
    --el-button-border-color: #409eff !important;
  }
}
</style>