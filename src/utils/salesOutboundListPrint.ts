import { digitUppercase } from './currency'
import { loadPrintSettings } from './printSettings'
import type { SalesOutboundData } from './printService'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrintDate(value?: string): string {
  if (!value) return ''
  return value.slice(0, 10).replace(/-/g, '/')
}

function formatMoney(value: unknown): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return ''
  return num.toFixed(2).replace(/\.?0+$/, '') || '0'
}

function buildAuxiliaryQty(item: SalesOutboundData['items'][number]): string {
  if (item.auxiliaryQty) return item.auxiliaryQty
  const qty = item.quantity
  const unit = item.unit || ''
  if (qty === '' || qty === undefined || qty === null) return ''
  return `${qty}${unit}`
}

function resolveSalesListPageSize(settings: ReturnType<typeof loadPrintSettings>): string {
  if (settings.salesListPaperSize === 'invoiceWide') {
    return '241mm 280mm'
  }
  return '241mm 140mm'
}

function resolveSalesListTypography(settings: ReturnType<typeof loadPrintSettings>) {
  if (settings.salesListPaperSize === 'invoiceWide') {
    return { baseFont: '10.5px', titleFont: '20px', cellPadding: '2px 2px', metaMargin: '8px' }
  }
  return { baseFont: '10px', titleFont: '18px', cellPadding: '2px 2px', metaMargin: '6px' }
}

function buildStyles(settings: ReturnType<typeof loadPrintSettings>): string {
  const pageSize = resolveSalesListPageSize(settings)
  const margin = `${settings.marginMm || 10}mm`
  const { baseFont, titleFont, cellPadding, metaMargin } = resolveSalesListTypography(settings)
  return `
    @page { size: ${pageSize}; margin: ${margin}; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #000;
      font-family: "SimSun", "宋体", serif;
      font-size: ${baseFont};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet { width: 100%; }
    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: ${metaMargin};
      line-height: 1.5;
    }
    .meta-left, .meta-right { width: 32%; }
    .meta-right { text-align: right; }
    .title {
      flex: 1;
      text-align: center;
      font-size: ${titleFont};
      font-weight: 700;
      letter-spacing: 4px;
      line-height: 1.2;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      border: 1px solid #000;
      padding: ${cellPadding};
      text-align: center;
      vertical-align: middle;
      word-break: break-all;
      line-height: 1.35;
    }
    th { font-weight: 700; font-size: ${baseFont}; }
    .dual div + div { margin-top: 2px; }
    .footer-table td { height: 28px; text-align: left; padding-left: 6px; }
    .footer-table .center { text-align: center; }
    .footer-table .right { text-align: right; padding-right: 6px; }
    .storage-line {
      border: 1px solid #000;
      border-top: none;
      padding: 4px 6px;
      line-height: 1.5;
    }
    .page-no {
      margin-top: 6px;
      text-align: right;
      font-size: 11px;
    }
    @media print {
      body { margin: 0; }
    }
  `
}

