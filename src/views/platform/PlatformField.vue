<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useTableDrag } from '@/composables/useTableDrag'
import { loadPlatformFieldCatalog, savePlatformFieldCatalog } from '@/utils/platformFieldStore'

const searchKeyword = ref('')

const showAddDialog = ref(false)
const addForm = ref({
  id: '',
  module: '',
  fieldName: '',
  fieldCode: '',
  fieldType: '',
  length: '',
  isRequired: false,
  isUnique: false,
  defaultValue: '',
  remark: ''
})

const editingId = ref<string | null>(null)

const columns = [
  { key: 'id', label: '序号', defaultWidth: 80, align: 'center' },
  { key: 'module', label: '所属模块', defaultWidth: 140, align: 'center' },
  { key: 'fieldName', label: '字段名称', defaultWidth: 160 },
  { key: 'fieldCode', label: '字段编码', defaultWidth: 140 },
  { key: 'fieldType', label: '字段类型', defaultWidth: 120, align: 'center' },
  { key: 'length', label: '长度', defaultWidth: 80, align: 'center' },
  { key: 'isRequired', label: '必填', defaultWidth: 80, align: 'center' },
  { key: 'isUnique', label: '唯一', defaultWidth: 80, align: 'center' },
  { key: 'defaultValue', label: '默认值', defaultWidth: 120 },
  { key: 'remark', label: '备注', defaultWidth: 120 },
  { key: 'status', label: '状态', defaultWidth: 100, align: 'center' },
  { key: 'action', label: '操作', defaultWidth: 180, align: 'center' },
  { key: 'empty', label: '', defaultWidth: 0 }
]

const { columnWidths, handleHeaderDragend } = useTableDrag('field', columns)

const fieldTypes = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'datetime', label: '日期时间' },
  { value: 'boolean', label: '布尔值' },
  { value: 'select', label: '下拉选择' },
  { value: 'textarea', label: '多行文本' },
  { value: 'file', label: '文件上传' }
]

const modules = [
  { value: 'product', label: '商品资料' },
  { value: 'supplier', label: '供应商资料' },
  { value: 'customer', label: '客户管理' },
  { value: 'company', label: '公司资料' },
  { value: 'warehouse', label: '仓库管理' },
  { value: 'location', label: '库位管理' },
  { value: 'employee', label: '人员管理' },
  { value: 'order', label: '订单管理' }
]

