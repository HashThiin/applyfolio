/**
 * 优先级色的「列表观感」：公司头像内核使用 15% 混色实心圆。
 * 编辑区的选色预览必须走同一个函数，否则会出现「选色时鲜艳、列表里发白」的落差。
 */
export function avatarTint(color: string): string {
  return `color-mix(in srgb, ${color} 15%, var(--color-page))`
}
