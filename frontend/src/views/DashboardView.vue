<script setup lang="ts">
import { computed } from 'vue'
import { Container, Database, Film, Heading1, Images, ImageDown, LayoutDashboard, ListTodo, Puzzle, SquareParking, TextCursorInput, Zap, FileType2, Play, Wrench } from 'lucide-vue-next'

interface ToolItem {
  id: string
  name: string
  description: string
  icon: unknown
  category: string
  status: 'ready' | 'building'
  route: string
}

type Icon = typeof LayoutDashboard

const tools: ToolItem[] = [
  { id: 'parking', name: '停车管理', description: '车牌录入、费用计算、历史查询', icon: SquareParking, category: '常用工具', status: 'ready', route: '/parking' },
  { id: 'todo', name: 'Todo', description: '个人待办事项管理', icon: ListTodo, category: '常用工具', status: 'ready', route: '/todo' },
  { id: 'sql', name: 'SQL 速查', description: '常用 SQL 语法速查手册', icon: Database, category: '常用工具', status: 'ready', route: '/sql' },
  { id: 'redis', name: 'Redis 速查', description: 'Redis 命令速查手册', icon: Zap, category: '常用工具', status: 'ready', route: '/redis' },
  { id: 'docker', name: 'Docker/K8S', description: 'Docker & K8S 操作速查', icon: Container, category: '常用工具', status: 'ready', route: '/docker' },
  { id: 'movie', name: '电影搜索', description: '电影信息检索与管理', icon: Film, category: '扩展工具', status: 'ready', route: '/movie' },
  { id: 'collage', name: '图片拼接', description: '多图拼接生成工具', icon: Images, category: '扩展工具', status: 'building', route: '/collage' },
  { id: 'pixabay', name: 'Pixabay 下载', description: 'Pixabay 图片搜索下载', icon: ImageDown, category: '扩展工具', status: 'ready', route: '/pixabay' },
  { id: 'text-stats', name: '文本统计', description: '字数/频率/行数统计', icon: TextCursorInput, category: '扩展工具', status: 'ready', route: '/text-stats' },
  { id: 'typora', name: 'Typora 速查', description: 'Typora 快捷键与语法', icon: FileType2, category: '扩展工具', status: 'ready', route: '/typora' },
  { id: 'chrome-pack', name: 'Chrome 扩展', description: '打包发布 Chrome 扩展', icon: Puzzle, category: '扩展工具', status: 'ready', route: '/chrome-pack' },
  { id: 'markdown-heading', name: 'Markdown 标题', description: '标题层级调整与清空', icon: Heading1, category: '扩展工具', status: 'ready', route: '/markdown-heading' },
]

const quickStats = computed(() => ({
  total: tools.length,
  ready: tools.filter((t) => t.status === 'ready').length,
  building: tools.filter((t) => t.status === 'building').length,
  categories: new Set(tools.map((t) => t.category)).size,
}))
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="text-[11px] font-medium uppercase tracking-normal text-slate-500">工具总数</div>
        <div class="mt-2 text-2xl font-semibold tracking-normal text-slate-900">{{ quickStats.total }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="text-[11px] font-medium uppercase tracking-normal text-slate-500">已就绪</div>
        <div class="mt-2 text-2xl font-semibold tracking-normal text-emerald-700">{{ quickStats.ready }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="text-[11px] font-medium uppercase tracking-normal text-slate-500">构建中</div>
        <div class="mt-2 text-2xl font-semibold tracking-normal text-amber-700">{{ quickStats.building }}</div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <div class="text-[11px] font-medium uppercase tracking-normal text-slate-500">分类</div>
        <div class="mt-2 text-2xl font-semibold tracking-normal text-slate-900">{{ quickStats.categories }}</div>
      </div>
    </div>

    <div class="rounded-lg border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-5 py-3">
        <div class="text-sm font-semibold tracking-normal text-slate-900">所有工具</div>
      </div>
      <div class="divide-y divide-slate-100">
        <RouterLink
          v-for="tool in tools"
          :key="tool.id"
          :to="tool.route"
          class="flex items-center gap-4 px-5 py-3 transition hover:bg-slate-50"
        >
          <div class="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
            <component :is="tool.icon" class="h-[18px] w-[18px]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-medium tracking-normal text-slate-900">{{ tool.name }}</span>
              <span
                v-if="tool.status === 'building'"
                class="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-px text-[11px] font-medium text-amber-700"
              >
                <wrench class="h-3 w-3" /> 构建中
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-px text-[11px] font-medium text-emerald-700"
              >
                <play class="h-3 w-3" /> 就绪
              </span>
            </div>
            <div class="mt-1 truncate text-[12px] text-slate-500">{{ tool.description }}</div>
          </div>
          <div class="shrink-0 text-xs text-slate-400">{{ tool.category }}</div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
