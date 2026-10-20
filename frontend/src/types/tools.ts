 export interface Tool {
   id: string
   name: string
   description: string
   icon: string
   category: ToolCategory
   status: 'ready' | 'building'
   route: string
 }
 
 export type ToolCategory = 'shence' | 'tools' | 'panel' | 'tasks'
 
 export const CATEGORY_META: Record<ToolCategory, { name: string; icon: string; order: number }> = {
   shence: { name: '速查参考', icon: 'BookOpen', order: 1 },
   tools: { name: '交互工具', icon: 'Wrench', order: 2 },
   panel: { name: '信息面板', icon: 'LayoutDashboard', order: 3 },
   tasks: { name: '任务管理', icon: 'ListTodo', order: 4 },
 }
 
 export const ALL_TOOLS: Tool[] = [
   { id: 'docker', name: 'Docker & K8S 速查', description: 'Docker & K8S 操作速查手册', icon: 'Container', category: 'shence', status: 'ready', route: '/docker' },
   { id: 'sql', name: 'SQL 速查', description: '常用 SQL 语法速查手册', icon: 'Database', category: 'shence', status: 'ready', route: '/sql' },
   { id: 'redis', name: 'Redis 速查', description: 'Redis 命令速查手册', icon: 'Zap', category: 'shence', status: 'ready', route: '/redis' },
   { id: 'typora', name: 'Typora 快捷键', description: 'Typora 快捷键与语法', icon: 'FileType2', category: 'shence', status: 'ready', route: '/typora' },
   { id: 'chrome-pack', name: 'Chrome 扩展打包', description: '打包发布 Chrome 扩展指南', icon: 'Puzzle', category: 'shence', status: 'ready', route: '/chrome-pack' },
   { id: 'markdown-heading', name: 'Markdown 标题工具', description: '标题层级调整与清空', icon: 'Heading1', category: 'shence', status: 'ready', route: '/markdown-heading' },
 
   { id: 'parking', name: '停车收费', description: '车牌录入、费用计算、历史查询', icon: 'SquareParking', category: 'tools', status: 'ready', route: '/parking' },
   { id: 'collage', name: '图片拼接', description: '多图拼接生成工具', icon: 'Images', category: 'tools', status: 'building', route: '/collage' },
   { id: 'text-stats', name: '字数统计', description: '字数/频率/行数统计工具', icon: 'TextCursorInput', category: 'tools', status: 'ready', route: '/text-stats' },
   { id: 'pixabay', name: 'Pixabay 下载', description: 'Pixabay 图片搜索与下载', icon: 'ImageDown', category: 'tools', status: 'ready', route: '/pixabay' },
 
  { id: 'movie', name: '家庭电影', description: '家庭电影信息管理', icon: 'Film', category: 'panel', status: 'ready', route: '/movie' },
 
   { id: 'todo', name: 'Todo', description: '个人待办事项管理', icon: 'ListTodo', category: 'tasks', status: 'ready', route: '/todo' },
 ]
