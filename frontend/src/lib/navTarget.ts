import { TOOL_ROUTE_MAP } from '../types/tools'

/**
 * `system_notifications.target_route` 是管理员在后台自由填写的文本，
 * 而路由表没有 catch-all：填了不存在的.path、协议头或协议相对 URL，
 * 点「查看详情」就会落进空白页。这里做白名单校验，权限判定仍交给路由守卫。
 */
const STATIC_TARGETS = new Set<string>(['/', '/notifications', ...Object.values(TOOL_ROUTE_MAP)])

export function isSafeNavTarget(route: string | null | undefined, isAdmin: boolean): route is string {
  if (typeof route !== 'string' || !route) return false
  // 必须是站内绝对路径：挡掉 https://、javascript:、//host 以及带空白/反斜杠的绕过写法
  if (!route.startsWith('/') || route.startsWith('//')) return false
  if (/[\s\\]/.test(route)) return false
  if (route === '/admin' || route.startsWith('/admin/')) return isAdmin
  return STATIC_TARGETS.has(route)
}
