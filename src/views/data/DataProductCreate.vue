<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loadProductList, saveProductList } from '@/utils/productStore'

const router = useRouter()
const route = useRoute()
const formRef = ref<InstanceType<typeof import('element-plus')['ElForm']> | null>(null)

const auditStatus = ref<'pending' | 'approved' | 'rejected'>('pending')
const isAudited = ref(false)

// 编辑模式：从路由获取商品ID
const isEditMode = computed(() => route.path.includes('/edit/'))
const editId = computed(() => route.params.id as string)

const handleAudit = () => {
  if (auditStatus.value === 'pending') {
    auditStatus.value = 'approved'
    isAudited.value = true
    formData.auditStatus = '已审核'
    formData.auditTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('审核通过')
  } else {
    auditStatus.value = 'pending'
    isAudited.value = false
    formData.auditStatus = ''
    formData.auditTime = ''
    ElMessage.info('已反审核')
  }
}

const handleSave = () => {
  if (isEditMode.value && editId.value) {
    const productList = loadProductList()
    
    const index = productList.findIndex((p: any) => String(p.id) === editId.value)
    if (index !== -1) {
      productList[index] = {
        ...productList[index],
        ...formData
      }
      
      saveProductList(productList)
      ElMessage.success('修改成功')
      router.push('/data/product')
    } else {
      ElMessage.error('商品不存在')
    }
  } else {
    const newProduct = {
      id: Date.now(),
      code: formData.code || `PD${Date.now()}`,
      name: formData.name,
      spec: formData.spec,
      manufacturer: formData.manufacturer,
      registrant: formData.registrant,
      brand: formData.brand,
      category: formData.category,
      type: formData.type,
      measureUnit: formData.measureUnit,
      licenseNo: formData.licenseNo,
      registerNo: formData.registerNo,
      udiCode: formData.udiCode,
      barcode: formData.barcode,
      medicalCode: formData.medicalCode,
      medicalClass: formData.medicalClass,
      storageCondition: formData.storageCondition,
      medType: formData.medType,
      minStock: formData.minStock,
      maxStock: formData.maxStock,
      safetyStock: formData.safetyStock,
      volumeLength: formData.volumeLength,
      volumeWidth: formData.volumeWidth,
      volumeHeight: formData.volumeHeight,
      purchaseUnit: formData.purchaseUnit,
      saleUnit: formData.saleUnit,
      stockUnit: formData.stockUnit,
      reportUnit: formData.reportUnit,
      batchManage: formData.batchManage,
      serialNoManage: formData.serialNoManage,
      expiryManage: formData.expiryManage,
      expiryDate: formData.expiryDate,
      expiryUnit: formData.expiryUnit,
      warningDays: formData.warningDays,
      expiryCalcMethod: formData.expiryCalcMethod,
      sterilizationBatch: formData.sterilizationBatch,
      bidType: formData.bidType,
      taxRate: formData.taxRate,
      remark1: formData.remark1,
      remark2: formData.remark2,
      remark3: formData.remark3,
      remark4: formData.remark4,
      remark5: formData.remark5,
      status: '正常',
      auditStatus: '待审核'
    }
    
    const productList = loadProductList()

    productList.push(newProduct)

    saveProductList(productList)
    
    ElMessage.success('保存成功')
    router.push('/data/product')
  }
}

const handleCopy = () => {
  ElMessage.info('复制成功')
}

// 选择的已有商品编码
const selectedProductCode = ref('')

