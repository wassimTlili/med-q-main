'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Play, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';

interface ContinueLearningProps {
  lastLecture?: {
    id: string;
    title: string;
    specialty: {
      name: string;
    };
    progress: number;
    totalQuestions: number;
    completedQuestions: number;
    lastAccessed: string;
  };
  isLoading?: boolean;
}

export function ContinueLearning({ lastLecture, isLoading = false }: ContinueLearningProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="h-6 w-48 bg-muted/60 rounded-lg animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-4 w-32 bg-muted/60 rounded-lg animate-pulse" />
          <div className="h-2 w-full bg-muted/60 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-muted/60 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!lastLecture) {
    return (
      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
            <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            {t('dashboard.continueLearning.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="h-10 w-10 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-muted-foreground mb-4">
              {t('dashboard.continueLearning.noProgress')}
            </p>
            <Link href="/specialty">
              <Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200">
                <Play className="h-4 w-4 mr-2" />
                {t('dashboard.continueLearning.startLearning')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return t('dashboard.continueLearning.yesterday');
    } else if (diffDays < 7) {
      return t('dashboard.continueLearning.daysAgo', { days: diffDays });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
          <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          {t('dashboard.continueLearning.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">{lastLecture.title}</h3>
          <Badge variant="secondary" className="mt-1 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700">
            {lastLecture.specialty.name}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('dashboard.continueLearning.progress')}</span>
            <span className="font-medium">{lastLecture.completedQuestions}/{lastLecture.totalQuestions}</span>
          </div>
          <Progress value={lastLecture.progress} className="h-3 bg-muted/50" />
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gradient-to-r from-muted/30 to-muted/10 rounded-lg p-3">
          <Clock className="h-4 w-4 text-purple-500" />
          <span>{t('dashboard.continueLearning.lastAccessed')}: {formatDate(lastLecture.lastAccessed)}</span>
        </div>

        <Link href={`/lecture/${lastLecture.id}`}>
          <Button className="w-full mt-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-200 group-hover:scale-105">
            <Play className="h-4 w-4 mr-2" />
            {t('dashboard.continueLearning.continue')}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
} 