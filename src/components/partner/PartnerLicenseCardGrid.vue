<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Rank } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import Sortable from 'sortablejs'
import { isLongTermDocument, getPartnerDocumentDaysLeft, evaluatePartnerDocumentStatus, resolveLicenseImageOrientation, isRepeatableProductLicense, isProductLicenseDuplicateKey, resolvePartnerDocTemplateKey } from '@/utils/partnerLicenseDocuments'
import { downloadPartnerDocumentImage, getPartnerDocNoLabel } from '@/utils/partnerLicenseImage'
import {
  applyLicenseImageUpload,
  clearLicenseImages,
  getLicenseDisplayImageUrl,
  getLicenseOriginalImageUrl,
  hasLicenseUploadedImage,
  LICENSE_IMAGE_UPLOAD_HINT,
  processLicenseImageUpload,
  validateCompanyLicenseImageQuota,
  validateLicenseImageFile
} from '@/utils/partnerLicenseUpload'
import { getPartnerLicenseWarningMonths } from '@/utils/partnerLicenseWarning'
import { setLicenseSectionItemOrder } from '@/utils/partnerLicenseSettings'
import PartnerLicenseDocName from '@/components/partner/PartnerLicenseDocName.vue'
import { isTenantLicenseDeletable } from '@/utils/tenantCompanyLicenseService'
import type { PartnerDocument } from '@/types/partnerProfile'

const props = defineProps<{
  documents: PartnerDocument[]
  /** 全量证照，用于统计企业上传配额 */
  allDocuments?: PartnerDocument[]
  sectionCode: string
  readonly?: boolean
  warningMonths?: number
  /** 租户模式：排序仅回写本企业资料，不写全局模板顺序 */
  localOrderOnly?: boolean
}>()

const emit = defineEmits<{
  'order-change': [orderedKeys: string[]]
  duplicate: [doc: PartnerDocument]
  remove: [doc: PartnerDocument]
}>()

const gridRef = ref<HTMLElement | null>(null)
let sortable: Sortable | null = null

const previewList = ref<string[]>([])
const previewVisible = ref(false)
const previewLoading = ref(false)

const quotaDocuments = computed(() => props.allDocuments || props.documents)

const displayImageUrl = (doc: PartnerDocument) => getLicenseDisplayImageUrl(doc)

const openPreview = async (doc: PartnerDocument) => {
  const thumb = getLicenseDisplayImageUrl(doc)
  const original = getLicenseOriginalImageUrl(doc)
  if (!thumb && !original) return

  previewList.value = [thumb || original!]
  previewVisible.value = true

  if (!original || original === thumb) return

  previewLoading.value = true
  try {
    await loadImageElement(original)
    if (previewVisible.value) {
      previewList.value = [original]
    }
  } catch {
    ElMessage.warning('原图加载失败，已显示缩略图')
  } finally {
    previewLoading.value = false
  }
}

function loadImageElement(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
}

const handleImageChange = async (uploadFile: UploadFile, doc: PartnerDocument) => {
  const raw = uploadFile.raw
  if (!raw) return
  if (!(await validateLicenseImageFile(raw))) return
  if (!(await validateCompanyLicenseImageQuota(quotaDocuments.value, raw, doc.docKey))) return

  try {
    const result = await processLicenseImageUpload(raw)
    applyLicenseImageUpload(doc, result)
    const img = new Image()
    img.onload = () => {
      doc.imageOrientation = img.width >= img.height * 1.15 ? 'horizontal' : 'vertical'
    }
    img.src = result.originalUrl
    ElMessage.success(`上传成功（列表缩略图 ${Math.round(result.thumbnailSize / 1024)}KB）`)
  } catch {
    ElMessage.error('图片处理失败，请重试')
  }
}

const clearImage = (doc: PartnerDocument) => {
  clearLicenseImages(doc)
}

const handleDownloadImage = async (doc: PartnerDocument) => {
  try {
    await downloadPartnerDocumentImage(doc)
    ElMessage.success('证照已下载（含水印）')
  } catch (error: any) {
    ElMessage.error(error?.message || '下载失败')
  }
}

const cardStatusClass = (doc: PartnerDocument) => {
  if (doc.status === '已过期') return 'is-expired'
  if (doc.status === '即将到期') return 'is-warning'
  return ''
}

const cardOrientationClass = (doc: PartnerDocument) => {
  return resolveLicenseImageOrientation(doc) === 'horizontal' ? 'is-horizontal' : 'is-vertical'
}

