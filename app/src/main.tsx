import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { captureImportFromHash } from './lib/jobImport'

// 浏览器扩展把岗位数据拼在 hash 里打开应用：先收进 sessionStorage 再抹掉 hash，
// 这样未登录跳到 /login 也不会丢，且数据不会出现在服务端日志里。
captureImportFromHash()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
