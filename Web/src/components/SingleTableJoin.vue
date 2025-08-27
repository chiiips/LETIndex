<template>
  <div class="single-join-container">
    <div class="panels-container">
      <div class="left-panel">
        <div class="control-panel">
          <div class="description">
            Select index type:
          </div>
          <el-select
            v-model="selectedIndexType"
            placeholder="Select index type"
            class="index-select"
          >
            <el-option
              v-for="type in INDEX_TYPES"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </div>
        <div class="code-container">
          <pre><code class="sql" v-html="highlightedQuery"></code></pre>
        </div>
        <div class="button-container">
          <div v-if="queryLatency !== null" class="latency-display">
            Time of execution: {{ queryLatency.toFixed(2) }}ms
          </div>
          <el-button type="primary" @click="handleSubmit">Submit Query</el-button>
        </div>
      </div>
      <div class="right-panel">
        <div class="waterfall-container" ref="chartContainer"></div>
      </div>
    </div>
    <div v-if="queryResult.length" class="result-container">
      <el-table 
        :data="queryResult" 
        style="width: 100%" 
        border
        @header-click="handleHeaderClick"
      >
        <el-table-column
          v-for="column in TABLE_COLUMNS"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :class-name="column.className"
        >
          <template #header>
            {{ column.label }}
            <el-icon v-if="column.prop === 'employee_id'" :class="{ 'is-decrypted': isDecrypted }">
              <Lock v-if="!isDecrypted" />
              <Unlock v-else />
            </el-icon>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'
import 'highlight.js/styles/atom-one-dark.css'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { Lock, Unlock } from '@element-plus/icons-vue'
import api from '../api'
import { decryptValue, loadKey } from '../utils/crypto'

hljs.registerLanguage('sql', sql)

const INDEX_TYPES = ['LETIndex', 'B+Tree Based Index', 'No Index'] as const
type IndexType = typeof INDEX_TYPES[number]

const selectedIndexType = ref<IndexType>('LETIndex')
const queryLatency = ref<number | null>(null)
const queryText = ref(`SELECT 
  emp.id AS employee,
  emp.name AS employee_name,
  mgr.name AS superior_name
FROM 
  employees emp
JOIN 
  employees mgr ON emp.manager_id = mgr.id;`)

const highlightedQuery = computed(() => {
  return hljs.highlight(queryText.value, { language: 'sql' }).value
})

const getIndexNumber = (indexType: IndexType): number => {
  switch (indexType) {
    case 'No Index':
      return 0
    case 'LETIndex':
      return 1
    case 'B+Tree Based Index':
      return 2
    default:
      return 0
  }
}

const TABLE_COLUMNS = [
  {
    prop: 'employee_id',
    label: 'Employee ID',
    className: 'encrypted-column',
    headerClickable: true
  },
  {
    prop: 'employee_name',
    label: 'Employee Name'
  },
  {
    prop: 'manager_name',
    label: 'Manager Name'
  }
]

const queryResult = ref<Record<string, any>[]>([])
const isDecrypted = ref(false)

const convertToTree = async (rows: (number | string)[][]) => {
  const limitedRows = rows.slice(0, 3)
  const children = await Promise.all(limitedRows.map(async (row, index) => {
    const decryptedValue = await decryptValue(row[4] as string, index)
    return {
      name: `Row ${index}`,
      value: row,
      symbolSize: [60, 25],
      itemStyle: { borderColor: '#409EFF' },
      children: [{
        name: `Encrypted mng ID: ${(row[4] as string).slice(0, 6)}...`,
        value: row[4],
        symbolSize: [100, 30],
        itemStyle: { borderColor: '#409EFF' },
        children: [{
          name: `Decrypted mng ID: ${decryptedValue}`,
          symbolSize: [100, 30],
          itemStyle: { 
            borderColor: '#E6A23C',
            color: '#FFF7E6'
          },
          children: [{
            name: `LETIndex Predicted Range: [${row[0]}, ${row[1]})`,
            symbolSize: [120, 30],
            itemStyle: { 
              borderColor: '#E6A23C',
              color: '#FFF7E6'
            },
            children: [{
              name: `Precise Position: ${row[2]}`,
              symbolSize: [80, 30],
              itemStyle: { 
                borderColor: '#E6A23C',
                color: '#FFF7E6'
              },
              children: [{
                name: `RID: ${row[3]}`,
                symbolSize: [80, 30],
                itemStyle: { borderColor: '#409EFF' },
                children: [{
                  name: `Manager: ${row[5]}`,
                  symbolSize: [100, 30],
                  itemStyle: { borderColor: '#409EFF' }
                }]
              }]
            }]
          }]
        }]
      }]
    }
  }))

  return {
    name: 'Scan',
    symbolSize: [40, 20],
    itemStyle: { borderColor: '#409EFF' },
    children
  }
}

