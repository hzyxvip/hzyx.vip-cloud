<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(
  defineProps<{
    labels: string[]
    values: number[]
    title?: string
    color?: string
    height?: string
  }>(),
  {
    title: '',
    color: '#00bfa5',
    height: '320px'
  }
)

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const renderChart = () => {
  if (!chartRef.value) return
  if (!chart) chart = echarts.init(chartRef.value)
  chart.setOption({
    title: props.title ? { text: props.title, left: 'center', textStyle: { fontSize: 14, color: '#344054' } } : undefined,
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: number) => `¥${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
    },
    grid: { left: 48, right: 24, top: props.title ? 48 : 24, bottom: 48 },
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLabel: { rotate: props.labels.length > 6 ? 30 : 0, fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(1)}万` : String(v))
      }
    },
    series: [
      {
        type: 'bar',
        data: props.values,
        itemStyle: { color: props.color, borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 48
      }
    ]
  })
}

const handleResize = () => chart?.resize()

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

watch(() => [props.labels, props.values, props.title, props.color], renderChart, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="chartRef" class="report-bar-chart" :style="{ height }" />
</template>

<style scoped>
.report-bar-chart {
  width: 100%;
  min-height: 240px;
}
</style>
