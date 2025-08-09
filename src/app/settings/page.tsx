'use client'

import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PasswordChangeForm } from '@/components/settings/PasswordChangeForm'
import { PasswordInfo } from '@/components/settings/PasswordInfo'

export default function SettingsPageRoute() {
  const { logout, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { t } = useTranslation()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="space-y-4 sm:space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">{t('settings.title')}</h1>
            <p className="text-sm sm:text-base md:text-lg mt-2 text-muted-foreground">
              {t('settings.description')}
            </p>
          </div>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <SettingsIcon className="h-5 w-5" />
                {t('settings.appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{t('settings.theme')}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('settings.themeDescription')}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-400 dark:hover:border-purple-500 transition-all duration-200"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      {t('settings.lightMode')}
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4 mr-2" />
                      {t('settings.darkMode')}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <PasswordInfo 
            passwordUpdatedAt={user?.passwordUpdatedAt}
            hasPassword={!!user?.password}
          />

          <PasswordChangeForm />

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <LogOut className="h-5 w-5" />
                {t('settings.account')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-400 dark:hover:border-red-500 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('auth.signOut')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}