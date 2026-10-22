import { STATUS_LABEL, type Application } from '@/db/schema'

const HEADERS = ['公司', '岗位', '网址', '投递日期', '状态', '渠道', '备注']

function escapeCell(value: string | undefined): string {
  const text = (value ?? '').replace(/\r?\n/g, ' ')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: Application[]): string {
  const lines = [HEADERS.join(',')]
  for (const row of rows) {
    lines.push(
      [
        row.company,
        row.role,
        row.url ?? '',
        row.appliedAt,
        STATUS_LABEL[row.status],
        row.channel ?? '',
        row.note ?? '',
      ]
        .map(escapeCell)
        .join(','),
    )
  }
  // BOM：Windows Excel 双击打开时中文不乱码；\r\n 保证换行正确
  return '\uFEFF' + lines.join('\r\n')
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
