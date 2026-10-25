/**
 * 页面右下角的收录卡片（Shadow DOM，杜绝被站点 CSS 影响）。
 *
 * 一次注入只挂一次：content_scripts 自动注入与工具栏图标点击注入会撞车，
 * 用 __AF_PANEL__ 标记挡住第二次。字段可改——提取出错时不至于要重新来一遍。
 *
 * 界面全部用 createElement + textContent 搭，不用 innerHTML：
 * 提取出来的文字可能带页面上的任意内容，走文本节点最省心。
 */
;(function () {
  if (globalThis.__AF_PANEL__) return
  globalThis.__AF_PANEL__ = true

  // 应用地址：本地调试改成 http://localhost:5173
  const APP_ORIGIN = 'https://applyfolio-silk.vercel.app'

  const CSS = `
    :host { all: initial; }
    .card {
      width: 336px; box-sizing: border-box; border-radius: 14px; overflow: hidden;
      background: #fffef9; color: #242e26; border: 1px solid #ddddd2;
      box-shadow: 0 12px 32px rgba(36,46,38,.18);
      font: 13px/1.5 "Songti SC","STSong",Georgia,"Microsoft YaHei",sans-serif;
    }
    .head {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 10px 12px; background: #244c40; color: #fffef9;
    }
    .brand { font-weight: 600; letter-spacing: .04em; }
    .site { font-size: 11px; opacity: .78; margin-left: 6px; }
    .close {
      all: unset; cursor: pointer; padding: 2px 6px; border-radius: 6px;
      color: #fffef9; font-size: 16px; line-height: 1;
    }
    .close:hover { background: rgba(255,255,255,.16); }
    .body { padding: 12px; display: grid; gap: 8px; }
    label { font-size: 11px; color: #60685e; display: block; margin-bottom: 3px; }
    input, textarea {
      all: unset; box-sizing: border-box; width: 100%; display: block;
      border: 1px solid #ddddd2; border-radius: 8px; padding: 6px 8px;
      color: #242e26; background: #fff; font: inherit;
    }
    input:focus, textarea:focus {
      border-color: #244c40; box-shadow: 0 0 0 2px rgba(36,76,64,.14);
    }
    textarea {
      height: 78px; resize: vertical; font-size: 12px; line-height: 1.55; color: #4a5349;
    }
    .meta {
      font-size: 11px; color: #60685e; display: flex; justify-content: space-between; gap: 8px;
    }
    .foot { display: flex; align-items: center; gap: 6px; }
    .primary {
      all: unset; cursor: pointer; flex: 1; text-align: center;
      background: #244c40; color: #fffef9; border-radius: 999px;
      padding: 8px 12px; font-weight: 600;
    }
    .primary:hover { background: #1b3d33; }
    .primary[disabled] { opacity: .6; cursor: default; }
    .ghost {
      all: unset; cursor: pointer; color: #60685e; border: 1px solid #ddddd2;
      border-radius: 999px; padding: 7px 10px; font-size: 12px;
    }
    .ghost:hover { color: #242e26; border-color: #cab990; }
    .status { font-size: 11px; color: #60685e; min-height: 15px; }
    .status[data-tone="bad"] { color: #9c3b2e; }
  `

  const SOURCE_LABEL = {
    'json-ld': '来源：结构化数据',
    site: '来源：站点规则',
    title: '来源：标题',
    block: '来源：正文',
    none: '来源：无',
  }

  function el(tag, props, children) {
    const node = document.createElement(tag)
    for (const [key, value] of Object.entries(props || {})) {
      if (key === 'class') node.className = value
      else if (key === 'text') node.textContent = value
      else node.setAttribute(key, value)
    }
    for (const child of children || []) {
      if (child) node.append(child)
    }
    return node
  }

  const job = globalThis.AF_EXTRACT
    ? globalThis.AF_EXTRACT.extractJob(document, location.href)
    : { company: '', role: '', jdText: '', url: location.href, source: 'none', siteName: '' }

  const companyInput = el('input', { id: 'af-company', type: 'text', maxlength: '60', value: job.company || '' })
  const roleInput = el('input', { id: 'af-role', type: 'text', maxlength: '80', value: job.role || '' })
  const jdInput = el('textarea', { id: 'af-jd', maxlength: '8000', text: job.jdText || '' })
  const countEl = el('span', {})
  const sourceEl = el('span', { text: SOURCE_LABEL[job.source] || '' })
  const statusEl = el('div', { class: 'status', role: 'status' })
  const primary = el('button', { class: 'primary', type: 'button', text: '收录到 ApplyFolio' })
  const copyButton = el('button', { class: 'ghost', type: 'button', title: '复制 JSON，便于排查', text: '复制' })
  const settingsButton = el('button', {
    class: 'ghost',
    type: 'button',
    title: '扩展设置：让卡片在内置 32 家之外的站点也自动出现',
    text: '设置',
  })

  const siteEl = el('span', { class: 'site', text: job.siteName ? `· ${job.siteName}` : '' })
  const closeButton = el('button', { class: 'close', type: 'button', title: '关闭', text: '×' })

  const card = el('div', { class: 'card', role: 'dialog', 'aria-label': '收录岗位到 ApplyFolio' }, [
    el('div', { class: 'head' }, [
      el('span', {}, [el('span', { class: 'brand', text: 'ApplyFolio' }), siteEl]),
      closeButton,
    ]),
    el('div', { class: 'body' }, [
      el('div', {}, [el('label', { for: 'af-company', text: '公司' }), companyInput]),
      el('div', {}, [el('label', { for: 'af-role', text: '岗位' }), roleInput]),
      el('div', {}, [
        el('label', { for: 'af-jd', text: '岗位要求（可改，收录后仍能在应用里编辑）' }),
        jdInput,
        el('div', { class: 'meta' }, [countEl, sourceEl]),
      ]),
      el('div', { class: 'foot' }, [primary, copyButton, settingsButton]),
      statusEl,
    ]),
  ])

  const host = el('div', {})
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483000;'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = CSS
  shadow.append(style, card)

  function refreshMeta() {
    countEl.textContent = `${jdInput.value.trim().length} 字`
  }
  refreshMeta()
  jdInput.addEventListener('input', refreshMeta)

  function setStatus(text, tone) {
    statusEl.textContent = text || ''
    statusEl.dataset.tone = tone || ''
  }

  function currentJob() {
    return {
      company: companyInput.value.trim(),
      role: roleInput.value.trim(),
      jdText: jdInput.value.trim(),
      url: job.url || location.href,
      source: job.source || '',
    }
  }

  function closeCard() {
    host.remove()
    globalThis.__AF_PANEL__ = false
  }

  async function collect() {
    const payload = currentJob()
    if (!payload.company && !payload.role && !payload.jdText) {
      setStatus('没读到内容：这是列表页吗？进具体岗位详情页再试', 'bad')
      return
    }
    primary.setAttribute('disabled', '')
    setStatus('正在打开 ApplyFolio…')
    try {
      const token = await globalThis.AF_ENCODE.encodeJob(payload)
      window.open(`${APP_ORIGIN}/#import=${token}`, '_blank', 'noopener,noreferrer')
      setStatus('已在新标签打开 ApplyFolio，核对后点「收录并分析」')
      closeCard()
    } catch (error) {
      setStatus('打开失败，可点「复制」把内容贴到应用里', 'bad')
      primary.removeAttribute('disabled')
      console.warn('[ApplyFolio] 编码失败', error)
    }
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentJob(), null, 2))
      setStatus('已复制 JSON')
    } catch {
      setStatus('复制失败，浏览器拒绝了剪贴板', 'bad')
    }
  }

  /** 内容脚本调不了 permissions，交给 background 打开设置页 */
  function openSettings() {
    const fallback = () => setStatus('请在扩展管理页打开「扩展程序选项」', 'bad')
    try {
      const task = chrome.runtime.sendMessage({ type: 'af:open-options' })
      if (task && typeof task.catch === 'function') {
        task.catch((error) => {
          fallback()
          console.warn('[ApplyFolio] 打开设置页失败', error)
        })
      }
    } catch (error) {
      fallback()
      console.warn('[ApplyFolio] 打开设置页失败', error)
    }
  }

  primary.addEventListener('click', () => void collect())
  copyButton.addEventListener('click', () => void copyJson())
  settingsButton.addEventListener('click', openSettings)
  closeButton.addEventListener('click', closeCard)

  document.documentElement.appendChild(host)
})()
