export interface WebmailProvider {
  key: string
  label: string
  url: string
}

export const WEBMAIL_PROVIDERS: WebmailProvider[] = [
  { key: 'qq', label: 'QQ 邮箱', url: 'https://mail.qq.com' },
  { key: '163', label: '网易 163', url: 'https://mail.163.com' },
  { key: '126', label: '网易 126', url: 'https://mail.126.com' },
  { key: 'yeah', label: '网易 yeah', url: 'https://mail.yeah.net/' },
  { key: 'foxmail', label: 'Foxmail', url: 'https://mail.foxmail.com/' },
  { key: 'aliyun', label: '阿里邮箱', url: 'https://mail.aliyun.com/' },
  { key: '139', label: '139 邮箱', url: 'https://mail.10086.cn/' },
  { key: 'sina', label: '新浪邮箱', url: 'https://mail.sina.com.cn/' },
  { key: 'sohu', label: '搜狐邮箱', url: 'https://mail.sohu.com/' },
  { key: 'outlook', label: 'Outlook', url: 'https://outlook.live.com/mail/0/' },
  { key: 'gmail', label: 'Gmail', url: 'https://mail.google.com/mail/u/0/#inbox' },
  { key: 'yahoo', label: 'Yahoo Mail', url: 'https://mail.yahoo.com/' },
]

export const WEBMAIL_STORAGE_KEY = 'jc-webmail'
