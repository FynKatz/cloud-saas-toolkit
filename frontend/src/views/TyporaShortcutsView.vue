<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy, Search, X } from 'lucide-vue-next'

interface ShortcutGroup {
  title: string
  items: { key: string; desc: string }[]
}

const groups: ShortcutGroup[] = [
  {
    title: '文件操作',
    items: [
      { key: '⌘ + N', desc: '新建文件' },
      { key: '⌘ + O', desc: '打开文件' },
      { key: '⌘ + S', desc: '保存文件' },
      { key: '⌘ + Shift + S', desc: '另存为' },
      { key: '⌘ + W', desc: '关闭当前文件' },
      { key: '⌘ + Q', desc: '退出 Typora' },
    ],
  },
  {
    title: '编辑操作',
    items: [
      { key: '⌘ + C', desc: '复制' },
      { key: '⌘ + V', desc: '粘贴' },
      { key: '⌘ + X', desc: '剪切' },
      { key: '⌘ + Z', desc: '撤销' },
      { key: '⌘ + Shift + Z', desc: '重做' },
      { key: '⌘ + A', desc: '全选' },
    ],
  },
  {
    title: '格式化',
    items: [
      { key: '⌘ + B', desc: '加粗' },
      { key: '⌘ + I', desc: '斜体' },
      { key: '⌘ + U', desc: '下划线' },
      { key: '⌘ + Shift + 5', desc: '删除线' },
      { key: '⌘ + K', desc: '插入超链接' },
      { key: '⌘ + H', desc: '高亮文本（需自定义配置）' },
      { key: '⌘ + `', desc: '插入代码块' },
      { key: '⌘ + Shift + `', desc: '插入行内代码' },
    ],
  },
  {
    title: '段落与标题',
    items: [
      { key: '⌘ + 1~6', desc: '一级到六级标题' },
      { key: '⌘ + 0', desc: '正文格式' },
      { key: '⌘ + T', desc: '插入表格' },
      { key: '⌘ + Shift + L', desc: '插入列表' },
      { key: '⌘ + Shift + Q', desc: '插入引用' },
      { key: '⌘ + Shift + G', desc: '折叠/展开段落' },
      { key: '⌘ + Shift + C', desc: '插入代码块（支持语言）' },
    ],
  },
  {
    title: '视图与导航',
    items: [
      { key: '⌘ + /', desc: '打开命令面板' },
      { key: '⌘ + Shift + L', desc: '切换侧边栏' },
      { key: '⌘ + Shift + F', desc: '全屏模式' },
      { key: '⌘ + Shift + M', desc: '预览模式' },
      { key: '⌘ + Shift + P', desc: '打印文档' },
    ],
  },
  {
    title: '表格操作',
    items: [
      { key: 'Tab', desc: '跳转到下一个单元格' },
      { key: 'Shift + Tab', desc: '跳转到上一个单元格' },
      { key: 'Enter', desc: '在当前行下方插入新行' },
      { key: '⌘ + Shift + Enter', desc: '在当前行上方插入新行' },
    ],
  },
  {
    title: '图像操作',
    items: [
      { key: '⌘ + Shift + I', desc: '插入图片' },
      { key: '⌘ + Alt + I', desc: '插入图片链接' },
    ],
  },
  {
    title: '数学公式',
    items: [
      { key: '⌘ + Shift + E', desc: '插入行内公式' },
      { key: '⌘ + Shift + M', desc: '插入块级公式' },
    ],
  },
  {
    title: '脚注',
    items: [{ key: '⌘ + Shift + F', desc: '插入脚注' }],
  },
  {
    title: '高级功能',
    items: [
      { key: '⌘ + Shift + O', desc: '导出为 PDF' },
      { key: '⌘ + F', desc: '查找' },
      { key: '⌘ + G', desc: '查找下一个' },
      { key: '⌘ + Shift + G', desc: '查找上一个' },
    ],
  },
]

const searchQuery = ref('')
const copiedKey = ref<string | null>(null)

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return groups
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          item.key.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.items.length > 0)
})

async function copyKey(key: string) {
  try {
    await navigator.clipboard.writeText(key)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null
    }, 2000)
  } catch {
    // clipboard unavailable
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
        <Search class="h-4 w-4" />
      </span>
      <input
        v-model="searchQuery"
        class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-10 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)] md:w-80"
        placeholder="搜索快捷键或描述..."
      />
      <button
        v-if="searchQuery"
        class="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="searchQuery = ''"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="group in filteredGroups"
        :key="group.title"
        class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4 transition-colors"
      >
        <h3 class="mb-3 text-sm font-semibold tracking-normal text-[var(--text)]">{{ group.title }}</h3>
        <ul class="space-y-2">
          <li
            v-for="item in group.items"
            :key="item.key"
            class="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition hover:bg-[var(--bg)]"
          >
            <div class="min-w-0 flex-1">
              <code class="rounded bg-[var(--bg)] px-1.5 py-0.5 text-xs text-[var(--accent)]">{{ item.key }}</code>
              <span class="ml-2 text-xs text-[var(--text-secondary)]">{{ item.desc }}</span>
            </div>
            <button
              class="grid h-7 w-7 shrink-0 place-items-center rounded text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
              title="复制快捷键"
              @click="copyKey(item.key)"
            >
              <Check v-if="copiedKey === item.key" class="h-3.5 w-3.5 text-emerald-400" />
              <Copy v-else class="h-3.5 w-3.5" />
            </button>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="filteredGroups.length === 0" class="flex flex-col items-center py-10 text-[var(--text-secondary)]">
      <Search class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">没有匹配的快捷键</p>
    </div>
  </div>
</template>
