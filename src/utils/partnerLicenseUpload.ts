import { ElMessage, ElMessageBox } from 'element-plus'
import type { PartnerDocument } from '@/types/partnerProfile'

/** 免费套餐单张证照图片大小上限（证照扫描/拍照通常 3～8MB） */
export const LICENSE_IMAGE_MAX_SIZE = 10 * 1024 * 1024

export const LICENSE_IMAGE_MAX_SIZE_LABEL = '10MB'

/** 列表展示缩略图目标体积 */
export const LICENSE_THUMBNAIL_MAX_SIZE = 200 * 1024

export const LICENSE_THUMBNAIL_MAX_SIZE_LABEL = '200KB'

/** 测试阶段：单企业已上传证照图数量上限 */
export const LICENSE_MAX_IMAGES_PER_COMPANY = 30

/** 测试阶段：单企业证照原图总容量上限 */
export const LICENSE_MAX_STORAGE_PER_COMPANY = 100 * 1024 * 1024

export const LICENSE_MAX_STORAGE_PER_COMPANY_LABEL = '100MB'

export const LICENSE_IMAGE_UPLOAD_HINT =
  `单张≤${LICENSE_IMAGE_MAX_SIZE_LABEL} · 列表缩略图约${LICENSE_THUMBNAIL_MAX_SIZE_LABEL}内`

export const LICENSE_IMAGE_OVERSIZE_PAY_MESSAGE =
  `当前套餐单张证照图片不得超过 ${LICENSE_IMAGE_MAX_SIZE_LABEL}。如需上传更大文件，请联系平台管理员开通扩容服务或升级付费套餐。`

export interface LicenseImageUploadResult {
  thumbnailUrl: string
  originalUrl: string
  originalSize: number
  thumbnailSize: number
}

export interface CompanyLicenseImageStats {
  count: number
  totalBytes: number
}

