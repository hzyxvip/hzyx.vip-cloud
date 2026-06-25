import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/index.scss'
import { elementPlusZhCn, setupChineseLocale } from './utils/localeSetup'
import { initPrint, registerTemplate, createSalesOutboundTemplate, createSalesReturnTemplate, createPurchaseInboundTemplate, createPurchaseReturnTemplate, createSalesOrderTemplate, applyCustomPrintTemplate } from './utils/printService'
import { loadAllCustomTemplateBodies } from './utils/printTemplateSettings'
import { repairAllTenantProfileCaches } from './utils/companyDataService'

setupChineseLocale()
repairAllTenantProfileCaches()

const app = createApp(App)
const pinia = createPinia()

app.use(ElementPlus, { locale: elementPlusZhCn })
app.use(pinia)
app.use(router)

initPrint()
registerTemplate(createSalesOutboundTemplate())
registerTemplate(createSalesReturnTemplate())
registerTemplate(createPurchaseInboundTemplate())
registerTemplate(createPurchaseReturnTemplate())
registerTemplate(createSalesOrderTemplate())

const customTemplateBodies = loadAllCustomTemplateBodies()
Object.entries(customTemplateBodies).forEach(([templateId, body]) => {
  if (body) applyCustomPrintTemplate(templateId, body)
})

app.mount('#app')