const formData = reactive({
  code: '',
  internalCode: '',
  name: '',
  spec: '',
  measureUnit: '',
  enableMultiUnit: false,
  manufacturer: '',
  registrant: '',
  brand: '',
  category: '',
  type: '',
  unitConversions: [
    { fromUnit: '', rate: '', toUnit: '' },
    { fromUnit: '', rate: '', toUnit: '' },
    { fromUnit: '', rate: '', toUnit: '' }
  ],
  purchaseUnit: '',
  saleUnit: '',
  stockUnit: '',
  reportUnit: '',
  batchManage: '',
  serialNoManage: '',
  expiryManage: '',
  expiryDate: '',
  expiryUnit: '',
  warningDays: '',
  expiryCalcMethod: '',
  sterilizationBatch: '',
  defaultSupplier: '',
  defaultWarehouse: '',
  licenseNo: '',
  registerNo: '',
  udiCode: '',
  barcode: '',
  minStock: '',
  maxStock: '',
  safetyStock: '',
  medicalCode: '',
  medicalClass: '',
  bidType: '',
  storageCondition: '',
  medType: '',
  taxRate: '',
  volumeLength: '',
  volumeWidth: '',
  volumeHeight: '',
  assembly: '',
  auditStatus: '',
  auditTime: '',
  remark1: '',
  remark2: '',
  remark3: '',
  remark4: '',
  remark5: '',
  remark6: '',
  remark7: '',
  remark8: '',
  remark9: '',
  remark10: ''
})

// 编辑模式初始化
onMounted(() => {
  if (isEditMode.value && editId.value) {
    const productList = loadProductList()
    if (productList.length) {
      const product = productList.find((p: any) => String(p.id) === editId.value)
      if (product) {
        Object.assign(formData, product)
        auditStatus.value = product.auditStatus === '已审核' ? 'approved' : 'pending'
        isAudited.value = product.auditStatus === '已审核'
      }
    }
  }
})

const categories = [
  { label: '手术器械', value: '手术器械' },
  { label: '消毒灭菌设备', value: '消毒灭菌设备' },
  { label: '医用材料', value: '医用材料' },
  { label: '介入器械', value: '介入器械' },
  { label: '手术室设备', value: '手术室设备' },
  { label: '医用电子仪器', value: '医用电子仪器' },
  { label: '医用光学仪器', value: '医用光学仪器' },
  { label: '医用超声仪器', value: '医用超声仪器' },
  { label: '体外诊断试剂', value: '体外诊断试剂' }
]

const subTypes: Record<string, { label: string; value: string }[]> = {
  '手术器械': [
    { label: '外科手术器械', value: '外科手术器械' },
    { label: '神经外科手术器械', value: '神经外科手术器械' },
    { label: '显微外科手术器械', value: '显微外科手术器械' },
    { label: '眼科手术器械', value: '眼科手术器械' },
    { label: '耳鼻喉科手术器械', value: '耳鼻喉科手术器械' },
    { label: '口腔科手术器械', value: '口腔科手术器械' },
    { label: '胸腔心血管外科手术器械', value: '胸腔心血管外科手术器械' },
    { label: '腹部外科手术器械', value: '腹部外科手术器械' },
    { label: '泌尿肛肠外科手术器械', value: '泌尿肛肠外科手术器械' },
    { label: '骨科手术器械', value: '骨科手术器械' },
    { label: '妇产科手术器械', value: '妇产科手术器械' },
    { label: '儿科手术器械', value: '儿科手术器械' }
  ],
  '消毒灭菌设备': [
    { label: '消毒灭菌设备及器具', value: '消毒灭菌设备及器具' }
  ],
  '医用材料': [
    { label: '医用卫生材料及敷料', value: '医用卫生材料及敷料' },
    { label: '医用缝合材料和粘合剂', value: '医用缝合材料和粘合剂' },
    { label: '医用高分子材料及制品', value: '医用高分子材料及制品' }
  ],
  '介入器械': [
    { label: '介入器械', value: '介入器械' }
  ],
  '手术室设备': [
    { label: '手术室急救室诊疗室设备及器具', value: '手术室急救室诊疗室设备及器具' }
  ],
  '医用电子仪器': [
    { label: '医用电子仪器设备', value: '医用电子仪器设备' }
  ],
  '医用光学仪器': [
    { label: '医用光学器具仪器及内窥镜设备', value: '医用光学器具仪器及内窥镜设备' }
  ],
  '医用超声仪器': [
    { label: '医用超声仪器及有关设备', value: '医用超声仪器及有关设备' }
  ],
  '体外诊断试剂': [
    { label: '体外诊断试剂', value: '体外诊断试剂' }
  ]
}

const medTypes = [
  { label: '一类', value: '一类' },
  { label: '二类', value: '二类' },
  { label: '三类', value: '三类' },
  { label: '消字号类', value: '消字号类' },
  { label: '非医疗', value: '非医疗' }
]

