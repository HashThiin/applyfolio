/**
 * 内置校招官网的「候选选择器」。
 *
 * 校招站的类名多是构建产物（带哈希），所以这里每个字段给一组候选，按顺序试，
 * 命中第一个长度合理的就用；一个都不中就退回 extract.js 的通用兜底。
 * 公司名按域名先兜住——哪怕页面上找不到公司，也知道这是谁家的岗位。
 *
 * 整体包一层 IIFE：内容脚本可能被注入两次（32 站静态注入 + 「全站自动」动态注入），
 * 顶层 const 第二次会撞名直接报 SyntaxError。
 *
 * 结构：host -> { name, company, role: [选择器], jd: [选择器] }
 * 前 12 家逐个摸过，选择器更贴站点；其余用默认那组常见类名。
 * 新增站点：域名写进 manifest.json 的 content_scripts.matches，再在这里补一条。
 */
;(function () {
  const ROLE = [
    'h1',
    '[class*="job-title"]',
    '[class*="jobTitle"]',
    '[class*="title"]',
    '[class*="position-name"]',
  ]
  const JD = [
    '[class*="job-description"]',
    '[class*="jobDesc"]',
    '[class*="description"]',
    '[class*="content"]',
    'article',
    'main',
  ]

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
    'talent.antgroup.com': { name: '蚂蚁集团招聘', company: '蚂蚁集团', role: ROLE, jd: JD },
    'campus.didiglobal.com': { name: '滴滴校园招聘', company: '滴滴', role: ROLE, jd: JD },
    'campus.ctrip.com': { name: '携程校园招聘', company: '携程', role: ROLE, jd: JD },
    'campus.nio.com': { name: '蔚来校园招聘', company: '蔚来', role: ROLE, jd: JD },
    'we.dji.com': { name: '大疆招聘', company: '大疆', role: ROLE, jd: JD },
    'jobs.mihoyo.com': { name: '米哈游招聘', company: '米哈游', role: ROLE, jd: JD },
    'careers.oppo.com': { name: 'OPPO 招聘', company: 'OPPO', role: ROLE, jd: JD },
    'hr.vivo.com': { name: 'vivo 招聘', company: 'vivo', role: ROLE, jd: JD },
    'career.honor.com': { name: '荣耀招聘', company: '荣耀', role: ROLE, jd: JD },
    'talent.lenovo.com.cn': { name: '联想招聘', company: '联想', role: ROLE, jd: JD },
    'campus.iflytek.com': { name: '科大讯飞校园招聘', company: '科大讯飞', role: ROLE, jd: JD },
    'hr.360.cn': { name: '360 招聘', company: '360', role: ROLE, jd: JD },
    'campus.ke.com': { name: '贝壳校园招聘', company: '贝壳', role: ROLE, jd: JD },
    'careers.shein.com': { name: 'SHEIN 招聘', company: 'SHEIN', role: ROLE, jd: JD },
    'job.byd.com': { name: '比亚迪招聘', company: '比亚迪', role: ROLE, jd: JD },
    'job.10086.cn': { name: '中国移动招聘', company: '中国移动', role: ROLE, jd: JD },
    'job.icbc.com.cn': { name: '工商银行招聘', company: '工商银行', role: ROLE, jd: JD },
    'job.ccb.com': { name: '建设银行招聘', company: '建设银行', role: ROLE, jd: JD },
    'career.cmbchina.com': { name: '招商银行招聘', company: '招商银行', role: ROLE, jd: JD },
    'talent.pingan.com': { name: '平安招聘', company: '平安', role: ROLE, jd: JD },
  }
})()
