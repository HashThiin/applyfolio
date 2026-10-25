/**
 * 收录卡片的注入入口。三条路，权限一条比一条大：
 *
 * 1. manifest 的 content_scripts：内置的 32 家校招站，进页面就自动出卡片，零权限；
 * 2. 工具栏图标 / 快捷键 Alt+Shift+A / 右键菜单：activeTab 只在这一次操作里生效，
 *    因此能注入**任何**站点而不用申请「读取所有网站数据」；
 * 3. 「全站自动」（可选，默认关）：用户在设置页手动授权全站访问，之后路过任何站点
 *    都自动出卡片。授权/撤销后要同步注册状态，见 syncAllSitesScript。
 */
const INJECT_FILES = ['sites.js', 'extract.js', 'encode.js', 'panel.js']
const ALL_SITES_ORIGIN = '*://*/*'
const ALL_SITES_SCRIPT_ID = 'af-all-sites'
const MENU_ID = 'af-collect'

function inject(tabId) {
  return chrome.scripting
    .executeScript({ target: { tabId }, files: INJECT_FILES })
    .catch((error) => {
      // chrome:// / edge:// 页面、扩展商店、PDF 阅读器等不允许注入，静默忽略
      console.warn('[ApplyFolio] 无法注入当前页面', error)
    })
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) void inject(tab.id)
})

/** 右键菜单是第三条入口：选中岗位描述右键也能收 */
function ensureContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: '收录这个岗位到 ApplyFolio',
      contexts: ['page', 'selection'],
    })
  })
}

chrome.runtime.onInstalled.addListener(() => {
  ensureContextMenu()
  void syncAllSitesScript()
})

chrome.runtime.onStartup.addListener(() => {
  void syncAllSitesScript()
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab && tab.id) void inject(tab.id)
})

/** 让「全站自动」的动态注册与授权状态保持一致（多注册一次会抛错，所以先查） */
async function syncAllSitesScript() {
  try {
    const granted = await chrome.permissions.contains({ origins: [ALL_SITES_ORIGIN] })
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [ALL_SITES_SCRIPT_ID],
    })
    if (granted && registered.length === 0) {
      await chrome.scripting.registerContentScripts([
        {
          id: ALL_SITES_SCRIPT_ID,
          matches: [ALL_SITES_ORIGIN],
          js: INJECT_FILES,
          run_at: 'document_idle',
        },
      ])
    } else if (!granted && registered.length > 0) {
      await chrome.scripting.unregisterContentScripts({ ids: [ALL_SITES_SCRIPT_ID] })
    }
  } catch (error) {
    console.warn('[ApplyFolio] 同步「全站自动」失败', error)
  }
}

chrome.permissions.onAdded.addListener(() => void syncAllSitesScript())
chrome.permissions.onRemoved.addListener(() => void syncAllSitesScript())

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== 'string') return undefined
  // 卡片上的「设置」：内容脚本调不动 permissions，转到设置页让用户自己点
  if (message.type === 'af:open-options') {
    chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
    return undefined
  }
  if (message.type === 'af:all-sites-state') {
    chrome.permissions
      .contains({ origins: [ALL_SITES_ORIGIN] })
      .then((granted) => sendResponse({ granted }))
      .catch(() => sendResponse({ granted: false }))
    return true
  }
  return undefined
})
