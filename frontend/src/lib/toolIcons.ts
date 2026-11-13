import { defineComponent, h, type Component } from 'vue'
import CuIcon from '../components/v2/CuIcon.vue'
import type { CuIconName } from '../components/v2/cuGlyphs'

/** public.tools.icon 字符串 -> CuIcon glyph。DB 里的值不变，只改这一层映射。 */
const TOOL_GLYPH: Record<string, CuIconName> = {
  Database: 'database',
  Zap: 'zap',
  Container: 'container',
  Keyboard: 'keyboard',
  Car: 'car',
  ListTodo: 'list-todo',
  Film: 'film',
  Image: 'image',
  Hash: 'hash',
  Puzzle: 'puzzle',
  Heading: 'heading',
}

/**
 * image-stitch 与 pixabay-download 的 icon 都是 Image、且同属「图形工具」，
 * 同组并排会出现两行一模一样的图标。这里按 tool id 覆盖，不动 DB、不加 migration。
 */
const ID_GLYPH: Record<string, CuIconName> = {
  'pixabay-download': 'download',
}

const bound = new Map<CuIconName, Component>()

/**
 * 每个 glyph 生成一个预绑定组件。不能直接返回 CuIcon 本身，
 * 因为调用方是 <component :is="getToolIcon(...)" /> 形式，没有地方传 name。
 * size 默认 24，与 lucide 原默认一致，避免 DashboardView 不传 size 时图标变形。
 */
export function bindCuIcon(name: CuIconName): Component {
  let c = bound.get(name)
  if (!c) {
    c = defineComponent({
      name: `CuIcon-${name}`,
      props: { size: { type: Number, default: 24 } },
      setup: (props) => () => h(CuIcon, { name, size: props.size }),
    })
    bound.set(name, c)
  }
  return c
}

/** 解析出 glyph 名。导航侧直接传字符串给 CuIcon，避免把组件塞进 props。 */
export function toolGlyph(iconName: string, toolId?: string): CuIconName {
  return (toolId ? ID_GLYPH[toolId] : undefined) ?? TOOL_GLYPH[iconName] ?? 'box'
}

export function getToolIcon(iconName: string, toolId?: string): Component {
  return bindCuIcon(toolGlyph(iconName, toolId))
}
