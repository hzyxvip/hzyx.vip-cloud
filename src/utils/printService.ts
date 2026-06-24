import { hiprint } from 'vue-plugin-hiprint'
import 'vue-plugin-hiprint/dist/print-lock.css'
import { digitUppercase } from './currency'
import { getCompanyInfo } from './companyConfig'
import { loadPrintSettings } from './printSettings'
import { printSalesOutboundList } from './salesOutboundListPrint'

export interface PrintTemplate {
  templateId: string
  templateName: string
  template: any
}

export interface ProductItem {
  productCode: string
  bidType: string
  productName: string
  spec: string
  manufacturer: string
  unit: string
  quantity: number | string
  unitPrice: number | string
  amount: number | string
  batchNo: string
  productionDate: string
  expiryDate: string
  registrationNo: string
  productionLicenseNo: string
  storageCondition: string
  sterilizationBatchNo?: string
  auxiliaryQty?: string
}

export interface SalesOutboundData {
  companyName: string
  companyAddress: string
  companyPhone: string
  deliveryDate: string
  salesDate?: string
  buyerName: string
  buyerAddress: string
  buyerPhone: string
  documentNo: string
  warehouseName: string
  receiver: string
  receiverPhone: string
  licenseNo?: string
  salesperson?: string
  shipAddress?: string
  receiveAddress?: string
  signPerson?: string
  storageConditionText?: string
  items: ProductItem[]
  totalAmount: number
  qualityStatus: string
}

export interface SalesReturnData {
  companyName: string
  companyAddress: string
  companyPhone: string
  returnDate: string
  buyerName: string
  buyerAddress: string
  buyerPhone: string
  documentNo: string
  returnType: string
  returnReason: string
  items: ProductItem[]
  totalAmount: number
  logisticsCompany: string
  logisticsNo: string
}

export interface PurchaseInboundData {
  companyName: string
  companyAddress: string
  companyPhone: string
  inboundDate: string
  supplierName: string
  supplierAddress: string
  supplierPhone: string
  documentNo: string
  warehouseName: string
  checker: string
  inspector: string
  items: ProductItem[]
  totalAmount: number
  qualityStatus: string
}

export interface PurchaseReturnData {
  companyName: string
  companyAddress: string
  companyPhone: string
  returnDate: string
  supplierName: string
  supplierAddress: string
  supplierPhone: string
  documentNo: string
  returnReason: string
  items: ProductItem[]
  totalAmount: number
  logisticsCompany: string
  logisticsNo: string
}

export interface SalesOrderData {
  companyName: string
  companyAddress: string
  companyPhone: string
  orderDate: string
  deliveryDate: string
  customerName: string
  customerCode: string
  customerAddress: string
  customerPhone: string
  contact: string
  documentNo: string
  warehouseName: string
  items: ProductItem[]
  totalAmount: number
  remark: string
}

const templates: PrintTemplate[] = []

export const initPrint = () => {
  hiprint.init()
}

export const registerTemplate = (template: PrintTemplate) => {
  const existingIndex = templates.findIndex(t => t.templateId === template.templateId)
  if (existingIndex >= 0) {
    templates[existingIndex] = template
  } else {
    templates.push(template)
  }
}

export const getTemplate = (templateId: string): PrintTemplate | undefined => {
  return templates.find(t => t.templateId === templateId)
}

