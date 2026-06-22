<script setup lang="ts">
import { ref } from 'vue'

const tableData = ref([
  { id: 1, chinese: '医疗器械', pinyin: 'yiliao qixie', abbr: 'YLQX', status: '启用' },
  { id: 2, chinese: '一次性口罩', pinyin: 'yicixing kouzhao', abbr: 'YXKZ', status: '启用' },
  { id: 3, chinese: '防护服', pinyin: 'fanghufu', abbr: 'FHF', status: '启用' },
  { id: 4, chinese: '北京协和医院', pinyin: 'beijing xiehe yiyuan', abbr: 'BJXHY', status: '启用' }
])
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <h1>汉字拼音缩写补充资料</h1>
      <el-button type="primary">新增缩写</el-button>
    </div>
    <div class="search-form">
      <el-input placeholder="汉字/拼音/缩写" style="width: 200px;" />
      <el-button type="primary">查询</el-button>
    </div>
    <div class="table-card">
      <el-table :data="tableData" border>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="chinese" label="汉字" />
        <el-table-column prop="pinyin" label="拼音" />
        <el-table-column prop="abbr" label="缩写" />
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
</style>