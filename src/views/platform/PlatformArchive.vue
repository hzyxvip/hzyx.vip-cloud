<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { MIN_RECORD_RETENTION_DAYS } from '@/utils/complianceService'
import {
  DEFAULT_DOWNLOAD_WATERMARK_SETTINGS,
  loadDownloadWatermarkSettings,
  saveDownloadWatermarkSettings,
  type DownloadWatermarkSettings
} from '@/utils/downloadWatermark'

const tableData = ref([
  { id: 1, name: '采购验收记录', source: '采购验收单、随货同行单', days: MIN_RECORD_RETENTION_DAYS, retention: '不少于5年', status: '启用' },
  { id: 2, name: '入库台账', source: '采购入库单、库存台账', days: MIN_RECORD_RETENTION_DAYS, retention: '不少于5年', status: '启用' },
  { id: 3, name: '销售出库记录', source: '销售出库单、发货记录', days: MIN_RECORD_RETENTION_DAYS, retention: '不少于5年', status: '启用' },
  { id: 4, name: '资质归档', source: '企业资质、产品注册证', days: MIN_RECORD_RETENTION_DAYS, retention: '不少于5年', status: '启用' },
  { id: 5, name: '冷链记录', source: '温湿度自动采集记录', days: MIN_RECORD_RETENTION_DAYS, retention: '不少于5年', status: '启用' }
])

const watermarkSettings = ref<DownloadWatermarkSettings>(loadDownloadWatermarkSettings())

const saveWatermarkSettings = () => {
  saveDownloadWatermarkSettings(watermarkSettings.value)
  ElMessage.success('下载水印设定已保存')
}

const resetWatermarkSettings = () => {
  watermarkSettings.value = { ...DEFAULT_DOWNLOAD_WATERMARK_SETTINGS }
  saveDownloadWatermarkSettings(watermarkSettings.value)
  ElMessage.success('已恢复默认水印设定')
}
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>文档归档设定</h1>
      <el-button type="primary">新增归档规则</el-button>
    </div>

    <div class="watermark-card">
      <div class="card-title-row">
        <h2>平台资料下载水印</h2>
        <div class="card-actions">
          <el-button @click="resetWatermarkSettings">恢复默认</el-button>
          <el-button type="primary" @click="saveWatermarkSettings">保存设定</el-button>
        </div>
      </div>
      <p class="card-desc">开启后，平台内证照图片等资料下载时自动叠加水印，防止外传滥用。</p>
      <el-form label-width="120px" class="watermark-form">
        <el-form-item label="启用水印">
          <el-switch v-model="watermarkSettings.enabled" />
        </el-form-item>
        <el-form-item label="主水印文字">
          <el-input v-model="watermarkSettings.mainText" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="底部提示语">
          <el-input v-model="watermarkSettings.footerText" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="水印内容">
          <el-checkbox v-model="watermarkSettings.includeCompanyName">显示下载方企业名称</el-checkbox>
          <el-checkbox v-model="watermarkSettings.includeDownloader">显示下载人</el-checkbox>
          <el-checkbox v-model="watermarkSettings.includeDateTime">显示下载时间</el-checkbox>
        </el-form-item>
      </el-form>
    </div>
    <div class="search-form">
      <el-input placeholder="归档名称" style="width: 200px;" />
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="name" label="归档名称" />
        <el-table-column prop="source" label="归档来源" />
        <el-table-column prop="days" label="归档天数" />
        <el-table-column prop="retention" label="保留期限" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === '启用' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default>
            <el-button type="text" size="small">编辑</el-button>
            <el-button type="text" size="small">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-container { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; h1 { font-size: 22px; font-weight: 600; margin: 0; } }
.search-form { display: flex; gap: 12px; padding: 16px; background: #f5f7fa; border-radius: 8px; margin-bottom: 16px; }
.table-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

.watermark-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #344054;
  }
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: #667085;
}

.watermark-form {
  :deep(.el-checkbox) {
    margin-right: 18px;
  }
}
</style>