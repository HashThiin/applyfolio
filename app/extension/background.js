/**
 * 工具栏图标点击 → 往当前标签注入卡片。
 *
 * 12 家已知校招站由 manifest 的 content_scripts 自动注入，这里兜住其它站点：
 * activeTab 权限只在用户点图标时生效，不需要「读取所有网站数据」。
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['sites.js', 'extract.js', 'encode.js', 'panel.js'],
    })
  } catch (error) {
    // chrome:// 页面、扩展商店、PDF 阅读器等不允许注入，静默忽略
    console.warn('[ApplyFolio] 无法注入当前页面', error)
  }
})
