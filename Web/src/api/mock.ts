import type { TableResponse } from './index'

export const AVAILABLE_TABLES = [
  'lineitem',
  'orders',
  'customer',
  'supplier',
  'nation',
  'employees'
] as const

export type TableName = typeof AVAILABLE_TABLES[number]

// 模拟的表数据
const mockData: Record<TableName, TableResponse> = {
  lineitem: {
    columns: ['l_orderkey', 'l_partkey', 'l_suppkey', 'l_linenumber', 'l_quantity', 'l_extendedprice'],
    data: [
      { l_orderkey: 1, l_partkey: 1, l_suppkey: 1, l_linenumber: 1, l_quantity: 10, l_extendedprice: 1000.00 },
      { l_orderkey: 2, l_partkey: 2, l_suppkey: 2, l_linenumber: 1, l_quantity: 20, l_extendedprice: 2000.00 },
    ]
  },
  orders: {
    columns: ['o_orderkey', 'o_custkey', 'o_orderstatus', 'o_totalprice', 'o_orderdate'],
    data: [
      { o_orderkey: 1, o_custkey: 1, o_orderstatus: 'F', o_totalprice: 1000.00, o_orderdate: '1996-01-01' },
      { o_orderkey: 2, o_custkey: 2, o_orderstatus: 'O', o_totalprice: 2000.00, o_orderdate: '1996-01-02' },
    ]
  },
  customer: {
    columns: ['c_custkey', 'c_name', 'c_address', 'c_nationkey', 'c_phone', 'c_acctbal'],
    data: [
      { c_custkey: 1, c_name: 'Customer#000000001', c_address: 'Address 1', c_nationkey: 1, c_phone: '1234567890', c_acctbal: 1000.00 },
      { c_custkey: 2, c_name: 'Customer#000000002', c_address: 'Address 2', c_nationkey: 2, c_phone: '2345678901', c_acctbal: 2000.00 },
    ]
  },
  supplier: {
    columns: ['s_suppkey', 's_name', 's_address', 's_nationkey', 's_phone', 's_acctbal'],
    data: [
      { s_suppkey: 1, s_name: 'Supplier#000000001', s_address: 'Address 1', s_nationkey: 1, s_phone: '1234567890', s_acctbal: 1000.00 },
      { s_suppkey: 2, s_name: 'Supplier#000000002', s_address: 'Address 2', s_nationkey: 2, s_phone: '2345678901', s_acctbal: 2000.00 },
    ]
  },
  nation: {
    columns: ['n_nationkey', 'n_name', 'n_regionkey'],
    data: [
      { n_nationkey: 1, n_name: 'CHINA', n_regionkey: 1 },
      { n_nationkey: 2, n_name: 'JAPAN', n_regionkey: 1 },
    ]
  },
  employees: {
    columns: ['e_id', 'e_name', 'e_position', 'e_department', 'e_salary', 'e_hire_date'],
    data: [
      { e_id: 1, e_name: 'John Smith', e_position: 'Manager', e_department: 'Sales', e_salary: 80000.00, e_hire_date: '2020-01-15' },
      { e_id: 2, e_name: 'Jane Doe', e_position: 'Developer', e_department: 'IT', e_salary: 75000.00, e_hire_date: '2021-03-20' },
    ]
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const mockApi = {
  getTableData: async (tableName: TableName): Promise<TableResponse> => {
    await delay(800)
    const tableData = mockData[tableName]
    if (!tableData) {
      throw new Error(`Table ${tableName} not found`)
    }
    return tableData
  }
}

export default mockApi 