const fields = ref([
  { id: '01', module: 'product', fieldName: '商品编码', fieldCode: 'productCode', fieldType: 'string', length: '50', isRequired: true, isUnique: true, defaultValue: '', remark: '商品唯一编码', status: '正常' },
  { id: '02', module: 'product', fieldName: '商品名称', fieldCode: 'productName', fieldType: 'string', length: '200', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '03', module: 'product', fieldName: '商品图片', fieldCode: 'productImage', fieldType: 'file', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '商品主图', status: '正常' },
  { id: '04', module: 'product', fieldName: '条形码', fieldCode: 'barcode', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '商品条码', status: '正常' },
  { id: '05', module: 'product', fieldName: '规格型号', fieldCode: 'specification', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '06', module: 'product', fieldName: '产地', fieldCode: 'origin', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '生产产地', status: '正常' },
  { id: '07', module: 'product', fieldName: '品牌', fieldCode: 'brand', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '08', module: 'product', fieldName: '商品类别', fieldCode: 'productCategory', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '医疗器械分类', status: '正常' },
  { id: '09', module: 'product', fieldName: '辅助属性', fieldCode: 'auxiliaryAttr', fieldType: 'string', length: '200', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '10', module: 'product', fieldName: 'SKU编码', fieldCode: 'skuCode', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '库存单位编码', status: '正常' },
  { id: '11', module: 'product', fieldName: '属性组1', fieldCode: 'attrGroup1', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '12', module: 'product', fieldName: '属性组2', fieldCode: 'attrGroup2', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '13', module: 'product', fieldName: '属性组3', fieldCode: 'attrGroup3', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '14', module: 'product', fieldName: '属性组4', fieldCode: 'attrGroup4', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '15', module: 'product', fieldName: '属性组5', fieldCode: 'attrGroup5', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '16', module: 'product', fieldName: '注册证号', fieldCode: 'licenseNo', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '医疗器械注册证号', status: '正常' },
  { id: '17', module: 'product', fieldName: '生产许可证', fieldCode: 'productionLicense', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '18', module: 'product', fieldName: '生产厂家', fieldCode: 'manufacturer', fieldType: 'string', length: '200', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '19', module: 'product', fieldName: '批准文号', fieldCode: 'approvalNo', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '20', module: 'product', fieldName: '商品描述', fieldCode: 'productDesc', fieldType: 'textarea', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '21', module: 'product', fieldName: '批次', fieldCode: 'batchNo', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '生产批次号', status: '正常' },
  { id: '22', module: 'product', fieldName: '生产日期', fieldCode: 'productionDate', fieldType: 'date', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '23', module: 'product', fieldName: '保质期单位', fieldCode: 'expiryUnit', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '天/月/年', status: '正常' },
  { id: '24', module: 'product', fieldName: '保质期', fieldCode: 'expiryDays', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '25', module: 'product', fieldName: '到期日', fieldCode: 'expireDate', fieldType: 'date', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '26', module: 'product', fieldName: '重量单位', fieldCode: 'weightUnit', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: 'kg/g/mg', status: '正常' },
  { id: '27', module: 'product', fieldName: '净重', fieldCode: 'netWeight', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '单个净重', status: '正常' },
  { id: '28', module: 'product', fieldName: '总净重', fieldCode: 'totalNetWeight', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '29', module: 'product', fieldName: '毛重', fieldCode: 'grossWeight', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '单个毛重', status: '正常' },
  { id: '30', module: 'product', fieldName: '总毛重', fieldCode: 'totalGrossWeight', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '31', module: 'product', fieldName: '体积单位', fieldCode: 'volumeUnit', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: 'm³/cm³', status: '正常' },
  { id: '32', module: 'product', fieldName: '体积', fieldCode: 'volume', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '单个体积', status: '正常' },
  { id: '33', module: 'product', fieldName: '总体积', fieldCode: 'totalVolume', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '34', module: 'product', fieldName: '基本单位', fieldCode: 'baseUnit', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '35', module: 'product', fieldName: '辅助单位', fieldCode: 'auxUnit', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '36', module: 'product', fieldName: '换算率', fieldCode: 'conversionRate', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '辅助单位/基本单位', status: '正常' },
  { id: '37', module: 'product', fieldName: '换算公式', fieldCode: 'conversionFormula', fieldType: 'string', length: '200', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '38', module: 'product', fieldName: '整件散包', fieldCode: 'wholePackage', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '39', module: 'product', fieldName: '整件数1', fieldCode: 'wholeQty1', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '40', module: 'product', fieldName: '整件数2', fieldCode: 'wholeQty2', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '41', module: 'product', fieldName: '整件数3', fieldCode: 'wholeQty3', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '42', module: 'product', fieldName: '散包数', fieldCode: 'looseQty', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '43', module: 'product', fieldName: '供应商商品编码', fieldCode: 'supplierProductCode', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '44', module: 'product', fieldName: '供应商商品名称', fieldCode: 'supplierProductName', fieldType: 'string', length: '200', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '45', module: 'product', fieldName: '供应商商品规格型号', fieldCode: 'supplierSpec', fieldType: 'string', length: '100', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '46', module: 'product', fieldName: '仓库', fieldCode: 'warehouse', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '47', module: 'product', fieldName: '仓位', fieldCode: 'location', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '48', module: 'product', fieldName: '可用库存', fieldCode: 'availableStock', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '49', module: 'product', fieldName: '即时库存', fieldCode: 'currentStock', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '50', module: 'product', fieldName: '预计可用库存', fieldCode: 'expectedStock', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '51', module: 'product', fieldName: '销售占用', fieldCode: 'salesOccupy', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '52', module: 'product', fieldName: '采购在途', fieldCode: 'purchaseInTransit', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '53', module: 'product', fieldName: '最近入库日期', fieldCode: 'lastInboundDate', fieldType: 'date', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '54', module: 'order', fieldName: '数量', fieldCode: 'qty', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '55', module: 'order', fieldName: '单位', fieldCode: 'unit', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '56', module: 'order', fieldName: '单价', fieldCode: 'unitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '不含税单价', status: '正常' },
  { id: '57', module: 'order', fieldName: '含税单价', fieldCode: 'taxUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '58', module: 'order', fieldName: '价税合计', fieldCode: 'amountWithTax', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '59', module: 'order', fieldName: '基本数量', fieldCode: 'baseQty', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '60', module: 'order', fieldName: '基本单价', fieldCode: 'baseUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '61', module: 'order', fieldName: '基本含税单价', fieldCode: 'baseTaxUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '62', module: 'order', fieldName: '辅助数量', fieldCode: 'auxQty', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '63', module: 'order', fieldName: '辅助单价', fieldCode: 'auxUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '64', module: 'order', fieldName: '辅助含税单价', fieldCode: 'auxTaxUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '65', module: 'order', fieldName: '参考零售价', fieldCode: 'retailPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '66', module: 'order', fieldName: '折前金额', fieldCode: 'preDiscountAmount', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '67', module: 'order', fieldName: '折扣率（%）', fieldCode: 'discountRate', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '68', module: 'order', fieldName: '折扣（折）', fieldCode: 'discount', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '69', module: 'order', fieldName: '折扣额', fieldCode: 'discountAmount', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '不含税折扣额', status: '正常' },
  { id: '70', module: 'order', fieldName: '含税折扣额', fieldCode: 'taxDiscountAmount', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '71', module: 'order', fieldName: '折后单价', fieldCode: 'discountedUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '不含税折后单价', status: '正常' },
  { id: '72', module: 'order', fieldName: '折后含税单价', fieldCode: 'discountedTaxUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '73', module: 'order', fieldName: '折后金额', fieldCode: 'discountedAmount', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '74', module: 'order', fieldName: '整单折前价税合计', fieldCode: 'orderPreDiscountAmount', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '75', module: 'order', fieldName: '整单折扣分配额', fieldCode: 'orderDiscountAllocation', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '76', module: 'order', fieldName: '不含税金额', fieldCode: 'amountWithoutTax', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '77', module: 'order', fieldName: '增值税税率（%）', fieldCode: 'taxRate', fieldType: 'number', length: '10', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '78', module: 'order', fieldName: '税额', fieldCode: 'taxAmount', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '79', module: 'order', fieldName: '税额本位币', fieldCode: 'taxAmountBase', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '80', module: 'order', fieldName: '价税合计本位币', fieldCode: 'amountWithTaxBase', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '81', module: 'order', fieldName: '实际含税单价', fieldCode: 'actualTaxUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '82', module: 'order', fieldName: '实际不含税金额', fieldCode: 'actualAmountWithoutTax', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '83', module: 'order', fieldName: '实际不含税金额本位币', fieldCode: 'actualAmountWithoutTaxBase', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '84', module: 'order', fieldName: '实际不含税单价', fieldCode: 'actualUnitPrice', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '85', module: 'order', fieldName: '是否赠品', fieldCode: 'isGift', fieldType: 'boolean', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '86', module: 'order', fieldName: '商品行备注', fieldCode: 'itemRemark', fieldType: 'textarea', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '87', module: 'order', fieldName: '交货日期', fieldCode: 'deliveryDate', fieldType: 'date', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '88', module: 'order', fieldName: '行已执行数量', fieldCode: 'executedQty', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '89', module: 'order', fieldName: '行未执行数量', fieldCode: 'unexecutedQty', fieldType: 'number', length: '15', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '90', module: 'order', fieldName: '源单行号', fieldCode: 'sourceLineNo', fieldType: 'string', length: '20', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '91', module: 'order', fieldName: '源单类型', fieldCode: 'sourceType', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '92', module: 'order', fieldName: '源单单号', fieldCode: 'sourceNo', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '93', module: 'supplier', fieldName: '供应商编码', fieldCode: 'supplierCode', fieldType: 'string', length: '50', isRequired: true, isUnique: true, defaultValue: '', remark: '', status: '正常' },
  { id: '94', module: 'supplier', fieldName: '供应商名称', fieldCode: 'supplierName', fieldType: 'string', length: '200', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '95', module: 'supplier', fieldName: '联系人', fieldCode: 'contact', fieldType: 'string', length: '50', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '96', module: 'customer', fieldName: '客户编码', fieldCode: 'customerCode', fieldType: 'string', length: '50', isRequired: true, isUnique: true, defaultValue: '', remark: '', status: '正常' },
  { id: '97', module: 'customer', fieldName: '客户名称', fieldCode: 'customerName', fieldType: 'string', length: '200', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '98', module: 'customer', fieldName: '客户类型', fieldCode: 'customerType', fieldType: 'select', length: '', isRequired: false, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '99', module: 'warehouse', fieldName: '仓库编码', fieldCode: 'warehouseCode', fieldType: 'string', length: '50', isRequired: true, isUnique: true, defaultValue: '', remark: '', status: '正常' },
  { id: '100', module: 'warehouse', fieldName: '仓库名称', fieldCode: 'warehouseName', fieldType: 'string', length: '100', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '101', module: 'warehouse', fieldName: '允许负库存', fieldCode: 'allowNegative', fieldType: 'boolean', length: '', isRequired: false, isUnique: false, defaultValue: 'false', remark: '', status: '正常' },
  { id: '102', module: 'location', fieldName: '库位编码', fieldCode: 'locationCode', fieldType: 'string', length: '50', isRequired: true, isUnique: true, defaultValue: '', remark: '', status: '正常' },
  { id: '103', module: 'location', fieldName: '库位名称', fieldCode: 'locationName', fieldType: 'string', length: '100', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '104', module: 'company', fieldName: '公司名称', fieldCode: 'companyName', fieldType: 'string', length: '200', isRequired: true, isUnique: false, defaultValue: '', remark: '', status: '正常' },
  { id: '105', module: 'company', fieldName: '统一社会信用代码', fieldCode: 'creditCode', fieldType: 'string', length: '18', isRequired: false, isUnique: true, defaultValue: '', remark: '', status: '正常' }
])

const persistFields = () => savePlatformFieldCatalog(fields.value)

onMounted(() => {
  fields.value = loadPlatformFieldCatalog(fields.value)
  persistFields()
})

const filteredFields = computed(() => {
  if (!searchKeyword.value) return fields.value
  const keyword = searchKeyword.value.toLowerCase()
  return fields.value.filter(field => 
    field.fieldName.toLowerCase().includes(keyword) || 
    field.fieldCode.toLowerCase().includes(keyword) ||
    field.module.toLowerCase().includes(keyword)
  )
})

const getModuleLabel = (value: string) => {
  return modules.find(m => m.value === value)?.label || value
}

const getFieldTypeLabel = (value: string) => {
  return fieldTypes.find(t => t.value === value)?.label || value
}

const handleAddField = () => {
  showAddDialog.value = true
}

const handleCloseDialog = () => {
  showAddDialog.value = false
  addForm.value = {
    id: '',
    module: '',
    fieldName: '',
    fieldCode: '',
    fieldType: '',
    length: '',
    isRequired: false,
    isUnique: false,
    defaultValue: '',
    remark: ''
  }
}

const handleSubmitAdd = () => {
  if (!addForm.value.fieldName.trim()) {
    ElMessage.warning('请输入字段名称')
    return
  }
  if (!addForm.value.fieldCode.trim()) {
    ElMessage.warning('请输入字段编码')
    return
  }
  if (!addForm.value.fieldType) {
    ElMessage.warning('请选择字段类型')
    return
  }
  
  if (fields.value.some(f => f.fieldCode === addForm.value.fieldCode)) {
    ElMessage.warning('该字段编码已存在')
    return
  }
  
  const newId = String(Number(fields.value.length) + 1).padStart(2, '0')
  fields.value.push({ 
    id: newId,
    module: addForm.value.module,
    fieldName: addForm.value.fieldName,
    fieldCode: addForm.value.fieldCode,
    fieldType: addForm.value.fieldType,
    length: addForm.value.length,
    isRequired: addForm.value.isRequired,
    isUnique: addForm.value.isUnique,
    defaultValue: addForm.value.defaultValue,
    remark: addForm.value.remark,
    status: '正常'
  })
  
  fields.value.sort((a, b) => a.id.localeCompare(b.id))
  
  persistFields()
  ElMessage.success('添加成功')
  handleCloseDialog()
}

const handleStartEdit = (row: any) => {
  editingId.value = row.id
}

const handleSaveEdit = (row: any) => {
  if (!row.fieldName.trim()) {
    ElMessage.warning('字段名称不能为空')
    return
  }
  if (!row.fieldCode.trim()) {
    ElMessage.warning('字段编码不能为空')
    return
  }
  editingId.value = null
  persistFields()
  ElMessage.success('修改成功')
}

const handleCancelEdit = () => {
  editingId.value = null
}

const handleDeleteField = (row: any) => {
  ElMessageBox.confirm(`确定要删除字段 "${row.fieldName}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    fields.value = fields.value.filter(f => f.id !== row.id)
    persistFields()
    ElMessage.success('删除成功')
  }).catch(() => {
    ElMessage.info('已取消删除')
  })
}

const handleEnableField = (row: any) => {
  row.status = '正常'
  persistFields()
  ElMessage.success('已启用')
}

const handleDisableField = (row: any) => {
  row.status = '停用'
  persistFields()
  ElMessage.success('已停用')
}

const handleCopyField = (row: any) => {
  const newId = String(Number(fields.value.length) + 1).padStart(2, '0')
  fields.value.push({
    id: newId,
    module: row.module,
    fieldName: row.fieldName + ' (复制)',
    fieldCode: row.fieldCode + '_copy',
    fieldType: row.fieldType,
    length: row.length,
    isRequired: row.isRequired,
    isUnique: false,
    defaultValue: row.defaultValue,
    remark: row.remark,
    status: '正常'
  })
  fields.value.sort((a, b) => a.id.localeCompare(b.id))
  persistFields()
  ElMessage.success('复制成功')
}

const handleSearch = () => {
  editingId.value = null
  if (searchKeyword.value.trim()) {
    const count = filteredFields.value.length
    ElMessage.info(`搜索完成，共找到 ${count} 条结果`)
  }
}

const handleRefresh = () => {
  searchKeyword.value = ''
  editingId.value = null
  ElMessage.success('数据已刷新')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-info">
        <h1>平台资料字段目录</h1>
        <div class="breadcrumb">首页 / 平台管理 / 数据维护 / 平台资料字段目录</div>
      </div>
    </div>
    
    <div class="search-bar">
      <el-input 
        v-model="searchKeyword" 
        placeholder="搜索字段名称或字段编码或所属模块" 
        style="width: 300px;"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <span style="color: #667085;">🔍</span>
        </template>
      </el-input>
      <el-button type="primary" @click="handleSearch">查询</el-button>
      <el-button type="primary" @click="handleAddField">新增</el-button>
      <el-button @click="handleRefresh">刷新</el-button>
    </div>
    
    <div class="table-container">
      <el-table :data="filteredFields" class="field-table" border :fit="true" @header-dragend="handleHeaderDragend">
        <el-table-column type="selection" width="55" align="center" fixed="left" />
        
        <el-table-column label="序号" :width="columnWidths.id" align="center" :show-overflow-tooltip="false">
          <template #default="scope">{{ scope.$index + 1 }}</template>
        </el-table-column>
        
        <el-table-column label="所属模块" :width="columnWidths.module" align="center">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.module" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="edit-input" autofocus />
            <span v-else>{{ getModuleLabel(scope.row.module) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="字段名称" :width="columnWidths.fieldName">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.fieldName" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" @keyup.escape="handleCancelEdit" class="edit-input" autofocus />
            <span v-else>{{ scope.row.fieldName }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="字段编码" :width="columnWidths.fieldCode">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.fieldCode" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="edit-input" autofocus />
            <span v-else>{{ scope.row.fieldCode }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="字段类型" :width="columnWidths.fieldType" align="center">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.fieldType" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="edit-input" autofocus />
            <span v-else>{{ getFieldTypeLabel(scope.row.fieldType) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="长度" :width="columnWidths.length" align="center">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.length" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="edit-input" autofocus />
            <span v-else>{{ scope.row.length || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="必填" :width="columnWidths.isRequired" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <el-switch 
              v-model="scope.row.isRequired" 
              active-value="true" 
              inactive-value="false" 
              active-color="#00bfa5"
              inactive-color="#E5E7EB"
              :disabled="editingId !== scope.row.id"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="唯一" :width="columnWidths.isUnique" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <el-switch 
              v-model="scope.row.isUnique" 
              active-value="true" 
              inactive-value="false" 
              active-color="#00bfa5"
              inactive-color="#E5E7EB"
              :disabled="editingId !== scope.row.id"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="默认值" :width="columnWidths.defaultValue">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.defaultValue" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="edit-input" autofocus />
            <span v-else>{{ scope.row.defaultValue || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="备注" :width="columnWidths.remark">
          <template #default="scope">
            <el-input v-if="editingId === scope.row.id" v-model="scope.row.remark" @blur="handleSaveEdit(scope.row)" @keyup.enter="handleSaveEdit(scope.row)" class="remark-input" autofocus />
            <span v-else>{{ scope.row.remark || '-' }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" :width="columnWidths.status" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <el-switch 
              v-model="scope.row.status" 
              active-value="正常" 
              inactive-value="停用" 
              active-color="#00bfa5"
              inactive-color="#f56c6c"
              @change="scope.row.status === '正常' ? handleEnableField(scope.row) : handleDisableField(scope.row)"
            />
          </template>
        </el-table-column>
        
        <el-table-column label="操作" :width="columnWidths.action" align="center" :show-overflow-tooltip="false">
          <template #default="scope">
            <div class="action-buttons">
              <template v-if="editingId === scope.row.id">
                <el-button type="text" size="small" class="btn-save" @click="handleSaveEdit(scope.row)">保存</el-button>
                <el-button type="text" size="small" class="btn-cancel" @click="handleCancelEdit">取消</el-button>
              </template>
              <template v-else>
                <el-button type="text" size="small" class="btn-edit" @click="handleStartEdit(scope.row)">修改</el-button>
                <el-button type="text" size="small" class="btn-delete" @click="handleDeleteField(scope.row)">删除</el-button>
                <el-button type="text" size="small" class="btn-copy" @click="handleCopyField(scope.row)">复制</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column label="" min-width="100" align="center" :resizable="false" />
      </el-table>
      
      <div v-if="filteredFields.length === 0" class="empty-tip">
        <span>暂无数据</span>
      </div>
    </div>
    
    <el-dialog 
      title="新增字段" 
      v-model="showAddDialog" 
      width="600px"
      @close="handleCloseDialog"
    >
      <el-form :model="addForm" label-width="100px">
        <el-form-item label="所属模块">
          <el-select v-model="addForm.module" placeholder="请选择模块">
            <el-option v-for="m in modules" :key="m.value" :label="m.label" :value="m.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="字段名称" required>
          <el-input v-model="addForm.fieldName" placeholder="请输入字段名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="字段编码" required>
          <el-input v-model="addForm.fieldCode" placeholder="请输入字段编码（英文）" maxlength="50" />
        </el-form-item>
        <el-form-item label="字段类型" required>
          <el-select v-model="addForm.fieldType" placeholder="请选择字段类型">
            <el-option v-for="t in fieldTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="长度">
          <el-input v-model="addForm.length" placeholder="请输入长度（字符串类型必填）" maxlength="10" />
        </el-form-item>
        <el-form-item label="必填">
          <el-switch v-model="addForm.isRequired" />
        </el-form-item>
        <el-form-item label="唯一">
          <el-switch v-model="addForm.isUnique" />
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="addForm.defaultValue" placeholder="请输入默认值" maxlength="100" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="addForm.remark" placeholder="请输入备注信息" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleCloseDialog">取消</el-button>
        <el-button type="primary" @click="handleSubmitAdd">确定</el-button>
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
  align-items: center;
  flex-wrap: wrap;
  
  :deep(.el-button) {
    z-index: 1;
    position: relative;
  }
  
  :deep(.el-button--primary) {
    color: #fff !important;
    background-color: #00bfa5 !important;
    border-color: #00bfa5 !important;
  }
}

.table-container { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

.field-table { 
  width: 100%; 
  
  :deep(.el-table__header-wrapper th) {
    border-bottom: 1px solid #E5E7EB;
    border-right: 1px solid #F3F4F6;
    text-align: center !important;
  }
  
  :deep(.el-table__body-wrapper td) {
    border-bottom: 1px solid #F3F4F6;
    border-right: 1px solid #F3F4F6;
  }
  
  :deep(.el-table__header-wrapper th:last-child),
  :deep(.el-table__body-wrapper td:last-child) {
    border-right: none;
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

.empty-tip { 
  text-align: center; padding: 40px 20px; color: #667085; 
  font-size: 14px;
}

.edit-input { width: 100%; }

.remark-input { 
  width: 100%; 
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

:deep(.el-table__body tr) {
  height: 40px;
}

:deep(.el-table__header-wrapper tr) {
  height: 40px;
}

.btn-edit {
  color: #0EB89D !important;
  
  &:hover {
    color: #0BA388 !important;
  }
}

.btn-delete {
  color: #FF8C00 !important;
  
  &:hover {
    color: #E07B00 !important;
  }
}

.btn-copy {
  color: #409EFF !important;
  
  &:hover {
    color: #66B1FF !important;
  }
}

.btn-save {
  color: #0EB89D !important;
  
  &:hover {
    color: #0BA388 !important;
  }
}

.btn-cancel {
  color: #667085 !important;
  
  &:hover {
    color: #4D5566 !important;
  }
}
</style>