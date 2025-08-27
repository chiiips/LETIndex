import axios from 'axios'
import mockApi from './mock'
import type { TableName } from './mock'

// 是否使用mock数据
const USE_MOCK = false

// 创建axios实例
const request = axios.create({
  baseURL: '/', // 使用相对路径，通过代理访问后端
  timeout: 60000 // 设置超时时间为1分钟
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    // 在这里可以添加token等认证信息
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    // 统一处理错误
    console.error('请求错误：', error)
    return Promise.reject(error)
  }
)

// API接口
export interface TableResponse {
  table: {
    col_name: string[]
    col_type: string[]
    rows: (string | number)[][]
  }
}

export interface DecryptResponse {
  value: number
}

export interface JoinQueryResponse {
  latency: number
  pgm_detail_rows: (number | string)[][]
  res_table: {
    col_type: string[]
    rows: (number[] | string)[][]
  }
  tree?: Record<string, any> // 可选的执行计划树
}

export const api = {
  // 获取指定表的数据
  getTableData: (tableName: TableName) => {
    if (USE_MOCK) {
      return mockApi.getTableData(tableName)
    }
    
    const formData = new FormData()
    formData.append('table', tableName)
    
    return request.post<TableResponse, TableResponse>('/api/table-data/', formData)
  },
  
  // 解密数据
  decryptValue: (encryptedValue: string, rowIndex: number) => {
    const formData = new FormData()
    formData.append('value', encryptedValue)
    formData.append('row_index', rowIndex.toString())
    
    return request.post<DecryptResponse, DecryptResponse>('/api/decrypt/', formData)
  },
  
  // 发送join查询
  submitJoinQuery: (index: number, nations: string[], query_type: string) => {
    if (query_type === 'Query 3') {
      const formData = new FormData()
      formData.append('index', index.toString())
      
      return request.post<JoinQueryResponse, JoinQueryResponse>('/api/Q3-join/', formData)
    } else {
    // } else if (query_type === 'Query 7') {
      const formData = new FormData()
      formData.append('index', index.toString())
      formData.append('nation', JSON.stringify(nations))
      
      return request.post<JoinQueryResponse, JoinQueryResponse>('/api/multi-table-join/', formData)
    }
  },
  
  // 发送single table join查询
  submitSingleJoinQuery: (index: number) => {
    console.log('Sending single join query with index:', index)
    const formData = new FormData()
    formData.append('index', index.toString())

    return request.post<JoinQueryResponse, JoinQueryResponse>('/api/single-table-join/', formData)
  }
}

export default api 