const bidTypes = [
  { label: '阳光采购', value: '阳光采购' },
  { label: '非集采', value: '非集采' },
  { label: '省采', value: '省采' }
]

const medicalClasses = [
  { label: '甲类', value: '甲类' },
  { label: '乙类', value: '乙类' },
  { label: '自费', value: '自费' }
]

const expiryUnits = [
  { label: '天', value: '天' },
  { label: '月', value: '月' },
  { label: '年', value: '年' }
]

const warningOptions = [
  { label: '有效期1/3', value: '1/3' },
  { label: '有效期1/2', value: '1/2' },
  { label: '有效期2/3', value: '2/3' }
]

const calcMethods = [
  { label: '生产日期+保质期-1天', value: 'method1' },
  { label: '允许录入时自定义到期日', value: 'method2' }
]

const storageConditions = [
  { label: '常温', value: '常温' },
  { label: '阴凉', value: '阴凉' },
  { label: '冷藏', value: '冷藏' },
  { label: '低温冷冻', value: '低温冷冻' },
  { label: '超低温冷冻', value: '超低温冷冻' },
  { label: '恒温', value: '恒温' },
  { label: '其他', value: '其他' }
]

const currentSubTypes = ref(subTypes['医用耗材'] || [])

watch(() => formData.category, (newVal) => {
  currentSubTypes.value = subTypes[newVal] || []
  formData.type = ''
})

watch(() => formData.enableMultiUnit, (newVal, oldVal) => {
  if (newVal && !oldVal && formData.measureUnit) {
    formData.unitConversions = [
      { fromUnit: formData.measureUnit, rate: '1', toUnit: '' }
    ]
    formData.purchaseUnit = formData.measureUnit
    formData.saleUnit = formData.measureUnit
    formData.stockUnit = formData.measureUnit
    formData.reportUnit = formData.measureUnit
  }
})

// 医疗器械分类自动识别
watch(() => [formData.registerNo, formData.licenseNo], ([registerNo, licenseNo]) => {
  const regNo = registerNo || ''
  const licNo = licenseNo || ''
  
  // 含"备"字 → 一类
  if (regNo.includes('备')) {
    formData.medType = '一类'
    return
  }
  
  // 注册证号第五位为2 → 二类
  if (regNo.length >= 5 && regNo[4] === '2') {
    formData.medType = '二类'
    return
  }
  
  // 注册证号第五位为3 → 三类
  if (regNo.length >= 5 && regNo[4] === '3') {
    formData.medType = '三类'
    return
  }
  
  // 生产许可证含"消"字 → 消字号类
  if (licNo.includes('消')) {
    formData.medType = '消字号类'
    return
  }
  
  // 没有注册证号 → 非医疗
  if (!regNo) {
    formData.medType = '非医疗'
    return
  }
  
  // 默认二类
  formData.medType = '二类'
}, { immediate: true })

const volumeResult = computed(() => {
  const length = parseFloat(formData.volumeLength) || 0
  const width = parseFloat(formData.volumeWidth) || 0
  const height = parseFloat(formData.volumeHeight) || 0
  if (length > 0 && width > 0 && height > 0) {
    return ((length * width * height) / 1000000).toFixed(6)
  }
  return ''
})

const handleSubmit = () => {
  formRef.value.validate((valid: boolean) => {
    if (!valid) return
    ElMessage.success('保存成功')
    router.push('/data/product')
  })
}

const handleBack = () => {
  router.push('/data/product')
}

// 平台计量单位数据
const platformMeasureUnits = ref([
  { label: '个', value: '个' },
  { label: '只', value: '只' },
  { label: '支', value: '支' },
  { label: '根', value: '根' },
  { label: '枚', value: '枚' },
  { label: '套', value: '套' },
  { label: '件', value: '件' },
  { label: '盒', value: '盒' },
  { label: '瓶', value: '瓶' },
  { label: '袋', value: '袋' },
  { label: '包', value: '包' },
  { label: '片', value: '片' },
  { label: '张', value: '张' },
  { label: '贴', value: '贴' },
  { label: '卷', value: '卷' },
  { label: '台', value: '台' },
  { label: '把', value: '把' },
  { label: '柄', value: '柄' },
  { label: '条', value: '条' },
  { label: '管', value: '管' },
  { label: '粒', value: '粒' },
  { label: '丸', value: '丸' },
  { label: '颗', value: '颗' },
  { label: '组', value: '组' },
  { label: '单元', value: '单元' }
])

