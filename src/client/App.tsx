import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'
import ErrorBoundary from '@/components/providers/error-boundary'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { DashboardLayout } from '@/client/DashboardLayout'
import { DashboardHistoryPage } from '@/client/routes/DashboardHistoryPage'
import { DashboardPage } from '@/client/routes/DashboardPage'
import { DashboardSettingsPage } from '@/client/routes/DashboardSettingsPage'
import { GuidePage } from '@/client/routes/GuidePage'
import { HomePage } from '@/client/routes/HomePage'
import { LoginPage } from '@/client/routes/LoginPage'
import { RegisterPage } from '@/client/routes/RegisterPage'
import { usePathname } from '@/client/navigation'

function CurrentRoute() {
  const pathname = usePathname()

  if (pathname === '/login') return <LoginPage />
  if (pathname === '/register') return <RegisterPage />
  if (pathname === '/dashboard')
    return (
      <DashboardLayout>
        <DashboardPage />
      </DashboardLayout>
    )
  if (pathname === '/dashboard/history')
    return (
      <DashboardLayout>
        <DashboardHistoryPage />
      </DashboardLayout>
    )
  if (pathname === '/dashboard/settings')
    return (
      <DashboardLayout>
        <DashboardSettingsPage />
      </DashboardLayout>
    )
  if (pathname === '/guide') return <GuidePage />

  return <HomePage />
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <ErrorBoundary>
        <Navbar />
        <main className="flex-1">
          <CurrentRoute />
        </main>
        <Footer />
      </ErrorBoundary>
    </ThemeProvider>
  )
}
