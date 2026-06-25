const STORAGE_KEY = 'system-print-custom-templates'

export type CustomPrintTemplateStore = Record<string, unknown>

export function loadAllCustomTemplateBodies(): CustomPrintTemplateStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadCustomTemplateBody(templateId: string): unknown | null {
  const body = loadAllCustomTemplateBodies()[templateId]
  return body ?? null
}

export function saveCustomTemplateBody(templateId: string, template: unknown) {
  const all = loadAllCustomTemplateBodies()
  all[templateId] = template
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function clearCustomTemplateBody(templateId: string) {
  const all = loadAllCustomTemplateBodies()
  delete all[templateId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function hasCustomTemplate(templateId: string): boolean {
  return templateId in loadAllCustomTemplateBodies()
}

export function listCustomTemplateIds(): string[] {
  return Object.keys(loadAllCustomTemplateBodies())
}