export function buildSalesOutboundListHtml(data: SalesOutboundData): string {
  const settings = loadPrintSettings()
  const salesDate = formatPrintDate(data.salesDate || data.deliveryDate)
  const totalAmount = Number(data.totalAmount) || 0
  const totalUpper = digitUppercase(totalAmount)
  const storageText = data.storageConditionText
    || data.items.find(item => item.storageCondition)?.storageCondition
    || '常温：空气相对湿度不超过80%且无腐蚀物质清浊，通风良好。'
  const pageRemark = settings.footerRemark ? `<div class="storage-line">${escapeHtml(settings.footerRemark)}</div>` : ''

  const rows = data.items.map(item => `
    <tr>
      <td>${escapeHtml(item.productCode)}</td>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.spec)}</td>
      <td>${escapeHtml(item.manufacturer)}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td>${escapeHtml(item.quantity)}</td>
      <td>${escapeHtml(formatMoney(item.unitPrice))}</td>
      <td>${escapeHtml(formatMoney(item.amount))}</td>
      <td class="dual">
        <div>${escapeHtml(item.batchNo || '/')}</div>
        <div>${escapeHtml(formatPrintDate(item.expiryDate))}</div>
      </td>
      <td class="dual">
        <div>${escapeHtml(item.sterilizationBatchNo || '/')}</div>
        <div>${escapeHtml(buildAuxiliaryQty(item))}</div>
      </td>
      <td class="dual">
        <div>${escapeHtml(item.productionLicenseNo || '/')}</div>
        <div>${escapeHtml(item.registrationNo || '/')}</div>
      </td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>销售清单 ${escapeHtml(data.documentNo)}</title>
  <style>${buildStyles(settings)}</style>
</head>
<body>
  <div class="sheet">
    <div class="meta-row">
      <div class="meta-left">
        <div>销售日期：${escapeHtml(salesDate)}</div>
        <div>购货单位：${escapeHtml(data.buyerName)}</div>
      </div>
      <div class="title">销售清单</div>
      <div class="meta-right">
        <div>销售单号：${escapeHtml(data.documentNo)}</div>
        <div>许可证号：${escapeHtml(data.licenseNo || '')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:9%">商品编号</th>
          <th style="width:11%">商品名称</th>
          <th style="width:8%">规格（型号）</th>
          <th style="width:12%">生产企业</th>
          <th style="width:4%">单位</th>
          <th style="width:5%">数量</th>
          <th style="width:5%">单价</th>
          <th style="width:6%">金额</th>
          <th style="width:10%">生产批号<br/>失效期至</th>
          <th style="width:10%">灭菌批号<br/>辅助数量</th>
          <th style="width:20%">生产企业许可证号<br/>注册证号</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <table class="footer-table">
      <tr>
        <td colspan="4">合计人民币(大写)：${escapeHtml(totalUpper)}</td>
        <td colspan="3" class="center">合计（小写）：${escapeHtml(formatMoney(totalAmount))}</td>
        <td colspan="4" class="right">本页小计：${escapeHtml(formatMoney(totalAmount))}</td>
      </tr>
      <tr>
        <td colspan="2">业务员：${escapeHtml(data.salesperson || data.receiver || '')}</td>
        <td colspan="2">电话：${escapeHtml(data.buyerPhone || data.receiverPhone || '')}</td>
        <td colspan="3">联系人：${escapeHtml(data.receiver || data.buyerName || '')}</td>
        <td colspan="4">签收人：${escapeHtml(data.signPerson || '')}</td>
      </tr>
      <tr>
        <td colspan="5">发货地址：${escapeHtml(data.shipAddress || data.companyAddress || '')}</td>
        <td colspan="6">收货地址：${escapeHtml(data.receiveAddress || data.buyerAddress || '')}</td>
      </tr>
    </table>

    <div class="storage-line">${escapeHtml(storageText)}</div>
    ${pageRemark}
    <div class="page-no">第 1 页/共 1 页</div>
  </div>
</body>
</html>`
}

const PREVIEW_ROOT_ID = 'sales-outbound-list-print-preview'

function writeHtmlToFrame(frame: HTMLIFrameElement, html: string) {
  const doc = frame.contentDocument || frame.contentWindow?.document
  if (!doc) throw new Error('无法创建打印预览')
  doc.open()
  doc.write(html)
  doc.close()
}

function printHtmlDirect(html: string) {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  document.body.appendChild(frame)
  writeHtmlToFrame(frame, html)
  window.setTimeout(() => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
  }, 300)
  window.setTimeout(() => frame.remove(), 60_000)
}

function showHtmlPrintPreview(html: string, title: string) {
  closeHtmlPrintPreview()

  const overlay = document.createElement('div')
  overlay.id = PREVIEW_ROOT_ID
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:10000',
    'display:flex',
    'flex-direction:column',
    'background:rgba(0,0,0,0.45)'
  ].join(';')

  const panel = document.createElement('div')
  panel.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'width:min(1200px,96vw)',
    'height:min(900px,92vh)',
    'margin:auto',
    'background:#fff',
    'border-radius:8px',
    'overflow:hidden',
    'box-shadow:0 8px 32px rgba(0,0,0,0.2)'
  ].join(';')

  const toolbar = document.createElement('div')
  toolbar.style.cssText = [
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'gap:12px',
    'padding:10px 16px',
    'border-bottom:1px solid #ebeef5',
    'background:#f5f7fa'
  ].join(';')

  const titleEl = document.createElement('div')
  titleEl.textContent = title
  titleEl.style.cssText = 'font-size:14px;font-weight:600;color:#303133'

  const actions = document.createElement('div')
  actions.style.cssText = 'display:flex;gap:8px'

  const printBtn = document.createElement('button')
  printBtn.type = 'button'
  printBtn.textContent = '打印'
  printBtn.style.cssText = [
    'border:none',
    'border-radius:4px',
    'padding:7px 16px',
    'background:#409eff',
    'color:#fff',
    'cursor:pointer',
    'font-size:13px'
  ].join(';')

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = '关闭'
  closeBtn.style.cssText = [
    'border:1px solid #dcdfe6',
    'border-radius:4px',
    'padding:7px 16px',
    'background:#fff',
    'color:#606266',
    'cursor:pointer',
    'font-size:13px'
  ].join(';')

  const frame = document.createElement('iframe')
  frame.title = title
  frame.style.cssText = 'flex:1;width:100%;border:0;background:#fff'

  actions.append(printBtn, closeBtn)
  toolbar.append(titleEl, actions)
  panel.append(toolbar, frame)
  overlay.append(panel)
  document.body.append(overlay)

  writeHtmlToFrame(frame, html)

  printBtn.addEventListener('click', () => {
    frame.contentWindow?.focus()
    frame.contentWindow?.print()
  })
  closeBtn.addEventListener('click', closeHtmlPrintPreview)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeHtmlPrintPreview()
  })
}

function closeHtmlPrintPreview() {
  document.getElementById(PREVIEW_ROOT_ID)?.remove()
}

export function printSalesOutboundList(data: SalesOutboundData, preview = false) {
  const html = buildSalesOutboundListHtml(data)
  const title = `销售清单 ${data.documentNo}`
  if (preview) {
    showHtmlPrintPreview(html, title)
    return
  }
  printHtmlDirect(html)
}
