<template>
  <div class="inspector-container">
    <div class="control-panel">
      <div class="description">
        Select a table to view its data:
      </div>
      <el-select
        v-model="selectedTable"
        placeholder="Select a table"
        class="table-select"
        @change="handleTableChange"
      >
        <el-option
          v-for="table in AVAILABLE_TABLES"
          :key="table"
          :label="table"
          :value="table"
        />
      </el-select>
    </div>

    <div class="table-container">
      <el-table 
        v-if="tableData.length"
        :data="tableData" 
        style="width: 100%" 
        height="calc(100vh - 250px)" 
        border
        v-loading="loadingData"
        @header-click="handleHeaderClick"
      >
        <el-table-column
          v-for="column in columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :class-name="isEncryptedColumn(column.prop) ? 'encrypted-column' : ''"
          :formatter="formatColumnValue"
        >
          <template #header>
            {{ column.label }}
            <el-icon v-if="isEncryptedColumn(column.prop)" :class="{ 'is-decrypted': decryptedColumns.has(column.prop) }">
              <Lock v-if="!decryptedColumns.has(column.prop)" />
              <Unlock v-else />
            </el-icon>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, Unlock } from '@element-plus/icons-vue'
import api from '../api'
import { AVAILABLE_TABLES } from '../api/mock'
import type { TableName } from '../api/mock'
import { loadKey, decryptValue } from '../utils/crypto'

interface TableColumn {
  prop: string;
  label: string;
}

const loadingData = ref(false)

const selectedTable = ref<TableName | ''>('employees')
const tableData = ref<Record<string, any>[]>([])
const columns = ref<TableColumn[]>([])
const columnTypes = ref<string[]>([])
const decryptedColumns = ref<Set<string>>(new Set())
const decryptedValues = ref<Map<string, number>>(new Map())

const handleTableChange = async (table: TableName) => {
  loadingData.value = true
  tableData.value = []
  decryptedColumns.value.clear()
  decryptedValues.value.clear()
  
  try {
    const result = await api.getTableData(table)
    console.log('Response:', result)
    columns.value = result.table.col_name.map(col => ({
      prop: col,
      label: col
    }))
    columnTypes.value = result.table.col_type
    tableData.value = result.table.rows.map(row => {
      const obj: Record<string, string | number> = {}
      result.table.col_name.forEach((col, index) => {
        obj[col] = row[index]
      })
      return obj
    })
  } catch (error: any) {
    ElMessage.error('Failed to get table data')
    console.error('Error details:', error)
  } finally {
    loadingData.value = false
  }
}

const isEncryptedColumn = (columnName: string) => {
  const index = columns.value.findIndex(col => col.prop === columnName)
  return index !== -1 && columnTypes.value[index] === 'encrypted int'
}

const handleHeaderClick = async (column: any) => {
  if (!isEncryptedColumn(column.property)) return
  
  const columnName = column.property
  if (decryptedColumns.value.has(columnName)) {
    decryptedColumns.value.delete(columnName)
    decryptedValues.value.clear()
  } else {
    try {
      loadingData.value = true
      decryptedColumns.value.add(columnName)
      
      for (let i = 0; i < tableData.value.length; i++) {
        const row = tableData.value[i]
        const encryptedValue = row[columnName]
        try {
          const value = await decryptValue(encryptedValue as string, i)
          const key = `${columnName}-${i}`
          decryptedValues.value.set(key, value)
        } catch (error) {
          console.error(`Failed to decrypt row ${i}:`, error)
        }
      }
      
      ElMessage.success('Decryption successful')
    } catch (error) {
      ElMessage.error('Decryption failed')
      decryptedColumns.value.delete(columnName)
      console.error('Decryption error:', error)
    } finally {
      loadingData.value = false
    }
  }
}

const formatColumnValue = (row: any, column: { property: string }) => {
  const value = row[column.property]
  if (isEncryptedColumn(column.property) && decryptedColumns.value.has(column.property)) {
    const rowIndex = tableData.value.indexOf(row)
    const key = `${column.property}-${rowIndex}`
    return decryptedValues.value.get(key)?.toString() ?? value
  }
  return value
}

onMounted(async () => {
  try {
    await loadKey()
    await handleTableChange(selectedTable.value as TableName)
  } catch (error) {
    ElMessage.error('Failed to load key')
    console.error('Key loading error:', error)
  }
})
</script>

<style scoped>
.inspector-container {
  width: 100%;
  height: 100%;
  background-color: #ffffff;
  color: #2c3e50;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.description {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.control-panel {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  position: relative;
}

.control-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #409EFF, transparent);
  animation: glow 2s linear infinite;
}

.table-select {
  width: 200px;
}

.table-container {
  flex: 1;
  background-color: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.table-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #409EFF, transparent);
  animation: glow 2s linear infinite;
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

:deep(.el-table__header-cell) {
  cursor: default;
  padding: 4px 8px !important;
  line-height: 1.2 !important;
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

:deep(.el-select-dropdown) {
  background-color: #242424;
  border: 1px solid #2c2c2c;
}

:deep(.el-select-dropdown__item) {
  color: #e0e0e0;
}

:deep(.el-select-dropdown__item.hover),
:deep(.el-select-dropdown__item:hover) {
  background-color: #2c2c2c;
  color: #409EFF;
}

:deep(.el-table__row td) {
  padding: 4px 8px !important;
  line-height: 1.2 !important;
}
</style> 