<template>
  <div class="multi-join-container">
    <div class="panels-container">
      <div class="left-panel">
        <div class="control-panel">
          <div class="description">
            Select a TPC-H query:
          </div>
          <el-select
            v-model="selectedQuery"
            placeholder="Select a query"
            class="query-select"
            @change="handleQueryChange"
          >
            <el-option
              v-for="query in AVAILABLE_QUERIES"
              :key="query"
              :label="query"
              :value="query"
            />
          </el-select>
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
        <ExecutionPlanTree v-if="executionTree" :tree="executionTree" />
      </div>
    </div>
    <div v-if="queryResult.length" class="result-container">
      <el-table 
        :data="queryResult" 
        style="width: 100%" 
        border
        height="250"
        :scroll-bar-always="true"
      >
        <el-table-column
          v-for="column in TABLE_COLUMNS"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :formatter="column.prop === 'revenue' ? formatRevenue : undefined"
        />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import hljs from 'highlight.js/lib/core'
import sql from 'highlight.js/lib/languages/sql'
import 'highlight.js/styles/atom-one-dark.css' // 更换为深色主题
import { ElMessage } from 'element-plus'
import api from '../api'
import ExecutionPlanTree from './ExecutionPlanTree.vue'

hljs.registerLanguage('sql', sql)

const AVAILABLE_QUERIES = ['Query 3', 'Query 7'] as const
type QueryType = typeof AVAILABLE_QUERIES[number]

const INDEX_TYPES = ['LETIndex', 'B+Tree Based Index'] as const
type IndexType = typeof INDEX_TYPES[number]

const selectedQuery = ref<QueryType>('Query 7')
const selectedIndexType = ref<IndexType>('LETIndex')
const queryLatency = ref<number | null>(null)
const query7Text = ref(`SELECT 
    supp_nation,
    cust_nation,
    l_year,
    SUM(volume) AS revenue
FROM (
    SELECT 
        n1.n_name AS supp_nation,
        n2.n_name AS cust_nation,
        EXTRACT(YEAR FROM l_shipdate) AS l_year,
        l_extendedprice*(1-l_discount) AS volume
    FROM supplier, lineitem, orders, customer, nation n1, nation n2
    WHERE s_suppkey = l_suppkey
        AND l_orderkey = o_orderkey
        AND o_custkey = c_custkey
        AND s_nationkey = n1.n_nationkey
        AND c_nationkey = n2.n_nationkey
        AND ((n1.n_name = 'CHINA' AND n2.n_name = 'UNITED STATES') 
             OR (n1.n_name = 'UNITED STATES' AND n2.n_name = 'CHINA'))
        AND l_shipdate BETWEEN DATE '1995-01-01' AND DATE '1996-12-31'
    GROUP BY supp_nation, cust_nation, l_year
    ORDER BY supp_nation, cust_nation, l_year;`)

const query3Text = ref(`SELECT
    l_orderkey,
    sum(l_extendedprice * (1 - l_discount)) as revenue,
    o_orderdate,
    o_shippriority
FROM
    customer,
    orders,
    lineitem
WHERE
    c_mktsegment = 'BUILDING'
    AND c_custkey = o_custkey
    AND l_orderkey = o_orderkey
    AND o_orderdate < '1995-12-31'
    AND l_shipdate > '1995-12-31'
GROUP BY
    l_orderkey,
    o_orderdate,
    o_shippriority
ORDER BY
    revenue desc,
    o_orderdate;`)

const currentQueryText = computed(() => {
  switch (selectedQuery.value) {
    case 'Query 3':
      return query3Text.value
    case 'Query 7':
      return query7Text.value
    default:
      return query7Text.value
  }
})

const highlightedQuery = computed(() => {
  return hljs.highlight(currentQueryText.value, { language: 'sql' }).value
})

const handleQueryChange = (query: QueryType) => {
  console.log('query changed:', query)
  queryResult.value = []
  executionTree.value = null
  queryLatency.value = null
}

const getIndexNumber = (indexType: IndexType): number => {
  switch (indexType) {
    case 'LETIndex':
      return 1
    case 'B+Tree Based Index':
      return 2
    default:
      return 1
  }
}

