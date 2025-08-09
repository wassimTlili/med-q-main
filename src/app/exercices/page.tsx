'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Specialty } from '@/types';
import { toast } from '@/hooks/use-toast';
import { AddSpecialtyDialog } from '@/components/specialties/AddSpecialtyDialog';
import { SpecialtiesList } from '@/components/specialties/SpecialtiesList';
import { UpsellBanner } from '@/components/subscription/UpsellBanner';
import { UpgradeDialog } from '@/components/subscription/UpgradeDialog';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Disable static generation to prevent SSR issues with useAuth
export const dynamic = 'force-dynamic';

// Cache for specialties data
let specialtiesCache: Specialty[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function ExercicesPage() {
  const { user, isAdmin } = useAuth();
  const { hasActiveSubscription } = useSubscription();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [isUpsellDismissed, setIsUpsellDismissed] = useState(false);
  const { t } = useTranslation();

  const fetchSpecialties = useCallback(async (forceRefresh = false) => {
    try {
      // Check cache first
      const now = Date.now();
      if (!forceRefresh && specialtiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
        setSpecialties(specialtiesCache);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await fetch('/api/specialties', {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch specialties');
      }

      const data = await response.json();
      setSpecialties(data || []);
      
      // Update cache
      specialtiesCache = data || [];
      cacheTimestamp = now;
    } catch (error) {
      console.error('Error fetching specialties:', error);
      toast({
        title: t('common.error'),
        description: t('common.tryAgain'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      fetchSpecialties();
    }
  }, [user, fetchSpecialties]);

  const handleAddSpecialty = useCallback(async (name: string, description: string) => {
    try {
      const response = await fetch('/api/specialties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to create specialty');
      }

      const newSpecialty = await response.json();
      setSpecialties(prev => [...prev, newSpecialty]);
      setIsAddDialogOpen(false);
      
      // Invalidate cache
      specialtiesCache = null;
      
      toast({
        title: t('specialties.created'),
        description: t('specialties.createdSuccess'),
      });
    } catch (error) {
      console.error('Error creating specialty:', error);
      toast({
        title: t('common.error'),
        description: t('common.tryAgain'),
        variant: "destructive",
      });
    }
  }, [t]);

  // Memoize the specialties list to prevent unnecessary re-renders
  const memoizedSpecialties = useMemo(() => specialties, [specialties]);

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
      <AppLayout>
        <div className="space-y-6">
          {/* Upsell Banner for Free Users */}
          {shouldShowUpsell && (
            <UpsellBanner
              onUpgrade={handleUpgrade}
              onDismiss={() => setIsUpsellDismissed(true)}
            />
          )}

          <div className="flex items-center justify-between">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent animate-fade-in">
                Exercices
              </h1>
              <p className="text-muted-foreground text-lg mt-2 animate-slide-up">
                {t('dashboard.welcome', { name: user?.name || user?.email })}
              </p>
            </div>
            {isAdmin && (
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200"
              >
                {t('specialties.add')}
              </Button>
            )}
          </div>

          <SpecialtiesList 
            specialties={memoizedSpecialties} 
            isLoading={isLoading} 
          />

          <AddSpecialtyDialog
            isOpen={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSpecialtyAdded={() => fetchSpecialties(true)}
          />

          <UpgradeDialog
            isOpen={isUpgradeDialogOpen}
            onOpenChange={setIsUpgradeDialogOpen}
            onUpgrade={handleUpgradeComplete}
          />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
} 