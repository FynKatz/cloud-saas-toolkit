<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle, Info } from 'lucide-vue-next'

const activeTab = ref<'crx' | 'zip'>('crx')
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
      <h2 class="text-lg font-semibold tracking-normal text-[var(--text)]">Chrome 扩展打包指南</h2>
      <p class="mt-1 text-sm text-[var(--text-secondary)]">如何将源码打包成 CRX 文件或 ZIP 压缩包</p>
    </div>

    <div class="space-y-4">
      <!-- Step 1 -->
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <h3 class="flex items-center gap-2 text-sm font-semibold tracking-normal text-[var(--text)]">
          <span class="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs text-white">1</span>
          准备工作
        </h3>
        <p class="mt-2 text-sm text-[var(--text-secondary)]">确保您的 Chrome 扩展项目包含以下必要文件：</p>
        <pre class="mt-3 rounded-md bg-[var(--bg)] p-3 text-xs text-[var(--text-secondary)]">📁 github/workflows
📁 docs
📁 src
📁 store
📁 test
📄 .editorconfig
📄 .gitignore
📄 manifest.json
📄 package.json</pre>
      </div>

      <!-- Step 2 -->
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <h3 class="flex items-center gap-2 text-sm font-semibold tracking-normal text-[var(--text)]">
          <span class="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs text-white">2</span>
          构建项目（如果需要）
        </h3>
        <pre class="mt-2 rounded-md bg-[var(--bg)] p-3 text-xs text-[var(--text-secondary)]">npm install
npm run build</pre>
        <div class="mt-2 flex items-start gap-2 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          检查 package.json 中的 scripts 部分，查看可用的构建命令。
        </div>
      </div>

      <!-- Step 3 -->
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <h3 class="flex items-center gap-2 text-sm font-semibold tracking-normal text-[var(--text)]">
          <span class="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs text-white">3</span>
          打包扩展
        </h3>

        <div class="mt-3 flex rounded-md border border-[var(--surface-border)] bg-[var(--bg)] p-0.5">
          <button
            class="flex-1 rounded px-3 py-1.5 text-sm transition"
            :class="activeTab === 'crx' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'"
            @click="activeTab = 'crx'"
          >打包为 CRX</button>
          <button
            class="flex-1 rounded px-3 py-1.5 text-sm transition"
            :class="activeTab === 'zip' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'"
            @click="activeTab = 'zip'"
          >打包为 ZIP</button>
        </div>

        <div v-if="activeTab === 'crx'" class="mt-3 space-y-3">
          <ol class="list-inside list-decimal space-y-2 text-sm text-[var(--text-secondary)]">
            <li>打开 Chrome 浏览器，地址栏输入 <code class="rounded bg-[var(--bg)] px-1 text-[var(--accent)]">chrome://extensions</code></li>
            <li>开启右上角的"开发者模式"</li>
            <li>点击"打包扩展程序"按钮</li>
            <li>选择扩展的根目录（包含 manifest.json 的文件夹）</li>
            <li>如果需要，选择私钥文件（如果之前打包过）</li>
            <li>点击"打包扩展程序"</li>
            <li>Chrome 会生成 .crx 文件和 .pem 私钥文件</li>
          </ol>
          <div class="flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" />
            保存好 .pem 私钥文件！以后更新扩展时需要相同的私钥。
          </div>
        </div>

        <div v-if="activeTab === 'zip'" class="mt-3 space-y-3">
          <ol class="list-inside list-decimal space-y-2 text-sm text-[var(--text-secondary)]">
            <li>确保扩展文件已准备好（构建完成后）</li>
            <li>选择所有需要的文件（排除 .git、node_modules 等）</li>
            <li>右键 → 压缩（Mac）或添加到压缩文件（Windows）</li>
            <li>设置压缩格式为 ZIP</li>
          </ol>
          <pre class="rounded-md bg-[var(--bg)] p-3 text-xs text-[var(--text-secondary)]"># 或使用命令行
zip -r my-extension.zip . -x ".*" "node_modules/*" "docs/*" "test/*"</pre>
        </div>
      </div>

      <!-- Step 4 -->
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <h3 class="flex items-center gap-2 text-sm font-semibold tracking-normal text-[var(--text)]">
          <span class="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-xs text-white">4</span>
          加载扩展到 Chrome
        </h3>
        <ol class="mt-2 list-inside list-decimal space-y-2 text-sm text-[var(--text-secondary)]">
          <li>打开 <code class="rounded bg-[var(--bg)] px-1 text-[var(--accent)]">chrome://extensions</code></li>
          <li>开启"开发者模式"</li>
          <li>点击"加载已解压的扩展程序"</li>
          <li>选择包含 manifest.json 的文件夹</li>
        </ol>
        <div class="mt-3 flex items-start gap-2 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertTriangle class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          从 Chrome 73 开始，非 Web Store 的扩展安装受到限制，通常只能通过开发者模式加载。
        </div>
      </div>
    </div>
  </div>
</template>
