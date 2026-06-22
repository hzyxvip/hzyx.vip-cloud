const WATERMARK_SETTINGS_KEY = 'platform-download-watermark-settings'

export interface DownloadWatermarkSettings {
  enabled: boolean
  mainText: string
  footerText: string
  includeCompanyName: boolean
  includeDownloader: boolean
  includeDateTime: boolean
}

export const DEFAULT_DOWNLOAD_WATERMARK_SETTINGS: DownloadWatermarkSettings = {
  enabled: true,
  mainText: '医享云平台',
  footerText: '仅供业务核验 · 禁止外传',
  includeCompanyName: true,
  includeDownloader: true,
  includeDateTime: true
}

export function loadDownloadWatermarkSettings(): DownloadWatermarkSettings {
  const raw = localStorage.getItem(WATERMARK_SETTINGS_KEY)
  if (!raw) return { ...DEFAULT_DOWNLOAD_WATERMARK_SETTINGS }
  try {
    const parsed = JSON.parse(raw) as Partial<DownloadWatermarkSettings>
    return {
      ...DEFAULT_DOWNLOAD_WATERMARK_SETTINGS,
      ...parsed
    }
  } catch {
    return { ...DEFAULT_DOWNLOAD_WATERMARK_SETTINGS }
  }
}

export function saveDownloadWatermarkSettings(settings: DownloadWatermarkSettings): void {
  localStorage.setItem(WATERMARK_SETTINGS_KEY, JSON.stringify(settings))
}

export function isDownloadWatermarkEnabled(): boolean {
  return loadDownloadWatermarkSettings().enabled
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

function getDownloaderContext() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return {
      companyName: String(user.companyName || ''),
      downloader: String(user.realName || user.username || '')
    }
  } catch {
    return { companyName: '', downloader: '' }
  }
}

export function buildWatermarkLines(settings = loadDownloadWatermarkSettings()): string[] {
  const context = getDownloaderContext()
  const lines: string[] = []

  if (settings.includeCompanyName && context.companyName) {
    lines.push(context.companyName)
  }
  if (settings.mainText.trim()) {
    lines.push(settings.mainText.trim())
  }
  if (settings.includeDownloader && context.downloader) {
    lines.push(`下载人：${context.downloader}`)
  }
  if (settings.includeDateTime) {
    const now = new Date()
    const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    lines.push(formatted)
  }
  if (settings.footerText.trim()) {
    lines.push(settings.footerText.trim())
  }

  return lines.length ? lines : [settings.mainText || '医享云平台']
}

function drawTiledWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lines: string[]
) {
  const fontSize = Math.max(14, Math.floor(Math.min(width, height) / 28))
  const lineHeight = Math.round(fontSize * 1.35)
  const blockHeight = lines.length * lineHeight
  const blockText = lines.join('\n')
  ctx.save()
  ctx.globalAlpha = 0.18
  ctx.fillStyle = '#1f2937'
  ctx.font = `600 ${fontSize}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const stepX = Math.max(220, fontSize * 12)
  const stepY = Math.max(160, blockHeight + fontSize * 4)
  const radians = (-24 * Math.PI) / 180

  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(radians)
      blockText.split('\n').forEach((line, index) => {
        const offsetY = (index - (lines.length - 1) / 2) * lineHeight
        ctx.fillText(line, 0, offsetY)
      })
      ctx.restore()
    }
  }
  ctx.restore()
}

function drawCornerWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lines: string[]
) {
  const fontSize = Math.max(12, Math.floor(Math.min(width, height) / 36))
  const padding = Math.max(10, Math.floor(fontSize * 0.8))
  const lineHeight = Math.round(fontSize * 1.4)

  ctx.save()
  ctx.font = `600 ${fontSize}px "Microsoft YaHei", sans-serif`
  const blockWidth = Math.max(...lines.map(line => ctx.measureText(line).width), fontSize * 4) + padding * 2
  const blockHeight = lines.length * lineHeight + padding * 2
  const x = width - blockWidth - padding
  const y = height - blockHeight - padding

  ctx.globalAlpha = 0.82
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
  ctx.fillRect(x, y, blockWidth, blockHeight)
  ctx.strokeStyle = 'rgba(0, 191, 165, 0.45)'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, blockWidth, blockHeight)
  ctx.globalAlpha = 0.95
  ctx.fillStyle = '#344054'
  ctx.font = `600 ${fontSize}px "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  lines.forEach((line, index) => {
    ctx.fillText(line, x + padding, y + padding + index * lineHeight)
  })
  ctx.restore()
}

export async function renderImageWithWatermark(
  imageUrl: string,
  lines = buildWatermarkLines()
): Promise<string> {
  const image = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法生成水印')

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  drawTiledWatermark(ctx, canvas.width, canvas.height, lines)
  drawCornerWatermark(ctx, canvas.width, canvas.height, lines)

  const mime = imageUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png'
  return canvas.toDataURL(mime, 0.92)
}

export async function downloadImageAsset(
  imageUrl: string,
  fileName: string,
  options?: { withWatermark?: boolean; watermarkLines?: string[] }
): Promise<void> {
  const settings = loadDownloadWatermarkSettings()
  const shouldWatermark = options?.withWatermark ?? settings.enabled
  let href = imageUrl

  if (shouldWatermark) {
    href = await renderImageWithWatermark(
      imageUrl,
      options?.watermarkLines || buildWatermarkLines(settings)
    )
  }

  const ext = href.startsWith('data:image/jpeg') ? 'jpg' : 'png'
  const link = document.createElement('a')
  link.href = href
  link.download = fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
