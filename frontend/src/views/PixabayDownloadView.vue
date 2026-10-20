<script setup lang="ts">
import { ref } from 'vue'
import { Download, Info } from 'lucide-vue-next'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { supabase } from '../lib/supabase'

interface PixabayHit {
  largeImageURL: string
}

const keyword = ref('山水')
const picNum = ref(5)
const status = ref('')
const statusType = ref<'loading' | 'success' | 'error' | ''>('')

async function downloadPixabay() {
  status.value = '正在请求图片数据...'
  statusType.value = 'loading'

  try {
    const { data, error } = await supabase.functions.invoke('pixabay-proxy', {
      method: 'POST',
      body: { keyword: keyword.value, per_page: picNum.value },
    })

    if (error) throw new Error(error.message)

    const hits = (data?.hits ?? []) as PixabayHit[]
    if (hits.length === 0) {
      throw new Error('未找到相关图片，请尝试其他关键词')
    }

    status.value = `找到 ${hits.length} 张图片，开始下载...`
    const zip = new JSZip()

    await Promise.all(
      hits.slice(0, picNum.value).map(async (img: PixabayHit) => {
        const res = await fetch(img.largeImageURL)
        const blob = await res.blob()
        const ts = Date.now()
        const rand = Math.floor(Math.random() * 90000) + 10000
        zip.file(`${ts}_${rand}.jpg`, blob)
      }),
    )

    status.value = '正在生成压缩文件...'
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${keyword.value}_图片包.zip`)
    status.value = `下载完成！共下载 ${hits.length} 张图片`
    statusType.value = 'success'
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '下载失败'
    status.value = `错误: ${msg}`
    statusType.value = 'error'
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-5">
    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-6">
      <h3 class="mb-5 text-center text-lg font-semibold tracking-normal text-[var(--text)]">Pixabay 图片下载</h3>

      <div class="space-y-4">
        <div>
          <label class="mb-1 block text-sm text-[var(--text-secondary)]">关键词</label>
          <input
            v-model="keyword"
            class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
            placeholder="输入关键词（如：山水）"
          />
        </div>
        <div>
          <label class="mb-1 block text-sm text-[var(--text-secondary)]">下载数量</label>
          <input
            v-model.number="picNum"
            type="number"
            min="1"
            max="20"
            class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
          />
        </div>
        <button
          class="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
          @click="downloadPixabay"
        >
          <Download class="h-4 w-4" />
          下载图片
        </button>
      </div>

      <div
        v-if="status"
        class="mt-4 rounded-md px-4 py-2.5 text-sm"
        :class="{
          'bg-amber-500/10 text-amber-400': statusType === 'loading',
          'bg-emerald-500/10 text-emerald-400': statusType === 'success',
          'bg-red-500/10 text-red-400': statusType === 'error',
        }"
      >
        {{ status }}
      </div>

      <div class="mt-5 flex items-start gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-3 text-xs text-[var(--text-secondary)]">
        <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
        下载的图片将以"时间戳+5位随机数"格式命名，例如: 1691589963557_48261.jpg
      </div>
    </div>
  </div>
</template>