const handleHeaderClick = async (column: any) => {
  if (column.property === 'employee_id') {
    isDecrypted.value = !isDecrypted.value
    if (isDecrypted.value) {
      queryResult.value = await Promise.all(queryResult.value.map(async (row, index) => ({
        ...row,
        employee_id: await decryptValue(row.employee_id as string, index)
      })))
    } else {
      queryResult.value = queryResult.value.map(row => ({
        ...row,
        employee_id: row.originalEmployeeId
      }))
    }
  }
}


const handleSubmit = async () => {
  try {
    console.log('Selected index type:', selectedIndexType.value)
    const index = getIndexNumber(selectedIndexType.value)
    console.log('Index:', index)
    const response = await api.submitSingleJoinQuery(index)
    console.log('Query parameters:', {
      index
    })
    console.log('Response data:', response)
    queryLatency.value = response.latency
    
    queryResult.value = response.res_table.rows.map((row: (string | number[])[]) => ({
      employee_id: Array.isArray(row[0]) ? 0 : row[0],
      originalEmployeeId: row[0],
      employee_name: row[1],
      manager_name: row[2]
    }))

    if (response.pgm_detail_rows) {
      const treeData = await convertToTree(response.pgm_detail_rows)
      initChart(treeData)
    }

    ElMessage.success('Query submitted successfully')
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    })
    
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred'
    ElMessage.error(`Query submission failed: ${errorMessage}`)
  }
}

const formatRevenue = (row: any) => {
  return Number(row.revenue).toFixed(2)
}

let chart: echarts.ECharts | null = null
const chartContainer = ref<HTMLElement | null>(null)

const initChart = (treeData: any) => {
  if (!chartContainer.value) return
  
  chart = echarts.init(chartContainer.value)
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.data.value) {
          if (typeof params.data.value === 'string') {
            return `Encrypted Manager ID: ${params.data.value}`
          } else {
            const row = params.data.value
            return `Node ID: ${row[0]}<br/>
                   Parent ID: ${row[1]}<br/>
                   Reference ID: ${row[2]}<br/>
                   Cost: ${row[3]}<br/>
                   Encrypted Value: ${row[4]}<br/>
                   Name: ${row[5]}`
          }
        }
        return params.name
      }
    },
    series: [{
      type: 'tree',
      data: [treeData],
      top: '5%',
      left: '5%',
      bottom: '5%',
      right: '5%',
      symbol: 'rect',
      symbolSize: [100, 30],
      orient: 'horizontal',
      layout: 'orthogonal',
      itemStyle: {
        color: '#F5F7FA',
        borderColor: '#409EFF',
        borderWidth: 1
      },
      label: {
        position: 'inside',
        formatter: (params: any) => {
          const name = params.name
          const value = name.split(': ')[1] || ''
          const label = name.split(': ')[0] || name
          if (value) {
            return `{header|${label}}\n{body|${value}}`
          } else {
            return `{label|${label}}`
          }
        },
        rich: {
          header: {
            fontSize: 10,
            color: '#606266',
            backgroundColor: '#E4E7ED',
            padding: [1, 3, 1, 3],
            borderRadius: [2, 2, 0, 0]
          },
          body: {
            fontSize: 11,
            color: '#303133',
            fontWeight: 'bold',
            backgroundColor: '#F5F7FA',
            padding: [1, 3, 1, 3],
            borderRadius: [0, 0, 2, 2]
          },
          label: {
            fontSize: 11,
            color: '#303133',
            padding: [1, 3]
          }
        }
      },
      leaves: {
        label: {
          position: 'inside'
        }
      },
      emphasis: {
        focus: 'descendant',
        itemStyle: {
          borderColor: '#67C23A',
          borderWidth: 1.5
        }
      },
      expandAndCollapse: true,
      animationDuration: 550,
      animationDurationUpdate: 750,
      roam: true,
      zoom: 1.2,
      initialTreeDepth: -1
    }]
  }
  
  chart.setOption(option)
}

