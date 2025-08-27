<template>
  <div class="tree-container" ref="treeContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

interface TreeNode {
  children?: Record<string, TreeNode>
  time?: number
}

interface Props {
  tree: Record<string, TreeNode>
}

const props = defineProps<Props>()
const treeContainer = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 将树形数据转换为echarts需要的格式
const convertTreeData = (node: TreeNode, name: string): any => {
  console.log('Converting node:', { name, node })

  const result: any = {
    name: node.time ? `${name}\n${(node.time / 1000000).toFixed(2)}ms` : name,
    value: '',
    children: []
  }

  if (node.children) {
    // 直接遍历children对象的所有键
    for (const [childName, childNode] of Object.entries(node.children)) {
      console.log('Processing child:', { childName, childNode })
      result.children.push(convertTreeData(childNode, childName))
    }
  }

  console.log('Converted node result:', {
    name: result.name,
    value: result.value,
    childrenCount: result.children.length,
    children: result.children
  })

  return result
}

// 初始化图表
const initChart = () => {
  if (!treeContainer.value) return

  // 如果已经存在图表实例，先销毁它
  if (chart) {
    chart.dispose()
  }

  console.log('Original tree data:', props.tree)
  const rootName = Object.keys(props.tree)[0]
  const rootNode = props.tree[rootName]
  console.log('Root name:', rootName)
  console.log('Root node:', rootNode)

  chart = echarts.init(treeContainer.value)
  const option = {
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      backgroundColor: '#242424',
      borderColor: '#2c2c2c',
      textStyle: {
        color: '#8b9cb3'
      }
    },
    series: [
      {
        type: 'tree',
        orient: 'TB',
        initialTreeDepth: -1,
        data: [convertTreeData(rootNode, rootName)],
        top: '5%',
        left: '5%',
        bottom: '5%',
        right: '5%',
        symbolSize: 7,
        nodeGap: 12,
        layerPadding: 30,
        layout: 'orthogonal',
        roam: true,
        zoom: 1.2,
        center: ['50%', '50%'],
        itemStyle: {
          color: '#242424',
          borderColor: '#409EFF',
          borderWidth: 1
        },
        label: {
          position: 'right',
          verticalAlign: 'middle',
          align: 'left',
          fontSize: 12,
          distance: 8,
          color: '#8b9cb3',
          formatter: (params: any) => {
            const [name, time] = params.name.split('\n')
            if (time) {
              return `{bold|${name}}\n{time|${time}}`
            }
            return `{bold|${name}}`
          },
          rich: {
            bold: {
              fontWeight: 'bold',
              color: '#8b9cb3'
            },
            time: {
              color: '#8b9cb3'
            }
          }
        },
        leaves: {
          label: {
            position: 'right',
            verticalAlign: 'middle',
            align: 'left'
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
        lineStyle: {
          width: 2,
          color: '#409EFF'
        }
      }
    ]
  }

  chart.setOption(option)
}

// 监听窗口大小变化
const handleResize = () => {
  chart?.resize()
}

// 监听树数据变化
watch(() => props.tree, () => {
  if (props.tree) {
    initChart()
  }
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.tree-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
}
</style> 