// 平台辅助单位数据（用于单位换算）
const platformAuxUnits = ref([
  { label: '箱', value: '箱' },
  { label: '大箱', value: '大箱' },
  { label: '中箱', value: '中箱' },
  { label: '小箱', value: '小箱' },
  { label: '盒', value: '盒' },
  { label: '大包', value: '大包' },
  { label: '小包', value: '小包' },
  { label: '件', value: '件' },
  { label: '袋', value: '袋' },
  { label: '包', value: '包' },
  { label: '捆', value: '捆' },
  { label: '扎', value: '扎' },
  { label: '托盘', value: '托盘' },
  { label: '板', value: '板' },
  { label: '排', value: '排' },
  { label: '层', value: '层' },
  { label: '个', value: '个' },
  { label: '只', value: '只' },
  { label: '支', value: '支' },
  { label: '瓶', value: '瓶' }
])

// 模拟已有商品数据
const existingProducts = ref([
  {
    code: 'P001',
    name: '一次性医用口罩',
    spec: '17.5cm×9.5cm',
    measureUnit: '只',
    manufacturer: '某某医疗科技有限公司',
    registrant: '某某医疗科技有限公司',
    brand: '医盾',
    category: '医用耗材',
    type: '一次性用品',
    licenseNo: '豫械注准20202140xxx',
    registerNo: '20202140xxx',
    udiCode: '6901234567890',
    barcode: '1234567890123',
    medType: '二类',
    storageCondition: '常温',
    taxRate: 13
  },
  {
    code: 'P002',
    name: '医用酒精消毒液',
    spec: '500ml',
    measureUnit: '瓶',
    manufacturer: '某某化工有限公司',
    registrant: '某某化工有限公司',
    brand: '洁康',
    category: '医用耗材',
    type: '消毒用品',
    licenseNo: '消字号2020001x',
    registerNo: '',
    udiCode: '6901234567891',
    barcode: '1234567890124',
    medType: '消字号类',
    storageCondition: '阴凉',
    taxRate: 13
  },
  {
    code: 'P003',
    name: '电子体温计',
    spec: 'ET-101',
    measureUnit: '支',
    manufacturer: '某某电子股份有限公司',
    registrant: '某某电子股份有限公司',
    brand: '康达',
    category: '诊断设备',
    type: '检验设备',
    licenseNo: '粤械注准20201230xxx',
    registerNo: '20201230xxx',
    udiCode: '6901234567892',
    barcode: '1234567890125',
    medType: '二类',
    storageCondition: '常温',
    taxRate: 13
  }
])

// 选择已有商品
const handleSelectProduct = (product: any) => {
  if (!product) return
  // 填充表单数据
  Object.assign(formData, {
    code: '', // 新增时清空编码
    name: product.name,
    spec: product.spec,
    measureUnit: product.measureUnit,
    manufacturer: product.manufacturer,
    registrant: product.registrant,
    brand: product.brand,
    category: product.category,
    type: product.type,
    licenseNo: product.licenseNo,
    registerNo: product.registerNo,
    udiCode: product.udiCode,
    barcode: product.barcode,
    medType: product.medType,
    storageCondition: product.storageCondition,
    taxRate: product.taxRate
  })
  ElMessage.success('已选择商品，信息已带出')
}


</script>