export function formatLicenseImageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`
}

export function estimateDataUrlBytes(dataUrl?: string): number {
  if (!dataUrl) return 0
  const base64 = dataUrl.split(',')[1] || ''
  if (!base64) return 0
  return Math.ceil((base64.length * 3) / 4)
}

export function getLicenseDisplayImageUrl(doc: PartnerDocument): string | undefined {
  return doc.imageUrl || doc.imageOriginalUrl
}

export function getLicenseOriginalImageUrl(doc: PartnerDocument): string | undefined {
  return doc.imageOriginalUrl || doc.imageUrl
}

export function hasLicenseUploadedImage(doc: PartnerDocument): boolean {
  return Boolean(getLicenseOriginalImageUrl(doc))
}

export function getCompanyLicenseImageStats(
  documents: PartnerDocument[],
  excludeDocKey?: string
): CompanyLicenseImageStats {
  let count = 0
  let totalBytes = 0

  documents.forEach(doc => {
    if (excludeDocKey && doc.docKey === excludeDocKey) return
    const originalUrl = getLicenseOriginalImageUrl(doc)
    if (!originalUrl) return
    count += 1
    totalBytes += doc.imageSizeBytes || estimateDataUrlBytes(originalUrl)
  })

  return { count, totalBytes }
}

export function formatCompanyLicenseQuota(stats: CompanyLicenseImageStats): string {
  return `已用 ${stats.count}/${LICENSE_MAX_IMAGES_PER_COMPANY} 张 · ${formatLicenseImageSize(stats.totalBytes)}/${LICENSE_MAX_STORAGE_PER_COMPANY_LABEL}`
}

export async function validateLicenseImageFile(file: File): Promise<boolean> {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return false
  }

  if (file.size <= LICENSE_IMAGE_MAX_SIZE) {
    return true
  }

  await ElMessageBox.alert(
    `${LICENSE_IMAGE_OVERSIZE_PAY_MESSAGE}\n\n当前文件：${formatLicenseImageSize(file.size)}`,
    '超出免费上传额度',
    {
      type: 'warning',
      confirmButtonText: '我知道了'
    }
  )
  return false
}

export async function validateCompanyLicenseImageQuota(
  documents: PartnerDocument[],
  file: File,
  replaceDocKey?: string
): Promise<boolean> {
  const stats = getCompanyLicenseImageStats(documents, replaceDocKey)
  const isNewUpload = !replaceDocKey || !documents.some(
    doc => doc.docKey === replaceDocKey && hasLicenseUploadedImage(doc)
  )

  if (isNewUpload && stats.count >= LICENSE_MAX_IMAGES_PER_COMPANY) {
    await ElMessageBox.alert(
      `当前企业已上传 ${stats.count} 张证照图片，已达到测试上限（${LICENSE_MAX_IMAGES_PER_COMPANY} 张）。\n\n请先删除不需要的图片，或联系平台管理员扩容。`,
      '证照数量已达上限',
      { type: 'warning', confirmButtonText: '我知道了' }
    )
    return false
  }

  const projectedBytes = stats.totalBytes + file.size
  if (projectedBytes > LICENSE_MAX_STORAGE_PER_COMPANY) {
    await ElMessageBox.alert(
      `上传后将占用约 ${formatLicenseImageSize(projectedBytes)}，超过本企业测试容量上限（${LICENSE_MAX_STORAGE_PER_COMPANY_LABEL}）。\n\n当前已用：${formatLicenseImageSize(stats.totalBytes)}。请先清理部分证照图片，或联系平台管理员扩容。`,
      '证照容量已达上限',
      { type: 'warning', confirmButtonText: '我知道了' }
    )
    return false
  }

  return true
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file)
  try {
    return await loadImageElement(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function canvasToJpegUnderLimit(
  image: HTMLImageElement,
  maxBytes: number,
  maxEdge: number
): Promise<{ dataUrl: string; size: number }> {
  let width = image.naturalWidth || image.width
  let height = image.naturalHeight || image.height
  let edgeLimit = maxEdge

  while (edgeLimit >= 480) {
    const scale = Math.min(1, edgeLimit / Math.max(width, height))
    const targetWidth = Math.max(1, Math.round(width * scale))
    const targetHeight = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法生成缩略图')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, targetWidth, targetHeight)
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

    let quality = 0.82
    let dataUrl = canvas.toDataURL('image/jpeg', quality)
    while (estimateDataUrlBytes(dataUrl) > maxBytes && quality > 0.35) {
      quality -= 0.07
      dataUrl = canvas.toDataURL('image/jpeg', quality)
    }

    if (estimateDataUrlBytes(dataUrl) <= maxBytes) {
      return { dataUrl, size: estimateDataUrlBytes(dataUrl) }
    }

    edgeLimit = Math.floor(edgeLimit * 0.82)
  }

  throw new Error('缩略图生成失败')
}

export function readLicenseImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

export async function processLicenseImageUpload(file: File): Promise<LicenseImageUploadResult> {
  const [originalUrl, image] = await Promise.all([
    readLicenseImageAsDataUrl(file),
    loadImageFromFile(file)
  ])

  const thumbnail = await canvasToJpegUnderLimit(image, LICENSE_THUMBNAIL_MAX_SIZE, 1280)

  return {
    thumbnailUrl: thumbnail.dataUrl,
    originalUrl,
    originalSize: file.size,
    thumbnailSize: thumbnail.size
  }
}

export function applyLicenseImageUpload(doc: PartnerDocument, result: LicenseImageUploadResult): void {
  doc.imageUrl = result.thumbnailUrl
  doc.imageOriginalUrl = result.originalUrl
  doc.imageSizeBytes = result.originalSize
}

export function clearLicenseImages(doc: PartnerDocument): void {
  doc.imageUrl = ''
  doc.imageOriginalUrl = ''
  doc.imageSizeBytes = 0
}