const extractNations = (sql: string): string[] => {
  const query7Match = sql.match(/n1\.n_name = '([^']+)' AND n2\.n_name = '([^']+)'/)
  if (query7Match) {
    return [query7Match[1], query7Match[2]]
  }
  

  if (sql.includes("c_mktsegment = 'BUILDING'")) {
    return ['BUILDING', 'SEGMENT']
  }
  
  return []
}

const TABLE_COLUMNS = computed(() => {
  switch (selectedQuery.value) {
    case 'Query 3':
      return [
        { prop: 'l_orderkey', label: 'Order Key' },
        { prop: 'revenue', label: 'Revenue' },
        { prop: 'o_orderdate', label: 'Order Date' },
        { prop: 'o_shippriority', label: 'Ship Priority' }
      ]
    case 'Query 7':
      return [
        { prop: 'supp_nation', label: 'Supplier Nation' },
        { prop: 'cust_nation', label: 'Customer Nation' },
        { prop: 'l_year', label: 'Year' },
        { prop: 'revenue', label: 'Revenue' }
      ]
    default:
      return [
        { prop: 'supp_nation', label: 'Supplier Nation' },
        { prop: 'cust_nation', label: 'Customer Nation' },
        { prop: 'l_year', label: 'Year' },
        { prop: 'revenue', label: 'Revenue' }
      ]
  }
})

const queryResult = ref<Record<string, any>[]>([])
const executionTree = ref<Record<string, any> | null>(null)

const handleSubmit = async () => {
  try {
    const index = getIndexNumber(selectedIndexType.value)
    const nations = extractNations(currentQueryText.value)
    
    if (nations.length !== 2) {
      ElMessage.error('Failed to extract nation information from query')
      return
    }
    console.log('Query parameters:', {
      index,
      nations
    })

    const response = await api.submitJoinQuery(index, nations, selectedQuery.value)
    console.log('Query parameters:', {
      index,
      nations
    })
    console.log('Response data:', response)
    queryLatency.value = response.latency
    
    if (selectedQuery.value === 'Query 3') {
      queryResult.value = response.res_table.rows.map(row => ({
        l_orderkey: row[0],
        revenue: row[1],
        o_orderdate: row[2],
        o_shippriority: row[3]
      }))
    } else if (selectedQuery.value === 'Query 7') {
      queryResult.value = response.res_table.rows.map(row => ({
        supp_nation: row[0],
        cust_nation: row[1],
        l_year: row[2],
        revenue: row[3]
      }))
    } else {
      queryResult.value = response.res_table.rows.map(row => ({
        supp_nation: row[0],
        cust_nation: row[1],
        l_year: row[2],
        revenue: row[3]
      }))
    }

    executionTree.value = response.tree || null
  } catch (error: any) {
    ElMessage.error('Query submission failed')
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
  }
}


const formatRevenue = (row: any) => {
  return Number(row.revenue).toFixed(2)
}
</script>

<style scoped>
.multi-join-container {
  height: 100%;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.panels-container {
  display: flex;
  gap: 20px;
  min-height: 0;
}

.left-panel {
  width: 40%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-panel {
  width: 60%;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color);
  padding: 12px;
  height: 400px;
  overflow: auto;
}

.control-panel {
  display: flex;
  gap: 20px;
  align-items: center;
}

.description {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  white-space: nowrap;
}

.query-select {
  width: 200px;
}

.index-select {
  width: 200px;
}

.code-container {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-bg-color);
  padding: 12px;
  max-width: 100%;
  overflow-x: auto;
}

.code-container pre {
  margin: 0;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
}

.button-container {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 20px;
}

.latency-display {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.result-container {
  width: 100%;
  max-height: 300px;
  overflow: hidden;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
}

/* 表格单元格统一使用等宽字体 */
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

/* 表格滚动条样式 */
:deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-track) {
  background: #f5f7fa;
  border-radius: 4px;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  background: #e4e7ed;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

:deep(.el-table__body-wrapper::-webkit-scrollbar-thumb:hover) {
  background: #c0c4cc;
}

/* 表格固定头部样式 */
:deep(.el-table__header-wrapper) {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #f5f7fa !important;
}

/* 表格容器样式 */
:deep(.el-table) {
  border-radius: 4px;
  overflow: hidden;
}

:deep(.el-table__body-wrapper) {
  max-height: 250px;
  overflow-y: auto;
}
</style> 