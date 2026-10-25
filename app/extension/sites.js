/**
 * 12 家常用校招官网的「候选选择器」。
 *
 * 校招站的类名多是构建产物（带哈希），所以这里每个字段给一组候选，按顺序试，
 * 命中第一个长度合理的就用；一个都不中就退回 extract.js 的通用兜底。
 * 公司名按域名先兜住——哪怕页面上找不到公司，也知道这是谁家的岗位。
 *
 * 结构：host -> { name, company, role: [选择器], jd: [选择器] }
 * 新增站点：域名写进 manifest.json 的 content_scripts.matches，再在这里补一条。
 */
globalThis.AF_SITES = {
  'join.qq.com': {
    name: '腾讯校招',
    company: '腾讯',
    role: ['h1', '[class*="job-title"]', '[class*="jobTitle"]', '[class*="position-name"]', '[class*="post-name"]'],
    jd: ['[class*="job-desc"]', '[class*="jobDesc"]', '[class*="job-detail"]', '[class*="position-desc"]', 'article', 'main'],
  },
  'jobs.bytedance.com': {
    name: '字节跳动招聘',
    company: '字节跳动',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="detail"]', 'article', 'main'],
  },
  'talent.alibaba.com': {
    name: '阿里巴巴校园招聘',
    company: '阿里巴巴',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position-name"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'career.huawei.com': {
    name: '华为招聘',
    company: '华为',
    role: ['h1', '[class*="job-name"]', '[class*="job-title"]', '[class*="position"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'zhaopin.meituan.com': {
    name: '美团招聘',
    company: '美团',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position-name"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'campus.jd.com': {
    name: '京东校园招聘',
    company: '京东',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'campus.163.com': {
    name: '网易校园招聘',
    company: '网易',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position-name"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'talent.baidu.com': {
    name: '百度招聘',
    company: '百度',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position-name"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'careers.pinduoduo.com': {
    name: '拼多多招聘',
    company: '拼多多',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'hr.xiaomi.com': {
    name: '小米招聘',
    company: '小米',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position-name"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'zhaopin.kuaishou.cn': {
    name: '快手招聘',
    company: '快手',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
  'jobs.bilibili.com': {
    name: '哔哩哔哩招聘',
    company: '哔哩哔哩',
    role: ['h1', '[class*="job-title"]', '[class*="title"]', '[class*="position-name"]'],
    jd: ['[class*="job-description"]', '[class*="description"]', '[class*="content"]', 'article', 'main'],
  },
}
