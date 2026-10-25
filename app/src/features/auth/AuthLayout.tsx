import type { ReactNode } from 'react'
import floralImg from '@/assets/mucha-floral.jpg'
import { ArchPanel, GiltDivider, Wordmark } from '@/components/Ornament'

interface AuthLayoutProps {
  title: string
  description: string
  caption: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, description, caption, children, footer }: AuthLayoutProps) {
  return (
    <main className="jc-auth-page">
      <div className="jc-auth-book">
        <aside className="jc-auth-art">
          <Wordmark inverse className="text-[30px] leading-none" />
          <p className="mt-2 text-xs text-gilt-100">校招投递记录簿</p>
          <ArchPanel className="jc-auth-arch" imageClassName="aspect-[2/3]">
            <img src={floralImg} width="780" height="1170" alt="穆夏风格植物版画：百合、鸢尾与金盏花在圆拱内生长" className="h-full w-full object-cover" />
          </ArchPanel>
          <p className="jc-auth-art-caption">{caption}</p>
        </aside>
        <section className="jc-auth-content" aria-label={title}>
          <div className="jc-auth-mobile-brand">
            <img src={floralImg} width="52" height="68" alt="" aria-hidden />
            <div><Wordmark className="text-[25px]" /><p className="mt-1 text-xs text-ink-600">校招投递记录簿</p></div>
          </div>
          <h1 className="jc-auth-title">{title}</h1>
          <p className="jc-auth-description">{description}</p>
          <GiltDivider className="mt-4 h-3 w-24 text-gilt-600" />
          {children}
          <div className="jc-auth-footer">{footer}</div>
        </section>
      </div>
    </main>
  )
}