export const createSalesOutboundTemplate = (): PrintTemplate => {
  const template = {
    width: 800,
    height: 1000,
    paperHeader: 20,
    paperFooter: 20,
    elements: [
      {
        type: 'textarea',
        options: {
          text: '{{companyName}}',
          fontSize: 18,
          fontWeight: 'bold',
          width: 800,
          height: 30,
          top: 20,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '销售出库单',
          fontSize: 16,
          fontWeight: 'bold',
          width: 800,
          height: 25,
          top: 50,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '发货日期：{{deliveryDate}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '购买单位：{{buyerName}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 80,
          left: 250
        }
      },
      {
        type: 'textarea',
        options: {
          text: '单据编号：{{documentNo}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 580
        }
      },
      {
        type: 'textarea',
        options: {
          text: '收货地址：{{buyerAddress}}',
          fontSize: 12,
          width: 400,
          height: 20,
          top: 105,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '收货电话：{{buyerPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 105,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '仓库：{{warehouseName}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '签收人：{{receiver}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 200
        }
      },
      {
        type: 'textarea',
        options: {
          text: '联系电话：{{receiverPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 130,
          left: 380
        }
      },
      {
        type: 'table',
        options: {
          top: 160,
          left: 20,
          width: 760,
          height: 400,
          fontSize: 10,
          columns: [
            { title: '商品编码', field: 'productCode', width: 60 },
            { title: '中标类型', field: 'bidType', width: 50 },
            { title: '商品名称', field: 'productName', width: 120 },
            { title: '规格型号', field: 'spec', width: 80 },
            { title: '生产厂家', field: 'manufacturer', width: 100 },
            { title: '单位', field: 'unit', width: 40 },
            { title: '数量', field: 'quantity', width: 50 },
            { title: '单价', field: 'unitPrice', width: 60 },
            { title: '金额', field: 'amount', width: 60 },
            { title: '批号', field: 'batchNo', width: 60 },
            { title: '生产日期', field: 'productionDate', width: 70 },
            { title: '失效日期', field: 'expiryDate', width: 70 }
          ],
          dataKey: 'items'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '注册号：{{items[0].registrationNo}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 570,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '生产许可证号：{{items[0].productionLicenseNo}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 590,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '储运条件：{{items[0].storageCondition}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 610,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '金额合计（大写）：{{totalAmountUppercase}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 600,
          height: 30,
          top: 650,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '合计金额（小写）：¥{{totalAmount}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 200,
          height: 30,
          top: 650,
          left: 600
        }
      },
      {
        type: 'textarea',
        options: {
          text: '质量状况：{{qualityStatus}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 690,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '发货方：{{companyName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 720,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '地址：{{companyAddress}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 745,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '电话：{{companyPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 770,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '签收人签字：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 720,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '日期：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 750,
          left: 450
        }
      }
    ]
  }

  return {
    templateId: 'salesOutbound',
    templateName: '销售出库单',
    template
  }
}

export const createSalesReturnTemplate = (): PrintTemplate => {
  const template = {
    width: 800,
    height: 1000,
    paperHeader: 20,
    paperFooter: 20,
    elements: [
      {
        type: 'textarea',
        options: {
          text: '{{companyName}}',
          fontSize: 18,
          fontWeight: 'bold',
          width: 800,
          height: 30,
          top: 20,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '{{returnTypeLabel}}',
          fontSize: 16,
          fontWeight: 'bold',
          width: 800,
          height: 25,
          top: 50,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货日期：{{returnDate}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '客户名称：{{buyerName}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 80,
          left: 250
        }
      },
      {
        type: 'textarea',
        options: {
          text: '单据编号：{{documentNo}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 580
        }
      },
      {
        type: 'textarea',
        options: {
          text: '客户地址：{{buyerAddress}}',
          fontSize: 12,
          width: 400,
          height: 20,
          top: 105,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '联系电话：{{buyerPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 105,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货原因：{{returnReason}}',
          fontSize: 12,
          width: 760,
          height: 20,
          top: 130,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '物流公司：{{logisticsCompany}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 155,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '物流单号：{{logisticsNo}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 155,
          left: 350
        }
      },
      {
        type: 'table',
        options: {
          top: 190,
          left: 20,
          width: 760,
          height: 400,
          fontSize: 10,
          columns: [
            { title: '商品编码', field: 'productCode', width: 60 },
            { title: '中标类型', field: 'bidType', width: 50 },
            { title: '商品名称', field: 'productName', width: 120 },
            { title: '规格型号', field: 'spec', width: 80 },
            { title: '生产厂家', field: 'manufacturer', width: 100 },
            { title: '单位', field: 'unit', width: 40 },
            { title: '数量', field: 'quantity', width: 50 },
            { title: '单价', field: 'unitPrice', width: 60 },
            { title: '金额', field: 'amount', width: 60 },
            { title: '批号', field: 'batchNo', width: 60 },
            { title: '生产日期', field: 'productionDate', width: 70 },
            { title: '失效日期', field: 'expiryDate', width: 70 }
          ],
          dataKey: 'items'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '金额合计（大写）：{{totalAmountUppercase}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 600,
          height: 30,
          top: 600,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '合计金额（小写）：¥{{totalAmount}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 200,
          height: 30,
          top: 600,
          left: 600
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货方：{{buyerName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 640,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '收货方：{{companyName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 640,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '地址：{{companyAddress}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 665,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '电话：{{companyPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 690,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货人签字：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 665,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '日期：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 695,
          left: 20
        }
      }
    ]
  }

  return {
    templateId: 'salesReturn',
    templateName: '销售退换单',
    template
  }
}

export const createPurchaseInboundTemplate = (): PrintTemplate => {
  const template = {
    width: 800,
    height: 1000,
    paperHeader: 20,
    paperFooter: 20,
    elements: [
      {
        type: 'textarea',
        options: {
          text: '{{companyName}}',
          fontSize: 18,
          fontWeight: 'bold',
          width: 800,
          height: 30,
          top: 20,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '采购入库单',
          fontSize: 16,
          fontWeight: 'bold',
          width: 800,
          height: 25,
          top: 50,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '入库日期：{{inboundDate}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '供应商：{{supplierName}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 80,
          left: 250
        }
      },
      {
        type: 'textarea',
        options: {
          text: '单据编号：{{documentNo}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 580
        }
      },
      {
        type: 'textarea',
        options: {
          text: '供应商地址：{{supplierAddress}}',
          fontSize: 12,
          width: 400,
          height: 20,
          top: 105,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '联系电话：{{supplierPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 105,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '仓库：{{warehouseName}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '验收人：{{checker}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 200
        }
      },
      {
        type: 'textarea',
        options: {
          text: '质检员：{{inspector}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 380
        }
      },
      {
        type: 'table',
        options: {
          top: 160,
          left: 20,
          width: 760,
          height: 400,
          fontSize: 10,
          columns: [
            { title: '商品编码', field: 'productCode', width: 60 },
            { title: '中标类型', field: 'bidType', width: 50 },
            { title: '商品名称', field: 'productName', width: 120 },
            { title: '规格型号', field: 'spec', width: 80 },
            { title: '生产厂家', field: 'manufacturer', width: 100 },
            { title: '单位', field: 'unit', width: 40 },
            { title: '数量', field: 'quantity', width: 50 },
            { title: '单价', field: 'unitPrice', width: 60 },
            { title: '金额', field: 'amount', width: 60 },
            { title: '批号', field: 'batchNo', width: 60 },
            { title: '生产日期', field: 'productionDate', width: 70 },
            { title: '失效日期', field: 'expiryDate', width: 70 }
          ],
          dataKey: 'items'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '注册号：{{items[0].registrationNo}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 570,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '生产许可证号：{{items[0].productionLicenseNo}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 590,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '储运条件：{{items[0].storageCondition}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 610,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '金额合计（大写）：{{totalAmountUppercase}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 600,
          height: 30,
          top: 650,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '合计金额（小写）：¥{{totalAmount}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 200,
          height: 30,
          top: 650,
          left: 600
        }
      },
      {
        type: 'textarea',
        options: {
          text: '质量状况：{{qualityStatus}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 690,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '收货方：{{companyName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 720,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '地址：{{companyAddress}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 745,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '电话：{{companyPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 770,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '验收人签字：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 720,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '日期：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 750,
          left: 450
        }
      }
    ]
  }

  return {
    templateId: 'purchaseInbound',
    templateName: '采购入库单',
    template
  }
}

export const createPurchaseReturnTemplate = (): PrintTemplate => {
  const template = {
    width: 800,
    height: 1000,
    paperHeader: 20,
    paperFooter: 20,
    elements: [
      {
        type: 'textarea',
        options: {
          text: '{{companyName}}',
          fontSize: 18,
          fontWeight: 'bold',
          width: 800,
          height: 30,
          top: 20,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '采购退货单',
          fontSize: 16,
          fontWeight: 'bold',
          width: 800,
          height: 25,
          top: 50,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货日期：{{returnDate}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '供应商：{{supplierName}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 80,
          left: 250
        }
      },
      {
        type: 'textarea',
        options: {
          text: '单据编号：{{documentNo}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 580
        }
      },
      {
        type: 'textarea',
        options: {
          text: '供应商地址：{{supplierAddress}}',
          fontSize: 12,
          width: 400,
          height: 20,
          top: 105,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '联系电话：{{supplierPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 105,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货原因：{{returnReason}}',
          fontSize: 12,
          width: 760,
          height: 20,
          top: 130,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '物流公司：{{logisticsCompany}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 155,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '物流单号：{{logisticsNo}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 155,
          left: 350
        }
      },
      {
        type: 'table',
        options: {
          top: 190,
          left: 20,
          width: 760,
          height: 400,
          fontSize: 10,
          columns: [
            { title: '商品编码', field: 'productCode', width: 60 },
            { title: '中标类型', field: 'bidType', width: 50 },
            { title: '商品名称', field: 'productName', width: 120 },
            { title: '规格型号', field: 'spec', width: 80 },
            { title: '生产厂家', field: 'manufacturer', width: 100 },
            { title: '单位', field: 'unit', width: 40 },
            { title: '数量', field: 'quantity', width: 50 },
            { title: '单价', field: 'unitPrice', width: 60 },
            { title: '金额', field: 'amount', width: 60 },
            { title: '批号', field: 'batchNo', width: 60 },
            { title: '生产日期', field: 'productionDate', width: 70 },
            { title: '失效日期', field: 'expiryDate', width: 70 }
          ],
          dataKey: 'items'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '金额合计（大写）：{{totalAmountUppercase}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 600,
          height: 30,
          top: 600,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '合计金额（小写）：¥{{totalAmount}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 200,
          height: 30,
          top: 600,
          left: 600
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货方：{{companyName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 640,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '收货方：{{supplierName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 640,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '地址：{{supplierAddress}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 665,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '电话：{{supplierPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 690,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '退货人签字：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 665,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '日期：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 695,
          left: 20
        }
      }
    ]
  }

  return {
    templateId: 'purchaseReturn',
    templateName: '采购退货单',
    template
  }
}

export const createSalesOrderTemplate = (): PrintTemplate => {
  const template = {
    width: 800,
    height: 1000,
    paperHeader: 20,
    paperFooter: 20,
    elements: [
      {
        type: 'textarea',
        options: {
          text: '{{companyName}}',
          fontSize: 18,
          fontWeight: 'bold',
          width: 800,
          height: 30,
          top: 20,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '销售订单',
          fontSize: 16,
          fontWeight: 'bold',
          width: 800,
          height: 25,
          top: 50,
          left: 0,
          textAlign: 'center'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '订单日期：{{orderDate}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '客户名称：{{customerName}}',
          fontSize: 12,
          width: 250,
          height: 20,
          top: 80,
          left: 250
        }
      },
      {
        type: 'textarea',
        options: {
          text: '客户编码：{{customerCode}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 80,
          left: 520
        }
      },
      {
        type: 'textarea',
        options: {
          text: '单据编号：{{documentNo}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 80,
          left: 680
        }
      },
      {
        type: 'textarea',
        options: {
          text: '收货地址：{{customerAddress}}',
          fontSize: 12,
          width: 400,
          height: 20,
          top: 105,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '联系电话：{{customerPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 105,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '仓库：{{warehouseName}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '联系人：{{contact}}',
          fontSize: 12,
          width: 150,
          height: 20,
          top: 130,
          left: 200
        }
      },
      {
        type: 'textarea',
        options: {
          text: '预计发货日期：{{deliveryDate}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 130,
          left: 380
        }
      },
      {
        type: 'table',
        options: {
          top: 160,
          left: 20,
          width: 760,
          height: 400,
          fontSize: 10,
          columns: [
            { title: '商品编码', field: 'productCode', width: 60 },
            { title: '中标类型', field: 'bidType', width: 50 },
            { title: '商品名称', field: 'productName', width: 120 },
            { title: '规格型号', field: 'spec', width: 80 },
            { title: '生产厂家', field: 'manufacturer', width: 100 },
            { title: '单位', field: 'unit', width: 40 },
            { title: '数量', field: 'quantity', width: 50 },
            { title: '单价', field: 'unitPrice', width: 60 },
            { title: '金额', field: 'amount', width: 60 },
            { title: '批号', field: 'batchNo', width: 60 },
            { title: '生产日期', field: 'productionDate', width: 70 },
            { title: '失效日期', field: 'expiryDate', width: 70 }
          ],
          dataKey: 'items'
        }
      },
      {
        type: 'textarea',
        options: {
          text: '注册号：{{items[0].registrationNo}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 570,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '生产许可证号：{{items[0].productionLicenseNo}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 590,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '储运条件：{{items[0].storageCondition}}',
          fontSize: 10,
          width: 760,
          height: 20,
          top: 610,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '金额合计（大写）：{{totalAmountUppercase}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 600,
          height: 30,
          top: 650,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '合计金额（小写）：¥{{totalAmount}}',
          fontSize: 14,
          fontWeight: 'bold',
          width: 200,
          height: 30,
          top: 650,
          left: 600
        }
      },
      {
        type: 'textarea',
        options: {
          text: '备注：{{remark}}',
          fontSize: 12,
          width: 760,
          height: 20,
          top: 690,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '订货方：{{customerName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 720,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '供货方：{{companyName}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 720,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '地址：{{companyAddress}}',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 745,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '电话：{{companyPhone}}',
          fontSize: 12,
          width: 200,
          height: 20,
          top: 770,
          left: 450
        }
      },
      {
        type: 'textarea',
        options: {
          text: '订货人签字：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 745,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '日期：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 775,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '供货人签字：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 810,
          left: 20
        }
      },
      {
        type: 'textarea',
        options: {
          text: '日期：________________________',
          fontSize: 12,
          width: 300,
          height: 20,
          top: 840,
          left: 20
        }
      }
    ]
  }

  return {
    templateId: 'salesOrder',
    templateName: '销售订单',
    template
  }
}

export const printSalesOutbound = (data: SalesOutboundData, previewMode = false) => {
  prepareSalesOutboundPrintData(data)
  const settings = loadPrintSettings()
  if (settings.salesOutboundPrintStyle === 'list') {
    printSalesOutboundList(data, previewMode)
    return
  }
  if (previewMode) {
    preview('salesOutbound', data)
    return
  }
  print('salesOutbound', data)
}

function prepareSalesOutboundPrintData(data: SalesOutboundData) {
  const companyInfo = getCompanyInfo()
  const printSettings = loadPrintSettings()
  if (printSettings.showCompanyHeader) {
    data.companyName = data.companyName || companyInfo.name
    data.companyAddress = data.companyAddress || companyInfo.address
    data.companyPhone = data.companyPhone || companyInfo.phone
  }
  data.licenseNo = data.licenseNo || companyInfo.medicalDeviceLicense
  data.shipAddress = data.shipAddress || companyInfo.address
  if (printSettings.footerRemark) {
    data.storageConditionText = data.storageConditionText
      ? `${data.storageConditionText}\n${printSettings.footerRemark}`
      : printSettings.footerRemark
  }
  if (data.totalAmount) {
    ;(data as Record<string, unknown>).totalAmountUppercase = digitUppercase(data.totalAmount)
  }
}

export const print = (templateId: string, data: any) => {
  const printTemplate = getTemplate(templateId)
  if (!printTemplate) {
    throw new Error(`模板 ${templateId} 未注册`)
  }

  // 使用全局配置填充公司信息
  const companyInfo = getCompanyInfo()
  const printSettings = loadPrintSettings()
  if (printSettings.showCompanyHeader) {
    data.companyName = data.companyName || companyInfo.name
    data.companyAddress = data.companyAddress || companyInfo.address
    data.companyPhone = data.companyPhone || companyInfo.phone
  }
  if (printSettings.footerRemark) {
    data.footerRemark = printSettings.footerRemark
  }
  if (printSettings.showAuditSeal === false) {
    data.hideAuditSeal = true
  }

  if (data.totalAmount) {
    data.totalAmountUppercase = digitUppercase(data.totalAmount)
  }

  if (data.returnType === 'return') {
    data.returnTypeLabel = '销售退货单'
  } else if (data.returnType === 'exchange') {
    data.returnTypeLabel = '销售换货单'
  }

  const hiprintTemplate = new hiprint.PrintTemplate({
    template: printTemplate.template,
    data: data
  })

  hiprintTemplate.print()
}

export const preview = (templateId: string, data: any) => {
  const printTemplate = getTemplate(templateId)
  if (!printTemplate) {
    throw new Error(`模板 ${templateId} 未注册`)
  }

  // 使用全局配置填充公司信息
  const companyInfo = getCompanyInfo()
  const printSettings = loadPrintSettings()
  if (printSettings.showCompanyHeader) {
    data.companyName = data.companyName || companyInfo.name
    data.companyAddress = data.companyAddress || companyInfo.address
    data.companyPhone = data.companyPhone || companyInfo.phone
  }
  if (printSettings.footerRemark) {
    data.footerRemark = printSettings.footerRemark
  }
  if (printSettings.showAuditSeal === false) {
    data.hideAuditSeal = true
  }

  if (data.totalAmount) {
    data.totalAmountUppercase = digitUppercase(data.totalAmount)
  }

  if (data.returnType === 'return') {
    data.returnTypeLabel = '销售退货单'
  } else if (data.returnType === 'exchange') {
    data.returnTypeLabel = '销售换货单'
  }

  const hiprintTemplate = new hiprint.PrintTemplate({
    template: printTemplate.template,
    data: data
  })

  hiprintTemplate.preview()
}