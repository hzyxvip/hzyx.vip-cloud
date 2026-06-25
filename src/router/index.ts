import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue')
  },
  {
    path: '/forget-password',
    name: 'ForgetPassword',
    component: () => import('@/views/ForgetPassword.vue')
  },
  {
    path: '/',
    component: () => import('@/layout/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue')
      },
      {
        path: 'purchase/order-list',
        name: 'PurchaseOrderList',
        component: () => import('@/views/purchase/PurchaseOrderList.vue')
      },
      {
        path: 'purchase/order-list/create/:id?',
        name: 'PurchaseOrderCreate',
        component: () => import('@/views/purchase/PurchaseOrderCreate.vue')
      },
      {
        path: 'purchase/order-list/details',
        name: 'PurchaseDetails',
        component: () => import('@/views/purchase/PurchaseDetails.vue')
      },
      {
        path: 'purchase/inbound',
        name: 'PurchaseInbound',
        component: () => import('@/views/purchase/PurchaseInbound.vue')
      },
      {
        path: 'purchase/inbound-record',
        name: 'PurchaseInboundRecord',
        component: () => import('@/views/purchase/PurchaseInboundRecord.vue')
      },
      {
        path: 'purchase/invoice',
        name: 'PurchaseInvoice',
        component: () => import('@/views/purchase/PurchaseInvoice.vue')
      },
      {
        path: 'purchase/return',
        name: 'PurchaseReturn',
        component: () => import('@/views/purchase/PurchaseReturn.vue')
      },
      {
        path: 'purchase/return-record',
        name: 'PurchaseReturnRecord',
        component: () => import('@/views/purchase/PurchaseReturnRecord.vue')
      },
      {
        path: 'purchase/report',
        name: 'PurchaseReport',
        component: () => import('@/views/purchase/PurchaseReport.vue')
      },
      {
        path: 'purchase/summary',
        name: 'PurchaseSummary',
        component: () => import('@/views/purchase/PurchaseSummary.vue')
      },
      {
        path: 'purchase/finance',
        name: 'PurchaseFinance',
        component: () => import('@/views/purchase/PurchaseFinance.vue')
      },
      {
        path: 'sales/order-list',
        name: 'SalesOrderList',
        component: () => import('@/views/sales/SalesOrderList.vue')
      },
      {
        path: 'sales/order-list/create/:id?',
        name: 'SalesOrderCreate',
        component: () => import('@/views/sales/SalesOrderCreate.vue')
      },
      {
        path: 'sales/order-list/details',
        name: 'SalesDetails',
        component: () => import('@/views/sales/SalesOrderDetails.vue')
      },
      {
        path: 'sales/record',
        name: 'SalesRecord',
        component: () => import('@/views/sales/SalesRecord.vue')
      },
      {
        path: 'sales/outbound',
        name: 'SalesOutbound',
        component: () => import('@/views/sales/SalesOutbound.vue')
      },
      {
        path: 'sales/outbound-record',
        name: 'SalesOutboundRecord',
        component: () => import('@/views/sales/SalesOutboundRecord.vue')
      },
      {
        path: 'sales/template',
        name: 'SalesTemplate',
        component: () => import('@/views/sales/SalesTemplate.vue')
      },
      {
        path: 'sales/return',
        name: 'SalesReturn',
        component: () => import('@/views/sales/SalesReturn.vue')
      },
      {
        path: 'sales/return-record',
        name: 'SalesReturnRecord',
        component: () => import('@/views/sales/SalesReturnRecord.vue')
      },
      {
        path: 'sales/invoice',
        name: 'SalesInvoice',
        component: () => import('@/views/sales/SalesInvoice.vue')
      },
      {
        path: 'sales/invoice-list',
        name: 'SalesInvoiceList',
        component: () => import('@/views/sales/SalesInvoiceList.vue')
      },
      {
        path: 'sales/report',
        name: 'SalesReport',
        component: () => import('@/views/sales/SalesReport.vue')
      },
      {
        path: 'sales/summary',
        name: 'SalesSummary',
        component: () => import('@/views/sales/SalesSummary.vue')
      },
      {
        path: 'warehouse',
        name: 'Warehouse',
        component: () => import('@/views/warehouse/WarehouseList.vue')
      },
      {
        path: 'warehouse/details',
        name: 'WarehouseDetails',
        component: () => import('@/views/warehouse/WarehouseDetails.vue')
      },
      {
        path: 'warehouse/inout',
        name: 'WarehouseInOut',
        component: () => import('@/views/warehouse/WarehouseInOut.vue')
      },
      {
        path: 'warehouse/production',
        name: 'WarehouseProduction',
        component: () => import('@/views/warehouse/WarehouseProduction.vue')
      },
      {
        path: 'warehouse/transfer',
        name: 'WarehouseTransfer',
        component: () => import('@/views/warehouse/WarehouseTransfer.vue')
      },
      {
        path: 'warehouse/transfer-out',
        name: 'WarehouseTransferOut',
        component: () => import('@/views/warehouse/WarehouseTransferOut.vue')
      },
      {
        path: 'warehouse/transfer-in',
        name: 'WarehouseTransferIn',
        component: () => import('@/views/warehouse/WarehouseTransferIn.vue')
      },
      {
        path: 'warehouse/transfer-adjust',
        name: 'WarehouseTransferAdjust',
        component: () => import('@/views/warehouse/WarehouseTransferAdjust.vue')
      },
      {
        path: 'warehouse/other-in-list',
        name: 'WarehouseOtherInList',
        component: () => import('@/views/warehouse/WarehouseOtherInList.vue')
      },
      {
        path: 'warehouse/other-in',
        name: 'WarehouseOtherIn',
        component: () => import('@/views/warehouse/WarehouseOtherIn.vue')
      },
      {
        path: 'warehouse/other-out',
        name: 'WarehouseOtherOut',
        component: () => import('@/views/warehouse/WarehouseOtherOut.vue')
      },
      {
        path: 'warehouse/inventory',
        name: 'WarehouseInventory',
        component: () => import('@/views/warehouse/WarehouseInventory.vue')
      },
      {
        path: 'warehouse/inventory-in',
        name: 'WarehouseInventoryIn',
        component: () => import('@/views/warehouse/WarehouseInventoryIn.vue')
      },
      {
        path: 'warehouse/inventory-out',
        name: 'WarehouseInventoryOut',
        component: () => import('@/views/warehouse/WarehouseInventoryOut.vue')
      },
      {
        path: 'warehouse/reserve',
        name: 'WarehouseReserve',
        component: () => import('@/views/warehouse/WarehouseReserve.vue')
      },
      {
        path: 'fund',
        name: 'Fund',
        component: () => import('@/views/fund/FundList.vue')
      },
      {
        path: 'fund/receivable',
        name: 'FundReceivable',
        component: () => import('@/views/fund/FundReceivable.vue')
      },
      {
        path: 'fund/receivable-detail',
        name: 'FundReceivableDetail',
        component: () => import('@/views/fund/FundReceivableDetail.vue')
      },
      {
        path: 'fund/payment',
        name: 'FundPayment',
        component: () => import('@/views/fund/FundPayment.vue')
      },
      {
        path: 'fund/payment-detail',
        name: 'FundPaymentDetail',
        component: () => import('@/views/fund/FundPaymentDetail.vue')
      },
      {
        path: 'fund/receipt',
        name: 'FundReceipt',
        component: () => import('@/views/fund/FundReceipt.vue')
      },
      {
        path: 'fund/receipt-detail',
        name: 'FundReceiptDetail',
        component: () => import('@/views/fund/FundReceiptDetail.vue')
      },
      {
        path: 'fund/pay',
        name: 'FundPay',
        component: () => import('@/views/fund/FundPay.vue')
      },
      {
        path: 'fund/pay-detail',
        name: 'FundPayDetail',
        component: () => import('@/views/fund/FundPayDetail.vue')
      },
      {
        path: 'fund/receivable-refund',
        name: 'FundReceivableRefund',
        component: () => import('@/views/fund/FundReceivableRefund.vue')
      },
      {
        path: 'fund/payment-refund',
        name: 'FundPaymentRefund',
        component: () => import('@/views/fund/FundPaymentRefund.vue')
      },
      {
        path: 'fund/pre-receipt',
        name: 'FundPreReceipt',
        component: () => import('@/views/fund/FundPreReceipt.vue')
      },
      {
        path: 'fund/pre-payment',
        name: 'FundPrePayment',
        component: () => import('@/views/fund/FundPrePayment.vue')
      },
      {
        path: 'fund/pre-receipt-refund',
        name: 'FundPreReceiptRefund',
        component: () => import('@/views/fund/FundPreReceiptRefund.vue')
      },
      {
        path: 'fund/pre-payment-refund',
        name: 'FundPrePaymentRefund',
        component: () => import('@/views/fund/FundPrePaymentRefund.vue')
      },
      {
        path: 'fund/receipt-collection',
        name: 'FundReceiptCollection',
        component: () => import('@/views/fund/FundReceiptCollection.vue')
      },
      {
        path: 'fund/payment-collection',
        name: 'FundPaymentCollection',
        component: () => import('@/views/fund/FundPaymentCollection.vue')
      },
      {
        path: 'fund/other-income',
        name: 'FundOtherIncome',
        component: () => import('@/views/fund/FundOtherIncome.vue')
      },
      {
        path: 'fund/other-expense',
        name: 'FundOtherExpense',
        component: () => import('@/views/fund/FundOtherExpense.vue')
      },
      {
        path: 'fund/other-income-refund',
        name: 'FundOtherIncomeRefund',
        component: () => import('@/views/fund/FundOtherIncomeRefund.vue')
      },
      {
        path: 'fund/other-expense-refund',
        name: 'FundOtherExpenseRefund',
        component: () => import('@/views/fund/FundOtherExpenseRefund.vue')
      },
      {
        path: 'fund/receivable-stat',
        name: 'FundReceivableStat',
        component: () => import('@/views/fund/FundReceivableStat.vue')
      },
      {
        path: 'fund/payment-stat',
        name: 'FundPaymentStat',
        component: () => import('@/views/fund/FundPaymentStat.vue')
      },
      {
        path: 'fund/receivable-forecast',
        name: 'FundReceivableForecast',
        component: () => import('@/views/fund/FundReceivableForecast.vue')
      },
      {
        path: 'fund/payment-forecast',
        name: 'FundPaymentForecast',
        component: () => import('@/views/fund/FundPaymentForecast.vue')
      },
      {
        path: 'fund/receivable-age',
        name: 'FundReceivableAge',
        component: () => import('@/views/fund/FundReceivableAge.vue')
      },
      {
        path: 'fund/payment-age',
        name: 'FundPaymentAge',
        component: () => import('@/views/fund/FundPaymentAge.vue')
      },
      {
        path: 'fund/merge-receipt',
        name: 'FundMergeReceipt',
        component: () => import('@/views/fund/FundMergeReceipt.vue')
      },
      {
        path: 'fund/report',
        name: 'FundReport',
        component: () => import('@/views/fund/FundReport.vue')
      },
      {
        path: 'fund/cash',
        name: 'FundCash',
        component: () => import('@/views/fund/FundCash.vue')
      },
      {
        path: 'fund/account',
        name: 'FundAccount',
        component: () => import('@/views/fund/FundAccount.vue')
      },
      {
        path: 'data',
        name: 'Data',
        component: () => import('@/views/data/DataList.vue')
      },
      {
        path: 'data/supplier',
        name: 'DataSupplier',
        component: () => import('@/views/data/DataSupplier.vue')
      },
      {
        path: 'data/supplier/create/:id?',
        name: 'DataSupplierCreate',
        component: () => import('@/views/data/DataSupplierCreate.vue')
      },
      {
        path: 'data/customer',
        name: 'DataCustomer',
        component: () => import('@/views/data/DataCustomer.vue')
      },
      {
        path: 'data/customer/detail/:id',
        name: 'DataCustomerDetail',
        component: () => import('@/views/data/DataCustomerDetail.vue')
      },
      {
        path: 'data/customer/create/:id?',
        name: 'DataCustomerCreate',
        component: () => import('@/views/data/DataCustomerCreate.vue')
      },
      {
        path: 'data/barcode-rule',
        name: 'DataBarcodeRule',
        component: () => import('@/views/data/DataBarcodeRule.vue')
      },
      {
        path: 'data/barcode-rule/create/:id?',
        name: 'DataBarcodeRuleCreate',
        component: () => import('@/views/data/DataBarcodeRuleCreate.vue')
      },
      {
        path: 'data/company',
        name: 'DataCompany',
        component: () => import('@/views/data/DataCompany.vue')
      },
      {
        path: 'data/company/intro',
        name: 'DataCompanyIntro',
        component: () => import('@/views/data/DataCompanyIntro.vue')
      },
      {
        path: 'data/company/investment',
        name: 'DataCompanyInvestment',
        component: () => import('@/views/data/DataCompanyInvestment.vue')
      },
      {
        path: 'data/company/license',
        name: 'DataCompanyLicense',
        component: () => import('@/views/data/DataCompanyLicense.vue')
      },
      {
        path: 'data/warehouse',
        name: 'DataWarehouse',
        component: () => import('@/views/data/DataWarehouse.vue')
      },
      {
        path: 'data/location',
        name: 'DataLocation',
        component: () => import('@/views/data/DataLocation.vue')
      },
      {
        path: 'data/position',
        name: 'DataPosition',
        component: () => import('@/views/data/DataPosition.vue')
      },
      {
        path: 'data/account',
        name: 'DataAccount',
        component: () => import('@/views/data/DataAccount.vue')
      },
      {
        path: 'data/product',
        name: 'DataProduct',
        component: () => import('@/views/data/DataProduct.vue')
      },
      {
        path: 'data/product/create',
        name: 'DataProductCreate',
        component: () => import('@/views/data/DataProductCreate.vue')
      },
      {
        path: 'data/product/edit/:id',
        name: 'DataProductEdit',
        component: () => import('@/views/data/DataProductCreate.vue')
      },
      {
        path: 'data/stamp-preview',
        name: 'StampPreview',
        component: () => import('@/views/data/StampPreview.vue')
      },
      {
        path: 'data/product-warning',
        name: 'DataProductWarning',
        component: () => import('@/views/data/DataProductWarning.vue')
      },
      {
        path: 'data/permission',
        name: 'DataPermission',
        component: () => import('@/views/data/DataPermission.vue')
      },
      {
        path: 'data/role',
        name: 'DataRole',
        component: () => import('@/views/data/DataRole.vue')
      },
      {
        path: 'data/inout-type',
        name: 'DataInOutType',
        component: () => import('@/views/data/DataInOutType.vue')
      },
      {
        path: 'data/param-config',
        name: 'DataParamConfig',
        component: () => import('@/views/data/DataParamConfig.vue')
      },
      {
        path: 'platform',
        name: 'Platform',
        component: () => import('@/views/platform/PlatformList.vue')
      },
      {
        path: 'platform/category',
        name: 'PlatformCategory',
        component: () => import('@/views/platform/PlatformCategory.vue')
      },
      {
        path: 'platform/license-validity',
        name: 'PlatformLicenseValidity',
        component: () => import('@/views/platform/PlatformLicenseValidity.vue')
      },
      {
        path: 'platform/license-public',
        name: 'PlatformLicensePublic',
        component: () => import('@/views/platform/PlatformLicensePublic.vue')
      },
      {
        path: 'platform/collab-monitor',
        name: 'PlatformCollabMonitor',
        component: () => import('@/views/platform/PlatformCollabMonitor.vue')
      },
      {
        path: 'platform/product',
        name: 'PlatformProduct',
        component: () => import('@/views/platform/PlatformProduct.vue')
      },
      {
        path: 'platform/product/create',
        name: 'PlatformProductCreate',
        component: () => import('@/views/platform/PlatformProductCreate.vue')
      },
      {
        path: 'platform/product/edit/:id',
        name: 'PlatformProductEdit',
        component: () => import('@/views/platform/PlatformProductCreate.vue')
      },
      {
        path: 'platform/company',
        name: 'PlatformCompany',
        component: () => import('@/views/platform/PlatformCompany.vue')
      },
      {
        path: 'platform/document',
        name: 'PlatformDocument',
        component: () => import('@/views/platform/PlatformDocument.vue')
      },
      {
        path: 'platform/account',
        name: 'PlatformAccount',
        component: () => import('@/views/platform/PlatformAccount.vue')
      },
      {
        path: 'platform/archive',
        name: 'PlatformArchive',
        component: () => import('@/views/platform/PlatformArchive.vue')
      },
      {
        path: 'platform/dictionary',
        name: 'PlatformDictionary',
        component: () => import('@/views/platform/PlatformDictionary.vue')
      },
      {
        path: 'platform/unit',
        name: 'PlatformUnit',
        component: () => import('@/views/platform/PlatformUnit.vue')
      },
      {
        path: 'platform/counting',
        name: 'PlatformCounting',
        component: () => import('@/views/platform/PlatformCounting.vue')
      },
      {
        path: 'platform/customer',
        name: 'PlatformCustomer',
        component: () => import('@/views/platform/PlatformCustomer.vue')
      },
      {
        path: 'platform/customer/create',
        name: 'PlatformCustomerCreate',
        component: () => import('@/views/platform/PlatformCustomerCreate.vue')
      },
      {
        path: 'platform/customer/create/investment',
        name: 'PlatformCustomerCreateInvestment',
        component: () => import('@/views/platform/PlatformCustomerInvestment.vue')
      },
      {
        path: 'platform/customer/create/license',
        name: 'PlatformCustomerCreateLicense',
        component: () => import('@/views/platform/PlatformCustomerLicense.vue')
      },
      {
        path: 'platform/customer/edit/:id',
        name: 'PlatformCustomerEdit',
        component: () => import('@/views/platform/PlatformCustomerCreate.vue')
      },
      {
        path: 'platform/customer/edit/:id/investment',
        name: 'PlatformCustomerEditInvestment',
        component: () => import('@/views/platform/PlatformCustomerInvestment.vue')
      },
      {
        path: 'platform/customer/edit/:id/license',
        name: 'PlatformCustomerEditLicense',
        component: () => import('@/views/platform/PlatformCustomerLicense.vue')
      },
      {
        path: 'platform/field',
        name: 'PlatformField',
        component: () => import('@/views/platform/PlatformField.vue')
      },
      {
        path: 'system/permission',
        name: 'SystemPermission',
        component: () => import('@/views/system/SystemPermission.vue')
      },
      {
        path: 'system/document-function',
        name: 'SystemDocumentFunction',
        component: () => import('@/views/system/SystemDocumentFunction.vue')
      },
      {
        path: 'system/print',
        name: 'SystemPrintSettings',
        component: () => import('@/views/system/SystemPrintSettings.vue')
      },
      {
        path: 'system/print-template',
        name: 'SystemPrintTemplate',
        component: () => import('@/views/system/SystemPrintTemplateEditor.vue')
      },
      {
        path: 'system/document-number',
        name: 'SystemDocumentNumber',
        component: () => import('@/views/system/SystemDocumentNumber.vue')
      },
      {
        path: 'system/batch-no',
        name: 'SystemBatchNoSettings',
        component: () => import('@/views/system/SystemBatchNoSettings.vue')
      },
      {
        path: 'system/account',
        name: 'SystemAccount',
        component: () => import('@/views/platform/PlatformAccount.vue')
      },
      {
        path: 'system/audit-policy',
        name: 'SystemAuditPolicy',
        component: () => import('@/views/system/SystemAuditPolicy.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router