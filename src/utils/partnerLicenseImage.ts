import { getPartnerDocFullName } from '@/utils/partnerLicenseDocuments'
import { downloadImageAsset } from '@/utils/downloadWatermark'
import { getLicenseOriginalImageUrl, hasLicenseUploadedImage } from '@/utils/partnerLicenseUpload'
import type { PartnerDocument } from '@/types/partnerProfile'

export function getPartnerDocNoLabel(doc: PartnerDocument): string {
  return doc.docNoLabel || '证照编号'
}

export async function downloadPartnerDocumentImage(doc: PartnerDocument): Promise<void> {
  const originalUrl = getLicenseOriginalImageUrl(doc)
  if (!originalUrl) return

  const fileName = `${getPartnerDocFullName(doc) || '证照'}`
  await downloadImageAsset(originalUrl, fileName, { withWatermark: true })
}

export { hasLicenseUploadedImage, getLicenseOriginalImageUrl, getLicenseDisplayImageUrl } from '@/utils/partnerLicenseUpload'