<template>
  <div class="product-create-container">
    <div class="page-header">
      <div class="page-breadcrumb">
        <span>首页</span>
        <span class="breadcrumb-arrow">/</span>
        <span>基础数据</span>
        <span class="breadcrumb-arrow">/</span>
        <span>商品基本资料</span>
        <span class="breadcrumb-arrow">/</span>
        <span>新增商品</span>
      </div>
      <div class="page-title">
        <h2>新增商品</h2>
      </div>
    </div>
    
    <div class="form-container">
      <el-form ref="formRef" :model="formData" :rules="rules" label-position="top">
        <!-- 选择已有商品 -->
        <div class="select-product-bar">
          <span class="select-label">选择已有商品：</span>
          <el-select 
            v-model="selectedProductCode" 
            placeholder="请选择已有商品（可选）" 
            clearable
            filterable
            @change="handleSelectProduct"
            class="product-select"
          >
            <el-option
              v-for="item in existingProducts"
              :key="item.code"
              :label="`${item.name} - ${item.spec} - ${item.registerNo || '无注册证'}`"
              :value="item.code"
            >
              <span class="product-option-name">{{ item.name }}</span>
              <span class="product-option-spec">{{ item.spec }}</span>
              <span class="product-option-reg">{{ item.registerNo || '无注册证' }}</span>
            </el-option>
          </el-select>
          <span class="select-tip">（选择后可快速带出商品信息，修改后保存为新商品）</span>
        </div>
        
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-title section-title-large">一、基本信息</span>
            <div class="header-actions">
              <div v-if="isAudited" class="audit-stamp">
                <div class="stamp-circle">
                  <span class="stamp-inner">已审核</span>
                </div>
              </div>
              <el-button type="primary" size="small" @click="handleSave">保存</el-button>
              <el-button 
                :type="auditStatus === 'approved' ? 'warning' : 'success'" 
                size="small" 
                @click="handleAudit"
              >
                {{ auditStatus === 'approved' ? '反审核' : '审核' }}
              </el-button>
              <el-button size="small" @click="handleCopy">复制</el-button>
            </div>
          </div>
          
          <div class="field-group">
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="平台编码" prop="code" required>
                  <el-input v-model="formData.code" placeholder="自动生成" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="内部编码">
                  <el-input v-model="formData.internalCode" placeholder="可自行修改" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="商品名称" prop="name" required>
                  <el-input v-model="formData.name" placeholder="商品全称" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="规格型号">
                  <el-input v-model="formData.spec" placeholder="规格描述" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="注册人/备案人">
                  <el-input v-model="formData.registrant" placeholder="VIP续费企业提示" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item measure-unit-row">
                <el-form-item label="计量单位" prop="measureUnit" required class="measure-unit-input">
                  <el-select 
                    v-model="formData.measureUnit" 
                    placeholder="选择/输入" 
                    filterable 
                    allow-create
                    default-first-option
                    :disabled="isAudited"
                  >
                    <el-option
                      v-for="item in platformMeasureUnits"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
                <div class="unit-switch-inline">
                  <el-switch v-model="formData.enableMultiUnit" />
                  <span class="switch-text">启用多单位</span>
                </div>
              </div>
            </div>
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="品牌">
                  <el-input v-model="formData.brand" placeholder="非必填" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="商品分类">
                  <el-select v-model="formData.category" placeholder="请选择" :disabled="isAudited">
                    <el-option v-for="item in categories" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="商品类型">
                  <el-select v-model="formData.type" placeholder="请选择" :disabled="isAudited">
                    <el-option v-for="item in currentSubTypes" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="生产厂家">
                  <el-input v-model="formData.manufacturer" placeholder="VIP续费企业提示" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="生产许可证">
                  <el-input v-model="formData.licenseNo" :disabled="isAudited" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="注册证号">
                  <el-input v-model="formData.registerNo" :disabled="isAudited" />
                </el-form-item>
              </div>
            </div>
            
            <!-- 多单位换算设置（放在基本信息内） -->
            <div v-if="formData.enableMultiUnit" class="multi-unit-section">
              <div class="conversion-column">
                <div v-for="(row, index) in formData.unitConversions" :key="index" class="conversion-row-item">
                  <span class="conversion-label">换算{{ index + 1 }}</span>
                  <el-select v-model="row.fromUnit" placeholder="从单位" filterable allow-create default-first-option class="conversion-input">
                    <el-option v-for="item in platformAuxUnits" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                  <span class="conversion-operator">=</span>
                  <el-input v-model="row.rate" type="number" placeholder="换算率" class="conversion-input" />
                  <span class="conversion-multiply">×</span>
                  <el-select v-model="row.toUnit" placeholder="到单位" filterable allow-create default-first-option class="conversion-input">
                    <el-option v-for="item in platformAuxUnits" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </div>
              </div>
              <div class="field-row">
                <div class="field-item w-6">
                  <el-form-item label="采购单位" prop="purchaseUnit" required>
                    <el-select v-model="formData.purchaseUnit" placeholder="选择/输入" filterable allow-create default-first-option>
                      <el-option v-for="item in platformAuxUnits" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </div>
                <div class="field-item w-6">
                  <el-form-item label="销售单位" prop="saleUnit" required>
                    <el-select v-model="formData.saleUnit" placeholder="选择/输入" filterable allow-create default-first-option>
                      <el-option v-for="item in platformAuxUnits" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </div>
                <div class="field-item w-6">
                  <el-form-item label="库存单位" prop="stockUnit">
                    <el-select v-model="formData.stockUnit" placeholder="选择/输入" filterable allow-create default-first-option>
                      <el-option v-for="item in platformAuxUnits" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </div>
                <div class="field-item w-6">
                  <el-form-item label="报表单位" prop="reportUnit">
                    <el-select v-model="formData.reportUnit" placeholder="选择/输入" filterable allow-create default-first-option>
                      <el-option v-for="item in platformAuxUnits" :key="item.value" :label="item.label" :value="item.value" />
                    </el-select>
                  </el-form-item>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 行业特性 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-title section-title-large">二、行业特性</span>
          </div>
          
          <div class="field-group">
            <div class="switch-row">
              <div class="switch-item">
                <span class="switch-label">批次管理</span>
                <el-switch v-model="formData.batchManage" active-value="1" inactive-value="0" />
              </div>
              <div class="switch-item">
                <span class="switch-label">序列号管理</span>
                <el-switch v-model="formData.serialNoManage" active-value="1" inactive-value="0" />
              </div>
              <div class="switch-item">
                <span class="switch-label">保质期管理</span>
                <el-switch v-model="formData.expiryManage" active-value="1" inactive-value="0" />
              </div>
            </div>
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="保质期">
                  <el-input v-model="formData.expiryDate" type="number" placeholder="天数" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="保质期单位">
                  <el-select v-model="formData.expiryUnit" placeholder="请选择">
                    <el-option v-for="item in expiryUnits" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="预警天数">
                  <el-select v-model="formData.warningDays" placeholder="请选择">
                    <el-option v-for="item in warningOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="灭菌批号">
                  <el-input v-model="formData.sterilizationBatch" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="到期日计算方法">
                  <el-select v-model="formData.expiryCalcMethod" placeholder="请选择">
                    <el-option v-for="item in calcMethods" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="UDI码">
                  <el-input v-model="formData.udiCode" />
                </el-form-item>
              </div>
            </div>
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="医保码（27位）">
                  <el-input v-model="formData.medicalCode" placeholder="27位" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="储运条件">
                  <el-select v-model="formData.storageCondition" placeholder="请选择" disabled>
                    <el-option v-for="item in storageConditions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="医保报销分类">
                  <el-select v-model="formData.medicalClass" placeholder="请选择">
                    <el-option v-for="item in medicalClasses" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="中标类型">
                  <el-select v-model="formData.bidType" placeholder="请选择">
                    <el-option v-for="item in bidTypes" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="医疗器械分类">
                  <el-select v-model="formData.medType" placeholder="请选择">
                    <el-option v-for="item in medTypes" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </el-form-item>
              </div>
            </div>
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="默认供应商">
                  <el-input v-model="formData.defaultSupplier" placeholder="常用供应商" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="默认仓库">
                  <el-input v-model="formData.defaultWarehouse" placeholder="默认存放仓库" />
                </el-form-item>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 条形码 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-title section-title-large">三、条形码</span>
          </div>
          
          <div class="field-group">
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="条形码">
                  <el-input v-model="formData.barcode" />
                </el-form-item>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 库存预警 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-title section-title-large">四、库存预警</span>
          </div>
          
          <div class="field-group">
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="最低库存数量">
                  <el-input v-model="formData.minStock" type="number" placeholder="库存下限" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="最高库存数量">
                  <el-input v-model="formData.maxStock" type="number" placeholder="库存上限" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="安全库存">
                  <el-input v-model="formData.safetyStock" type="number" placeholder="安全库存量" />
                </el-form-item>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 其它信息 -->
        <div class="form-section">
          <div class="section-header">
            <span class="section-title section-title-large">五、其它信息</span>
          </div>
          
          <div class="field-group">
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="税率">
                  <el-input v-model="formData.taxRate" type="number" placeholder="%" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="体积-长(cm)">
                  <el-input v-model="formData.volumeLength" type="number" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="体积-宽(cm)">
                  <el-input v-model="formData.volumeWidth" type="number" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="体积-高(cm)">
                  <el-input v-model="formData.volumeHeight" type="number" />
                </el-form-item>
              </div>
              <div class="field-item w-6">
                <el-form-item label="体积(m³)">
                  <el-input :value="volumeResult" disabled />
                </el-form-item>
              </div>
            </div>
            <div class="field-row">
              <div class="field-item w-6">
                <el-form-item label="组装">
                  <el-input v-model="formData.assembly" />
                </el-form-item>
              </div>
            </div>
            <div class="field-row remark-row">
              <div class="field-item">
                <el-form-item label="备注1">
                  <el-input v-model="formData.remark1" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注2">
                  <el-input v-model="formData.remark2" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注3">
                  <el-input v-model="formData.remark3" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注4">
                  <el-input v-model="formData.remark4" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注5">
                  <el-input v-model="formData.remark5" />
                </el-form-item>
              </div>
            </div>
            <div class="field-row remark-row">
              <div class="field-item">
                <el-form-item label="备注6">
                  <el-input v-model="formData.remark6" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注7">
                  <el-input v-model="formData.remark7" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注8">
                  <el-input v-model="formData.remark8" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注9">
                  <el-input v-model="formData.remark9" />
                </el-form-item>
              </div>
              <div class="field-item">
                <el-form-item label="备注10">
                  <el-input v-model="formData.remark10" />
                </el-form-item>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-footer">
          <el-button @click="handleBack">取消</el-button>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  setup() {
    const rules = {
      name: [
        { required: true, message: '请输入商品名称', trigger: 'blur' },
        { min: 1, max: 100, message: '名称长度在1-100个字符', trigger: 'blur' }
      ],
      measureUnit: [
        { required: true, message: '请输入计量单位', trigger: 'blur' },
        { min: 1, max: 20, message: '计量单位长度在1-20个字符', trigger: 'blur' }
      ],
      purchaseUnit: [
        { required: true, message: '请输入采购单位', trigger: 'blur' },
        { min: 1, max: 20, message: '采购单位长度在1-20个字符', trigger: 'blur' }
      ],
      saleUnit: [
        { required: true, message: '请输入销售单位', trigger: 'blur' },
        { min: 1, max: 20, message: '销售单位长度在1-20个字符', trigger: 'blur' }
      ]
    }
    return { rules }
  }
}
</script>