const toggleOrientation = (doc: PartnerDocument) => {
  const current = resolveLicenseImageOrientation(doc)
  doc.imageOrientation = current === 'horizontal' ? 'vertical' : 'horizontal'
}

const daysLeftText = (doc: PartnerDocument) => {
  const days = getPartnerDocumentDaysLeft(doc)
  if (days === null) return ''
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (doc.status === '即将到期') return `剩余 ${days} 天`
  return ''
}

const refreshDocStatus = (doc: PartnerDocument) => {
  if (isLongTermDocument(doc)) return
  const months = props.warningMonths ?? getPartnerLicenseWarningMonths()
  doc.status = evaluatePartnerDocumentStatus(doc, months)
}

const destroySortable = () => {
  sortable?.destroy()
  sortable = null
}

const initSortable = () => {
  destroySortable()
  if (!gridRef.value || props.readonly || props.documents.length < 2) return

  sortable = Sortable.create(gridRef.value, {
    animation: 150,
    draggable: '.license-card',
    handle: '.drag-handle',
    ghostClass: 'sortable-ghost',
    onEnd: evt => {
      const { oldIndex, newIndex } = evt
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

      const nextDocs = [...props.documents]
      const [moved] = nextDocs.splice(oldIndex, 1)
      nextDocs.splice(newIndex, 0, moved)
      props.documents.splice(0, props.documents.length, ...nextDocs)
      if (!props.localOrderOnly) {
        setLicenseSectionItemOrder(
          props.sectionCode,
          nextDocs.map(doc => doc.docKey).filter((key): key is string => Boolean(key))
        )
      }
      emit('order-change', nextDocs.map(doc => doc.docKey).filter((key): key is string => Boolean(key)))
    }
  })
}

watch(
  () => [props.readonly, props.sectionCode, props.documents.length],
  () => initSortable()
)

onMounted(() => initSortable())
onBeforeUnmount(() => destroySortable())
</script>

