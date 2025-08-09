'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppLayout } from '@/components/layout/AppLayout';
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
        <AppLayout>
          <div className="space-y-4 sm:space-y-6">
            {/* Upsell Banner for Free Users */}
            {shouldShowUpsell && (
              <UpsellBanner
                onUpgrade={handleUpgrade}
                onDismiss={() => setIsUpsellDismissed(true)}
              />
            )}

            <div className="text-center md:text-left">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent animate-fade-in">
                {t('dashboard.title')}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-muted-foreground mt-2 animate-slide-up">
                {t('dashboard.welcome', { name: user?.name || user?.email })}
              </p>
            </div>

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
        </AppLayout>
      </ProfileCompletionGuard>
    </ProtectedRoute>
  );
}