<style lang="scss" scoped>
.product-create-container {
  padding: 20px;
  background-color: #F5F7FA;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 20px;
  
  .page-breadcrumb {
    font-size: 14px;
    color: #667085;
    margin-bottom: 8px;
    
    .breadcrumb-arrow {
      margin: 0 8px;
      color: #98A2B3;
    }
  }
  
  .page-title {
    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #344054;
      margin: 0;
    }
  }
}

.form-container {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #F2F4F7;
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  
  .section-num {
    color: #344054;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    margin-right: 8px;
  }
  
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #344054;
    
    &.section-title-large {
      font-size: 20px;
      font-weight: 700;
    }
  }
  
  .audit-btn,
  .header-actions {
    margin-left: auto;
  }
  
  .header-actions {
    display: flex;
    gap: 8px;
    
    .el-button {
      opacity: 1 !important;
    }
  }
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #F2F4F7;
  
  .el-button {
    padding: 10px 24px;
    font-size: 14px;
  }
}

/* 金蝶云风格 - 上下紧凑布局 */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}

.field-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  
  :deep(.el-form-item) {
    margin-bottom: 0;
    width: 100%;
  }
  
  :deep(.el-form-item__label) {
    padding-bottom: 4px;
    line-height: 20px;
    font-size: 14px;
    color: #667085;
    white-space: nowrap;
  }
  
  :deep(.el-form-item__content) {
    line-height: 28px;
    width: 100%;
  }
  
  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    width: 100% !important;
  }
}