<template>
  <div class="license-card-grid-wrap">
    <div
      ref="gridRef"
      class="license-card-grid"
    >
      <div
        v-for="doc in documents"
        :key="doc.docKey || doc.id"
        class="license-card"
        :class="[cardStatusClass(doc), cardOrientationClass(doc)]"
      >
        <button
          v-if="!readonly && documents.length > 1"
          type="button"
          class="drag-handle"
          aria-label="拖拽排序"
          @mousedown.stop
        >
          <el-icon><Rank /></el-icon>
        </button>
        <div class="card-head">
          <PartnerLicenseDocName
            class="card-title"
            :doc-name="doc.docName"
            :doc-name-sub="doc.docNameSub"
            centered
          />
          <div v-if="isProductLicenseDuplicateKey(doc.docKey)" class="duplicate-badge">副本</div>
          <div class="card-meta">
            <div v-if="doc.validityNote && !isLongTermDocument(doc)" class="validity-note">{{ doc.validityNote }}</div>
            <el-tag v-else-if="isLongTermDocument(doc)" size="small" type="info" class="long-term-tag">长期有效</el-tag>
            <div v-else-if="daysLeftText(doc)" class="days-left-tip">{{ daysLeftText(doc) }}</div>
          </div>
        </div>

        <div class="image-box">
          <div
            class="image-frame"
            :class="{ 'has-image': hasLicenseUploadedImage(doc), clickable: hasLicenseUploadedImage(doc) }"
            @click="hasLicenseUploadedImage(doc) ? openPreview(doc) : undefined"
          >
            <img
              v-if="displayImageUrl(doc)"
              :src="displayImageUrl(doc)"
              class="license-image"
              alt="证照图片"
              loading="lazy"
              @click.stop="openPreview(doc)"
            />
            <div v-else class="image-placeholder">
              <span>证照图片</span>
              <span class="upload-limit-hint">{{ LICENSE_IMAGE_UPLOAD_HINT }}</span>
            </div>

            <div v-if="hasLicenseUploadedImage(doc)" class="image-preview-tip">点击预览原图</div>
          </div>

          <div class="image-actions">
            <el-button
              v-if="!readonly && isRepeatableProductLicense(resolvePartnerDocTemplateKey(doc))"
              class="license-action-btn"
              type="primary"
              plain
              size="small"
              :icon="Plus"
              @click.stop="emit('duplicate', doc)"
            >再添加</el-button>
            <el-button
              v-if="!readonly"
              class="license-action-btn"
              type="primary"
              plain
              size="small"
              :title="resolveLicenseImageOrientation(doc) === 'horizontal' ? '切换为竖放，适合窄卡片阅读' : '切换为横放，适合营业执照等宽幅证照'"
              @click.stop="toggleOrientation(doc)"
            >{{ resolveLicenseImageOrientation(doc) === 'horizontal' ? '竖放' : '横放' }}</el-button>
            <el-upload
              v-if="!readonly"
              class="image-upload"
              :show-file-list="false"
              accept="image/*"
              :auto-upload="false"
              :on-change="file => handleImageChange(file, doc)"
            >
              <el-button class="license-action-btn" type="primary" plain size="small">{{ hasLicenseUploadedImage(doc) ? '更换' : '上传' }}</el-button>
            </el-upload>
            <el-button
              v-if="hasLicenseUploadedImage(doc)"
              class="license-action-btn"
              type="primary"
              plain
              size="small"
              @click.stop="openPreview(doc)"
            >预览</el-button>
            <el-button
              v-if="hasLicenseUploadedImage(doc)"
              class="license-action-btn"
              type="primary"
              plain
              size="small"
              @click.stop="handleDownloadImage(doc)"
            >下载</el-button>
            <el-button
              v-if="!readonly && hasLicenseUploadedImage(doc)"
              class="license-action-btn license-action-btn--danger"
              type="danger"
              plain
              size="small"
              @click.stop="clearImage(doc)"
            >清除</el-button>
            <el-button
              v-if="!readonly && (isProductLicenseDuplicateKey(doc.docKey) || (localOrderOnly && isTenantLicenseDeletable(doc.docKey)))"
              class="license-action-btn license-action-btn--danger"
              type="danger"
              plain
              size="small"
              @click.stop="emit('remove', doc)"
            >删除</el-button>
          </div>
        </div>

        <div class="card-fields">
          <div class="field-block">
            <label class="field-label">{{ getPartnerDocNoLabel(doc) }}</label>
            <span v-if="readonly" class="readonly-value">{{ doc.docNo || '-' }}</span>
            <el-input v-else v-model="doc.docNo" size="small" :placeholder="`请输入${getPartnerDocNoLabel(doc)}`" />
          </div>

          <div class="date-row">
            <div class="date-field">
              <label class="field-label">启用日期</label>
              <span v-if="readonly" class="readonly-value">{{ doc.issueDate || '-' }}</span>
              <el-date-picker
                v-else
                v-model="doc.issueDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="启用日期"
                size="small"
                style="width: 100%;"
                @change="refreshDocStatus(doc)"
              />
            </div>
            <div class="date-field">
              <label class="field-label">到期日期</label>
              <span v-if="isLongTermDocument(doc) || readonly" class="readonly-value long-term-text">
                {{ isLongTermDocument(doc) ? '长期有效' : (doc.expireDate || '-') }}
              </span>
              <el-date-picker
                v-else
                v-model="doc.expireDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="到期日期"
                size="small"
                style="width: 100%;"
                @change="refreshDocStatus(doc)"
              />
            </div>
          </div>

          <div class="status-row">
            <label class="field-label">状态</label>
            <el-tag v-if="readonly" size="small" :type="doc.status === '有效' ? 'success' : doc.status === '即将到期' ? 'warning' : 'danger'">
              {{ doc.status || '-' }}
            </el-tag>
            <el-select v-else v-model="doc.status" size="small" style="width: 100%;">
              <el-option label="有效" value="有效" />
              <el-option label="即将到期" value="即将到期" />
              <el-option label="已过期" value="已过期" />
            </el-select>
          </div>
        </div>
      </div>
    </div>

    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewList"
      teleported
      @close="previewVisible = false"
    />
    <div v-if="previewLoading" class="preview-loading-mask">原图加载中...</div>
  </div>
</template>

<style lang="scss" scoped>
.license-card-grid-wrap {
  width: 100%;
  overflow: hidden;
}

.license-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 10px;
  align-items: start;
}

.license-card {
  position: relative;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 8px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  height: 100%;

  &.is-vertical .image-frame {
    aspect-ratio: 3 / 4;
    min-height: 132px;
  }

  &.is-horizontal {
    grid-column: span 2;

    .image-frame {
      aspect-ratio: 4 / 3;
      min-height: 148px;
    }
  }

  @media (max-width: 560px) {
    &.is-horizontal {
      grid-column: span 1;
    }
  }

  &.sortable-ghost {
    opacity: 0.45;
    border-style: dashed;
    border-color: #00bfa5;
  }

  &.is-warning {
    border-color: #f5a623;
    background: #fffaf0;
    box-shadow: inset 0 0 0 1px rgba(245, 166, 35, 0.15);
  }

  &.is-expired {
    border-color: #f56c6c;
    background: #fff5f5;
    box-shadow: inset 0 0 0 1px rgba(245, 108, 108, 0.15);
  }
}

