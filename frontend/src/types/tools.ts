export type ToolAccessLevel = 'view' | 'edit'

export interface Tool {
  id: string
  name: string
  description: string | null
  icon: string
  category: string
  status: 'active' | 'hidden'
  route: string
  data_scope: 'none' | 'private' | 'shared'
  writable: boolean
  sort_order: number
  created_at: string
}

export interface ToolPermissionRow {
  tool_id: string
  access_level: ToolAccessLevel
}

export const TOOL_ROUTE_MAP: Record<string, string> = {
  'docker-k8s-cheatsheet': '/docker',
  'sql-cheatsheet': '/sql',
  'redis-cheatsheet': '/redis',
  'typora-shortcuts': '/typora',
  'chrome-extension-packaging': '/chrome-pack',
  'markdown-heading': '/markdown-heading',
  parking: '/parking',
  'image-stitch': '/collage',
  'word-count': '/text-stats',
  'pixabay-download': '/pixabay',
  movie: '/movie',
  todo: '/todo',
}

export const toolPath = (tool: Pick<Tool, 'id' | 'route'>): string =>
  TOOL_ROUTE_MAP[tool.id] ?? '/'
