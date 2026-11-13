import type { CuIconName } from '../components/v2/cuGlyphs'

/** 导航里的一个工具行。icon 传 glyph 名而不是组件，渲染侧统一交给 CuIcon。 */
export interface NavToolItem {
  id: string
  name: string
  icon: CuIconName
  route: string
  /** 弱化副标题只用它，且在「最近使用」「收藏」里才渲染 */
  category?: string
  /** DEV 离线 seed 没有这个字段，渲染前必须判空 */
  description?: string | null
  dataScope?: 'none' | 'private' | 'shared'
}

export interface NavGroup {
  name: string
  items: NavToolItem[]
}

/** 管理台导航：数据管理带子路由，其余为普通行。 */
export interface NavItem {
  id: string
  nameKey: string
  icon: CuIconName
  route: string
  children?: { id: string; nameKey: string; route: string }[]
}