.card-head {
  min-height: 50px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  min-height: 28px;

  :deep(.name-main) {
    font-size: 12px;
    font-weight: 600;
    color: #344054;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.35;
  }

  :deep(.name-sub) {
    font-size: 11px;
    font-weight: 500;
    color: #667085;
  }
}

.card-meta {
  min-height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.duplicate-badge {
  align-self: center;
  font-size: 10px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 999px;
  color: #007a6a;
  background: #ecfdf8;
  border: 1px solid #b2f0e3;
}

.validity-note {
  text-align: center;
  font-size: 10px;
  color: #667085;
  line-height: 1.2;
  width: 100%;
}

.days-left-tip {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: #d97706;
  line-height: 1.2;
  width: 100%;
}

.long-term-tag {
  flex-shrink: 0;
}

.card-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.image-box {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  width: 100%;
}

.image-frame {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;

  &.has-image {
    border-style: solid;
    border-color: #dcdfe6;
    cursor: zoom-in;

    &:hover {
      border-color: #00bfa5;
      box-shadow: inset 0 0 0 1px rgba(0, 191, 165, 0.15);
    }
  }
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #98a2b3;
  font-size: 12px;

  .upload-limit-hint {
    font-size: 10px;
    color: #b0b7c3;
  }
}

.license-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  background: #fff;
}

.image-preview-tip {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  line-height: 1.4;
  pointer-events: none;
}

.image-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  gap: 6px;
  min-height: 44px;
  width: 100%;
  padding-top: 2px;

  :deep(.license-action-btn.el-button) {
    margin: 0;
    padding: 4px 8px;
    font-size: 12px;
    height: auto;
    line-height: 1.2;
    font-weight: 600;
  }

  :deep(.license-action-btn.el-button--primary.is-plain) {
    color: #007a6a !important;
    border-color: #7fdcc8 !important;
    background-color: #f0fdfa !important;
    --el-button-text-color: #007a6a;
    --el-button-border-color: #7fdcc8;
    --el-button-bg-color: #f0fdfa;
    --el-button-hover-text-color: #005f52;
    --el-button-hover-border-color: #00bfa5;
    --el-button-hover-bg-color: #ecfdf8;

    &:hover,
    &:focus {
      color: #005f52 !important;
      border-color: #00bfa5 !important;
      background-color: #ecfdf8 !important;
    }
  }

  :deep(.license-action-btn--danger.el-button--danger.is-plain) {
    color: #d92d20 !important;
    border-color: #fecdca !important;
    background-color: #fff5f5 !important;
    --el-button-text-color: #d92d20;
    --el-button-border-color: #fecdca;
    --el-button-bg-color: #fff5f5;
    --el-button-hover-text-color: #b42318;
    --el-button-hover-border-color: #fda29b;
    --el-button-hover-bg-color: #fef3f2;

    &:hover,
    &:focus {
      color: #b42318 !important;
      border-color: #fda29b !important;
      background-color: #fef3f2 !important;
    }
  }
}

.image-upload {
  display: inline-flex;

  :deep(.el-upload) {
    display: inline-flex;
  }
}

.field-block,
.date-field,
.status-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 38px;
}

.field-label {
  font-size: 11px;
  font-weight: 500;
  color: #667085;
  line-height: 1.3;
}

.date-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.readonly-value {
  min-height: 22px;
  line-height: 22px;
  font-size: 11px;
  color: #344054;
  padding: 0 4px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.el-input__wrapper) {
  padding: 0 6px;
  min-height: 24px;
}

:deep(.el-input__inner) {
  font-size: 12px;
}

:deep(.el-date-editor.el-input) {
  --el-date-editor-width: 100%;
}

:deep(.el-select .el-select__wrapper) {
  min-height: 24px;
  font-size: 11px;
  padding: 0 6px;
}

:deep(.el-tag) {
  font-size: 10px;
  height: 18px;
  padding: 0 4px;
}

.long-term-text {
  color: #667085;
  text-align: center;
}

.drag-handle {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.92);
  color: #98a2b3;
  cursor: grab;
  box-shadow: 0 0 0 1px #e4e7ed;

  &:hover {
    color: #00bfa5;
    box-shadow: 0 0 0 1px #b2f0e3;
  }

  &:active {
    cursor: grabbing;
  }
}

.preview-loading-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.35);
  color: #fff;
  font-size: 14px;
  pointer-events: none;
}
</style>
