import { Route, Routes } from 'react-router-dom'
import { PosterFrame } from '@/components/Ornament'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { MainApp } from '@/features/MainApp'
import { ProfilePage } from '@/features/ProfilePage'

export default function App() {
  return (
    <>
      <PosterFrame />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AuthGuard />}>
          <Route path="/" element={<MainApp />} />
          <Route path="/me" element={<ProfilePage />} />
        </Route>
      </Routes>
    </>
  )
}