/* 6列均分布局 */
.field-item.w-6 {
  flex: 1;
  min-width: 0;
  max-width: calc(16.666% - 20px);
  
  :deep(.el-form-item__label) {
    min-width: auto;
    padding-right: 0;
  }
}

/* 计量单位+启用多单位同行显示 */
.measure-unit-row {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 12px;
  
  .measure-unit-input {
    :deep(.el-form-item__content) {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 12px;
    }
    
    :deep(.el-input__wrapper) {
      width: 130px !important;
      min-width: 130px !important;
    }
  }
}

.unit-switch-inline {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 8px;
  
  .switch-text {
    font-size: 12px;
    color: #667085;
    white-space: nowrap;
  }
}

/* 多单位换算区域 */
.multi-unit-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #E5E7EB;
}

/* 单位换算三行同一列布局 */
.conversion-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.conversion-row-item {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .conversion-label {
    min-width: 50px;
    font-size: 14px;
    color: #667085;
  }
  
  .conversion-input {
    width: 100px !important;
  }
  
  .conversion-operator,
  .conversion-multiply {
    color: #667085;
    font-weight: 500;
    font-size: 14px;
  }
}

.clear-btn {
  color: #98A2B3;
  margin-left: 2px;
  font-size: 12px;
  
  &:hover {
    color: #00bfa5;
  }
}

