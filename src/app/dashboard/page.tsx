'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar';
import { SidebarInset } from '@/components/ui/sidebar';
import { UpsellBanner } from '@/components/subscription/UpsellBanner';
import { UpgradeDialog } from '@/components/subscription/UpgradeDialog';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProfileCompletionGuard } from '@/components/ProfileCompletionGuard';
import { UserStats } from '@/components/dashboard/UserStats';
import { ContinueLearning } from '@/components/dashboard/ContinueLearning';
import { DailyLearningChart } from '@/components/dashboard/DailyLearningChart';
import { RecentResults } from '@/components/dashboard/RecentResults';
import { PopularCourses } from '@/components/dashboard/PopularCourses';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

// Disable static generation to prevent SSR issues with useAuth
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isUpsellDismissed, setIsUpsellDismissed] = useState(false);
  const { t } = useTranslation();
  
  const { stats, dailyActivity, recentResults, popularCourses, isLoading, error } = useDashboardData();

  // Show upsell banner for free users who haven't dismissed it
  const shouldShowUpsell = !hasActiveSubscription && !isAdmin && !isUpsellDismissed;

  const handleUpgrade = () => {
    setIsUpgradeDialogOpen(true);
  };

  const handleUpgradeComplete = () => {
    setIsUpgradeDialogOpen(false);
    // Optionally refresh the page or update subscription status
  };

  return (
    <ProtectedRoute>
      <ProfileCompletionGuard>
        <AppSidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex-1 flex flex-col">
              {/* Universal Header */}
              <UniversalHeader
                title="Dashboard"
              />

              {/* Main Content */}
              <div className="flex-1 bg-gray-50 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                  <div className="space-y-4 sm:space-y-6">
            {/* Upsell Banner for Free Users */}
            {shouldShowUpsell && (
              <UpsellBanner
                onUpgrade={handleUpgrade}
                onDismiss={() => setIsUpsellDismissed(true)}
              />
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('dashboard.error', { error })}
                </AlertDescription>
              </Alert>
            )}

            {/* User Statistics */}
            <UserStats
              averageScore={stats?.averageScore || 0}
              totalQuestions={stats?.totalQuestions || 0}
              learningStreak={stats?.learningStreak || 0}
              totalLectures={stats?.totalLectures || 0}
              isLoading={isLoading}
            />

            {/* Main Dashboard Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Continue Learning */}
              <div className="lg:col-span-1">
                <ContinueLearning
                  lastLecture={stats?.lastLecture}
                  isLoading={isLoading}
                />
              </div>

              {/* Daily Learning Chart */}
              <div className="lg:col-span-2">
                <DailyLearningChart
                  data={dailyActivity}
                  isLoading={isLoading}
                />
              </div>

              {/* Recent Results */}
              <div className="lg:col-span-1">
                <RecentResults
                  results={recentResults}
                  isLoading={isLoading}
                />
              </div>

              {/* Popular Courses */}
              <div className="lg:col-span-2">
                <PopularCourses
                  courses={popularCourses}
                  isLoading={isLoading}
                />
              </div>
            </div>

            <UpgradeDialog
              isOpen={isUpgradeDialogOpen}
              onOpenChange={setIsUpgradeDialogOpen}
              onUpgrade={handleUpgradeComplete}
            />
                  </div>
                </div>
              </div>
            </SidebarInset>
          </div>
        </AppSidebarProvider>
      </ProfileCompletionGuard>
    </ProtectedRoute>
  );
}