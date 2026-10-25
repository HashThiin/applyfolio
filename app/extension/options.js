/**
 * 设置页：「全站自动」开关。
 *
 * 授权必须在**用户手势**里发起，所以点按钮时同步调用 permissions.request，
 * 不先 await 任何东西（await 之后手势标记会丢，Chrome 会直接拒）。
 * 注册/注销动态内容脚本由 background.js 的 permissions.onAdded/onRemoved 完成。
 */
const ORIGIN = '*://*/*'

const toggle = document.getElementById('toggle')
const state = document.getElementById('state')

let granted = false

function setState(text, tone) {
  state.textContent = text
  state.dataset.tone = tone || ''
}

function render() {
  toggle.textContent = granted ? '关闭' : '开启'
  toggle.dataset.on = granted ? '1' : '0'
  toggle.setAttribute('aria-pressed', granted ? 'true' : 'false')
  setState(
    granted
      ? '已开启：任何站点的岗位页都会自动出卡片。'
      : '未开启：只有内置的 32 家站点自动出卡片，其它站点点图标或按快捷键。',
  )
}

async function refresh() {
  try {
    granted = await chrome.permissions.contains({ origins: [ORIGIN] })
    render()
  } catch (error) {
    setState('读不到授权状态，请在扩展管理页点「重新加载」后再试。', 'bad')
    console.warn('[ApplyFolio] 读取授权状态失败', error)
  }
}

function onToggle() {
  const task = granted
    ? chrome.permissions.remove({ origins: [ORIGIN] })
    : chrome.permissions.request({ origins: [ORIGIN] })
  task
    .then((result) => {
      if (!result) setState('设置没有变化（授权被取消）。', 'bad')
      return refresh()
    })
    .catch((error) => {
      setState('操作失败：请在扩展管理页的「站点访问权限」里手动调整。', 'bad')
      console.warn('[ApplyFolio] 修改授权失败', error)
    })
}

if (toggle) toggle.addEventListener('click', onToggle)
void refresh()

// 状态页打开时也可能被别处改动（如扩展管理页），回来时刷一次
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void refresh()
})
