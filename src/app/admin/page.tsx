'use client';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { AdminStats } from '@/components/admin/AdminStats';
import { SpecialtiesTab } from '@/components/admin/SpecialtiesTab';
import { LecturesTab } from '@/components/admin/LecturesTab';
import { ReportsTab } from '@/components/admin/ReportsTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BookOpen, FileText, Users, BarChart3 } from 'lucide-react';

export default function AdminPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const { t } = useTranslation();
  
  const renderContent = () => {
    switch (tab) {
      case 'specialties':
        return (
          <div className="space-y-8">
            {/* Modern Page Header */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">{t('admin.specialties')}</h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Manage specialties and their content
              </p>
            </div>
            <SpecialtiesTab />
          </div>
        );
      case 'lectures':
        return (
          <div className="space-y-8">
            {/* Modern Page Header */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-green-500" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">{t('admin.lectures')}</h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Manage lectures and their questions
              </p>
            </div>
            <LecturesTab />
          </div>
        );
      case 'users':
        return (
          <div className="space-y-8">
            {/* Modern Page Header */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">{t('admin.users')}</h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Manage user accounts and roles
              </p>
            </div>
            <UsersTab />
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-8">
            {/* Modern Page Header */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">{t('admin.reports')}</h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                View and manage user reports
              </p>
            </div>
            <ReportsTab />
          </div>
        );
      case 'dashboard':
      default:
        return (
          <div className="space-y-8">
            {/* Modern Page Header */}
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">{t('admin.adminDashboard')}</h1>
              <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('admin.manageContent')}
              </p>
            </div>
            <AdminStats />
          </div>
        );
    }
  };
  
  return (
    <ProtectedRoute requireAdmin>
      <AdminRoute>
        <AdminLayout>
          {renderContent()}
        </AdminLayout>
      </AdminRoute>
    </ProtectedRoute>
  );
}