.switch-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #F9FAFB;
  border-radius: 4px;
}

.switch-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 14px;
  color: #667085;
  font-weight: 500;
}

/* 选择已有商品 */
.select-product-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #F5F7FA;
  border-radius: 4px;
  margin-bottom: 16px;
}

.select-label {
  font-size: 14px;
  color: #344054;
  font-weight: 500;
  margin-right: 8px;
  white-space: nowrap;
}

.product-select {
  width: 400px;
}

.select-tip {
  font-size: 12px;
  color: #98A2B3;
  margin-left: 12px;
}

.product-option-name {
  font-weight: 500;
  color: #344054;
}

.product-option-spec {
  color: #667085;
  margin-left: 8px;
}

.product-option-reg {
  color: #98A2B3;
  margin-left: 8px;
  font-size: 12px;
}

.audit-stamp {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  margin-right: 12px;
  
  /* 样式1：经典圆形印章 */
  .stamp-circle {
    width: 56px;
    height: 56px;
    border: 3px solid #E55353;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    
    &::before {
      content: '';
      position: absolute;
      width: 44px;
      height: 44px;
      border: 1px dashed #E55353;
      border-radius: 50%;
    }
    
    .stamp-inner {
      font-size: 16px;
      font-weight: bold;
      color: #E55353;
      letter-spacing: 2px;
      line-height: 1;
      text-align: center;
    }
  }
}

:deep(.el-input.is-disabled) {
  .el-input__wrapper {
    background-color: transparent !important;
    border-bottom-color: #CBD5E1 !important;
    
    .el-input__inner {
      color: #344054 !important;
      background-color: transparent !important;
      -webkit-text-fill-color: #344054 !important;
    }
  }
}

:deep(.el-select.is-disabled) {
  .el-input__wrapper {
    background-color: transparent !important;
    border-bottom-color: #CBD5E1 !important;
    
    .el-input__inner {
      color: #344054 !important;
      background-color: transparent !important;
      -webkit-text-fill-color: #344054 !important;
    }
  }
  
  .el-select__wrapper {
    background-color: transparent !important;
    border-bottom-color: #CBD5E1 !important;
    
    .el-input__inner {
      color: #344054 !important;
      background-color: transparent !important;
      -webkit-text-fill-color: #344054 !important;
    }
  }
}

:deep(.el-switch.is-disabled) {
  opacity: 1;
}
</style>
