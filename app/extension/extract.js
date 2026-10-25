/**
 * 在页面里提取「公司 / 岗位 / 岗位要求 / 网址」。
 *
 * 顺序：站点候选选择器 → JSON-LD JobPosting → og / title 拆分 → 最大文本块。
 * 依赖真实 DOM（innerText 才带换行、只算可见内容），所以不进前端单测，
 * 由面板里的「复制 JSON」在现场核对。
 */
;(function () {
  const MAX_JD = 8000
  const MAX_ROLE = 80
  const MAX_COMPANY = 60
  const MIN_BLOCK = 120

  function tidy(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
  }

  function oneLine(text) {
    return tidy(text).replace(/\n+/g, ' ').trim()
  }

  function textOf(node) {
    if (!node) return ''
    const raw = node.innerText || node.textContent || ''
    return tidy(raw)
  }

  function queryAll(root, selector) {
    try {
      return Array.from(root.querySelectorAll(selector))
    } catch {
      return []
    }
  }

  /** 岗位名：要短，取候选里第一个 2..MAX_ROLE 字的首行 */
  function pickRole(root, selectors) {
    for (const selector of selectors || []) {
      for (const el of queryAll(root, selector)) {
        const line = oneLine(el.textContent || '')
        if (line.length >= 2 && line.length <= MAX_ROLE) return line
      }
    }
    return ''
  }

  /** 岗位要求：要长，候选里取最长的一段 */
  function pickBody(root, selectors) {
    let best = ''
    for (const selector of selectors || []) {
      for (const el of queryAll(root, selector)) {
        const text = textOf(el)
        if (text.length > best.length) best = text
      }
    }
    return best
  }

  /**
   * JSON-LD 的 description 是 HTML：用 DOMParser 解成文档再取文本。
   * 不用 detached div + innerHTML —— 那条路会真的去加载 <img>、触发 onerror。
   */
  function stripTags(html) {
    const parsed = new DOMParser().parseFromString(String(html || ''), 'text/html')
    return tidy(parsed.body ? parsed.body.textContent || '' : '')
  }

  function findJobPosting(node, depth) {
    if (!node || typeof node !== 'object' || (depth || 0) > 6) return null
    if (Array.isArray(node)) {
      for (const item of node) {
        const hit = findJobPosting(item, (depth || 0) + 1)
        if (hit) return hit
      }
      return null
    }
    const type = node['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.indexOf('JobPosting') !== -1) return node
    for (const key of ['@graph', 'itemListElement', 'mainEntity', 'about', 'item']) {
      const hit = findJobPosting(node[key], (depth || 0) + 1)
      if (hit) return hit
    }
    return null
  }

  function fromJsonLd(doc) {
    for (const el of queryAll(doc, 'script[type="application/ld+json"]')) {
      try {
        const posting = findJobPosting(JSON.parse(el.textContent || 'null'), 0)
        if (!posting) continue
        const org = posting.hiringOrganization
        const company = typeof org === 'string' ? org : org && org.name ? String(org.name) : ''
        return {
          company: oneLine(company),
          role: oneLine(posting.title || posting.name || ''),
          jdText: stripTags(typeof posting.description === 'string' ? posting.description : ''),
        }
      } catch {
        /* 单块 JSON 坏掉不影响其它块 */
      }
    }
    return null
  }

  function metaContent(doc, key) {
    const el =
      doc.querySelector(`meta[property="${key}"]`) || doc.querySelector(`meta[name="${key}"]`)
    return el ? oneLine(el.getAttribute('content') || '') : ''
  }

  /** 「岗位名称 - 公司名 - 站点名」这类标题，挑最长的一段当岗位名 */
  function splitTitle(title, siteName, company) {
    const noise = [siteName || '', company || '', '校园招聘', '招聘', '官网', '首页'].filter(Boolean)
    const parts = String(title || '')
      .split(/[|｜\-–—_·・/]+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2 && part.length <= MAX_ROLE)
      .filter((part) => noise.every((word) => part.indexOf(word) === -1))
    parts.sort((a, b) => b.length - a.length)
    return parts[0] || ''
  }

  /** 兜底：正文通常是页面上信息量最大的那块可见文本 */
  function largestBlock(doc) {
    const candidates = queryAll(doc, 'main, article, [role="main"], section, div, td')
    let best = ''
    for (const el of candidates) {
      const text = textOf(el)
      if (text.length < MIN_BLOCK || text.length > 12000) continue
      if (text.length > best.length) best = text
    }
    if (best) return best
    return doc.body ? textOf(doc.body) : ''
  }

  function siteRuleFor(host) {
    const sites = globalThis.AF_SITES || {}
    if (sites[host]) return sites[host]
    const bare = host.replace(/^www\./, '')
    return sites[bare] || null
  }

  /** 子域名里纯属功能的那些前缀：careers.pinduoduo.com 的 company 是 pinduoduo */
  const SITE_PREFIX = /^(www|m|jobs|job|job2|career|careers|campus|talent|hr|zhaopin|recruit|recruitment|join|we|app)\./

  /**
   * 没有站点规则时给个像样的站名：去掉功能前缀和公共后缀，
   * 如 careers.pinduoduo.com → pinduoduo、talent.lenovo.com.cn → lenovo。
   * 只用于标题拆分和卡片上角标，不当公司名（英文域名拼不出中文公司名）。
   */
  function hostLabel(host) {
    const bare = String(host || '')
      .replace(SITE_PREFIX, '')
      .replace(/\.(com|net|org|gov|edu|co|io|me|info)(\.(cn|hk|tw|jp|sg|uk))?$/i, '')
      .replace(/\.(cn|hk|tw|jp|sg|uk)$/i, '')
    const parts = bare.split('.').filter(Boolean)
    return parts.length ? parts[parts.length - 1] : ''
  }

  function extractJob(doc, url) {
    const href = url || (doc.location ? doc.location.href : '')
    let host = ''
    try {
      host = new URL(href).hostname
    } catch {
      host = ''
    }
    const rule = siteRuleFor(host)
    const label = hostLabel(host)
    const siteName = (rule && rule.name) || label || host

    const ld = fromJsonLd(doc)
    let company = (ld && ld.company) || (rule && rule.company) || metaContent(doc, 'og:site_name')
    let role = (ld && ld.role) || ''
    let jdText = (ld && ld.jdText) || ''
    let source = ld ? 'json-ld' : ''

    if (rule) {
      if (!role) role = pickRole(doc, rule.role)
      const body = pickBody(doc, rule.jd)
      if (body.length > jdText.length) jdText = body
      if (!source && (role || jdText)) source = 'site'
    }

    if (!role) {
      role = splitTitle(metaContent(doc, 'og:title') || doc.title, siteName, company)
      if (role) source = source || 'title'
    }
    if (!company) company = oneLine(metaContent(doc, 'author') || '')

    if (!jdText) {
      jdText = largestBlock(doc)
      if (jdText) source = source || 'block'
    }

    return {
      company: oneLine(company).slice(0, MAX_COMPANY),
      role: oneLine(role).slice(0, MAX_ROLE),
      jdText: jdText.slice(0, MAX_JD),
      url: href,
      source: source || 'block',
      siteName,
    }
  }

  globalThis.AF_EXTRACT = { extractJob, tidy, oneLine, splitTitle, largestBlock, hostLabel }
})()
