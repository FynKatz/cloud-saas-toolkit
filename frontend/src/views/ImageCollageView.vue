<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  Download,
  Image,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-vue-next'

interface ImageItem {
  src: string
  naturalWidth: number
  naturalHeight: number
  width: number
  height: number
  container: HTMLElement | null
}

const images = ref<ImageItem[]>([])
const originalImages = ref<ImageItem[]>([])
const selectedIndex = ref<number | null>(null)
const direction = ref<'vertical' | 'horizontal'>('vertical')
const statusMsg = ref('请选择图片文件...')
const errorMsg = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

let currentResize: {
  container: HTMLElement
  imgData: ImageItem
  startX: number
  startY: number
  startW: number
  startH: number
} | null = null

function loadImage(file: File): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        resolve({
          src: e.target?.result as string,
          naturalWidth: img.width,
          naturalHeight: img.height,
          width: img.width,
          height: img.height,
          container: null,
        })
      }
      img.onerror = () => reject(new Error(`图片加载失败: ${file.name}`))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error(`读取失败: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

async function handleFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files ?? [])
  if (!files.length) return
  statusMsg.value = '正在加载图片...'
  errorMsg.value = ''
  try {
    const loaded = await Promise.all(
      files.filter((f) => f.type.startsWith('image/')).map(loadImage),
    )
    originalImages.value = loaded.map((img) => ({ ...img, container: null }))
    images.value = loaded.map((img) => ({ ...img, container: null }))
    selectedIndex.value = null
    statusMsg.value = `已加载 ${images.value.length} 张图片`
  } catch (err) {
    errorMsg.value = '图片加载失败，请重试'
    statusMsg.value = '加载失败'
  }
}

function selectImage(index: number) {
  selectedIndex.value = index
}

function moveUp(index: number) {
  if (index === 0) return
  const item = images.value.splice(index, 1)[0]
  images.value.splice(index - 1, 0, item)
  selectedIndex.value = index - 1
}

function moveDown(index: number) {
  if (index === images.value.length - 1) return
  const item = images.value.splice(index, 1)[0]
  images.value.splice(index + 1, 0, item)
  selectedIndex.value = index + 1
}

function removeSelected() {
  if (selectedIndex.value === null) return
  images.value.splice(selectedIndex.value, 1)
  selectedIndex.value = null
  statusMsg.value = `剩余 ${images.value.length} 张图片`
}

function clearAll() {
  if (!confirm('确定要清空所有图片吗？')) return
  images.value = []
  originalImages.value = []
  selectedIndex.value = null
  if (fileInput.value) fileInput.value.value = ''
  statusMsg.value = '请上传图片文件'
  errorMsg.value = ''
}

function resetAll() {
  if (originalImages.value.length === 0) return
  images.value = originalImages.value.map((img) => ({ ...img, container: null }))
  selectedIndex.value = null
  statusMsg.value = '已恢复到原始状态'
}

function startResize(e: MouseEvent, imgData: ImageItem, el: HTMLElement) {
  e.stopPropagation()
  const rect = el.getBoundingClientRect()
  currentResize = {
    container: el,
    imgData,
    startX: e.clientX,
    startY: e.clientY,
    startW: rect.width,
    startH: rect.height,
  }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

function onResizeMove(e: MouseEvent) {
  if (!currentResize) return
  const dx = e.clientX - currentResize.startX
  const dy = e.clientY - currentResize.startY
  const w = Math.max(50, currentResize.startW + dx)
  const h = Math.max(50, currentResize.startH + dy)
  currentResize.container.style.width = `${w}px`
  currentResize.container.style.height = `${h}px`
  currentResize.imgData.width = w
  currentResize.imgData.height = h
  const img = currentResize.container.querySelector('img')
  if (img) {
    img.style.width = `${w}px`
    img.style.height = `${h}px`
  }
}

function onResizeEnd() {
  currentResize = null
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
}

function handleDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault()
  const dragIndex = parseInt(e.dataTransfer?.getData('text/plain') ?? '')
  if (isNaN(dragIndex) || dragIndex === targetIndex) return
  const item = images.value.splice(dragIndex, 1)[0]
  images.value.splice(targetIndex, 0, item)
}

function handleDragStart(e: DragEvent, index: number) {
  e.dataTransfer?.setData('text/plain', String(index))
}

async function exportImage() {
  if (images.value.length === 0) return
  statusMsg.value = '正在合成图片...'
  await nextTick()

  try {
    const loaded = await Promise.all(
      images.value.map(
        (imgData) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = imgData.src
          }),
      ),
    )

    let canvasW: number, canvasH: number
    if (direction.value === 'vertical') {
      canvasW = Math.max(...images.value.map((i) => i.width))
      canvasH = images.value.reduce((s, i) => s + i.height, 0)
    } else {
      canvasH = Math.max(...images.value.map((i) => i.height))
      canvasW = images.value.reduce((s, i) => s + i.width, 0)
    }

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!

    let pos = 0
    loaded.forEach((img, i) => {
      const d = images.value[i]
      if (direction.value === 'vertical') {
        ctx.drawImage(img, 0, pos, d.width, d.height)
        pos += d.height
      } else {
        ctx.drawImage(img, pos, 0, d.width, d.height)
        pos += d.width
      }
    })

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `拼接结果_${new Date().toISOString().slice(0, 10)}_${direction.value}.png`
      a.click()
      URL.revokeObjectURL(url)
      statusMsg.value = '导出完成'
    }, 'image/png')
  } catch {
    errorMsg.value = '导出失败，请重试'
    statusMsg.value = '导出失败'
  }
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <label
        class="flex cursor-pointer items-center gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
      >
        <Upload class="h-4 w-4" />
        选择图片
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          @change="handleFiles"
        />
      </label>

      <div class="flex items-center gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm">
        <span class="text-[var(--text-secondary)]">方向</span>
        <select
          v-model="direction"
          class="bg-transparent text-[var(--text)] outline-none"
        >
          <option value="vertical">垂直</option>
          <option value="horizontal">水平</option>
        </select>
      </div>

      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        :class="{ 'opacity-50 pointer-events-none': images.length === 0 }"
        @click="exportImage"
      >
        <Download class="h-4 w-4" />
        导出长图
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="removeSelected"
      >
        <Trash2 class="h-4 w-4" />
        删除选中
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="resetAll"
      >
        <RotateCcw class="h-4 w-4" />
        撤销更改
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="clearAll"
      >
        <Trash2 class="h-4 w-4" />
        清空
      </button>
    </div>

    <div v-if="errorMsg" class="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
      {{ errorMsg }}
    </div>

    <div v-if="images.length > 0" class="grid gap-4 lg:grid-cols-[80px_1fr]">
      <div class="space-y-2 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-2">
        <div
          v-for="(imgData, index) in images"
          :key="index"
          class="relative cursor-pointer rounded border border-[var(--surface-border)] p-0.5 transition hover:border-[var(--accent)]"
          :class="{ 'border-[var(--accent)]!': selectedIndex === index }"
          @click="selectImage(index)"
        >
          <img :src="imgData.src" class="w-full rounded" />
          <div class="absolute right-0 top-1/2 flex -translate-y-1/2 translate-x-full flex-col gap-0.5">
            <button
              class="grid h-5 w-5 place-items-center rounded bg-[var(--accent)] text-[10px] text-white hover:opacity-80"
              @click.stop="moveUp(index)"
            >
              <ArrowUp class="h-3 w-3" />
            </button>
            <button
              class="grid h-5 w-5 place-items-center rounded bg-[var(--accent)] text-[10px] text-white hover:opacity-80"
              @click.stop="moveDown(index)"
            >
              <ArrowDown class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <div
        class="flex min-h-[200px] flex-col gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4"
        :class="direction === 'vertical' ? '' : 'flex-row items-start'"
        @dragover.prevent
        @drop.prevent
      >
        <div
          v-for="(imgData, index) in images"
          :key="index"
          class="relative shrink-0 rounded border-2 transition"
          :class="
            selectedIndex === index
              ? 'border-[var(--accent)]'
              : 'border-transparent'
          "
          :style="{ width: imgData.width + 'px', height: imgData.height + 'px' }"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @drop="handleDrop($event, index)"
          @click="selectImage(index)"
        >
          <img
            :src="imgData.src"
            class="pointer-events-none block h-full w-full object-cover"
            draggable="false"
          />
          <div
            class="absolute bottom-0 right-0 h-[15px] w-[15px] cursor-nwse-resize bg-[var(--accent)]"
            @mousedown="startResize($event, imgData, ($event.target as HTMLElement).closest('.relative') as HTMLElement)"
          />
        </div>
        <div
          v-if="images.length === 0"
          class="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]"
        >
          <Image class="mb-2 h-10 w-10 opacity-30" />
          <p class="text-sm">选择图片文件开始</p>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--surface)] py-16">
      <Image class="mb-2 h-10 w-10 text-[var(--text-secondary)] opacity-30" />
      <p class="text-sm text-[var(--text-secondary)]">选择图片文件开始拼接</p>
    </div>

    <div class="text-xs text-[var(--text-secondary)]">{{ statusMsg }}</div>
  </div>
</template>