const handleResize = () => {
  chart?.resize()
}

const loadDecryptionKey = async () => {
  try {
    await loadKey()
    ElMessage.success('Key loaded successfully')
  } catch (error) {
    console.error('Key loading failed:', error)
    ElMessage.error('Key loading failed, decryption function will be disabled')
  }
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await loadDecryptionKey()
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.single-join-container {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  color: #2c3e50;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panels-container {
  display: flex;
  gap: 20px;
  height: calc(100vh - 420px);
  margin-bottom: 20px;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.right-panel {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.control-panel {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.description {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.index-select {
  width: 200px;
}

.code-container {
  flex: 1;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  overflow: auto;
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #2c3e50;
}

.code-container pre {
  margin: 0;
  white-space: pre-wrap;
}

.code-container code {
  font-size: 11px;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  gap: 20px;
}

.latency-display {
  color: #606266;
  font-size: 14px;
}

.result-container {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: auto;
  height: calc(100vh - 520px);
}

.waterfall-container {
  width: 100%;
  height: 100%;
}

:deep(.encrypted-column),
:deep(.encrypted-column .cell),
:deep(.el-table .encrypted-column .cell) {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Courier New', monospace !important;
  font-feature-settings: "liga" 0 !important;
  font-variant-ligatures: none !important;
  font-size: 13px !important;
  color: #2c3e50 !important;
}


.encrypted-column :deep(.cell) {
  display: none;
}

:deep(.el-table__header-cell) {
  cursor: default;
}

.el-icon {
  margin-left: 4px;
  font-size: 14px;
  vertical-align: middle;
  cursor: pointer;
}

.is-decrypted {
  color: #67C23A;
}


.right-panel::before,
.code-container::before,
.result-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #409EFF, transparent);
  animation: glow 2s linear infinite;
}

@keyframes glow {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}

:deep(.el-select) {
  --el-select-input-focus-border-color: #409EFF;
  --el-select-border-color-hover: #409EFF;
}

:deep(.el-button--primary) {
  --el-button-bg-color: #409EFF;
  --el-button-border-color: #409EFF;
  --el-button-hover-bg-color: #66b1ff;
  --el-button-hover-border-color: #66b1ff;
  --el-button-active-bg-color: #3a8ee6;
  --el-button-active-border-color: #3a8ee6;
}

:deep(.el-table) {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Courier New', monospace !important;
  font-feature-settings: "liga" 0 !important;
  font-variant-ligatures: none !important;
  font-size: 13px !important;
  letter-spacing: 0 !important;
  background-color: #ffffff !important;
}

:deep(.el-table .cell) {
  padding: 4px 8px !important;
  white-space: pre !important;
  line-height: 1.2 !important;
  color: #2c3e50 !important;
}

:deep(.el-table__header-cell) {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, 'Courier New', monospace !important;
  font-size: 13px !important;
  letter-spacing: 0 !important;
  color: #606266 !important;
  background-color: #f5f7fa !important;
  padding: 4px 8px !important;
  line-height: 1.2 !important;
}

:deep(.el-table__row) {
  background-color: #ffffff !important;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

:deep(.el-table__row td) {
  padding: 4px 8px !important;
  line-height: 1.2 !important;
  color: #2c3e50 !important;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: #f5f7fa;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: #e4e7ed;
  border-radius: 4px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
  background: #c0c4cc;
}
</style> 