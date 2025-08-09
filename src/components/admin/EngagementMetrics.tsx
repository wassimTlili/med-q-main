import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EngagementMetricsProps {
  totalProgressEntries: number;
  recentProgressEntries: number;
  averageCompletionRate: number;
  usersThisWeek: number;
  questionsThisWeek: number;
  lecturesThisWeek: number;
  reportsThisWeek: number;
}

export function EngagementMetrics({
  totalProgressEntries,
  recentProgressEntries,
  averageCompletionRate,
  usersThisWeek,
  questionsThisWeek,
  lecturesThisWeek,
  reportsThisWeek
}: EngagementMetricsProps) {
  const { t } = useTranslation();

  const metrics = [
    {
      title: t('admin.completionRate'),
      value: `${averageCompletionRate}%`,
      description: t('admin.completionRateDesc'),
      icon: Target,
      color: 'text-green-500',
      bgColor: 'from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20',
      progress: averageCompletionRate
    },
    {
      title: t('admin.totalProgress'),
      value: totalProgressEntries.toLocaleString(),
      description: t('admin.totalProgressDesc'),
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20',
      progress: null
    },
    {
      title: t('admin.recentActivity'),
      value: recentProgressEntries.toLocaleString(),
      description: t('admin.recentActivityDesc'),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20',
      progress: null
    }
  ];

  const weeklyStats = [
    {
      label: t('admin.newUsers'),
      value: usersThisWeek,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20'
    },
    {
      label: t('admin.newQuestions'),
      value: questionsThisWeek,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20'
    },
    {
      label: t('admin.newLectures'),
      value: lecturesThisWeek,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20'
    },
    {
      label: t('admin.newReports'),
      value: reportsThisWeek,
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20'
    }
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-0 bg-card shadow-md">
            <CardHeader className="text-center pb-4">
              <div className={`mx-auto w-18 h-18 bg-gradient-to-br ${metric.bgColor} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <metric.icon className={`w-9 h-9 ${metric.color}`} />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">{metric.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-foreground mb-2">{metric.value}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {metric.description}
              </p>
              {metric.progress !== null && (
                <div className="mt-4">
                  <Progress value={metric.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {metric.progress}% {t('admin.complete')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Activity */}
      <Card className="border-0 shadow-lg bg-card hover:shadow-xl transition-all duration-300">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground mb-2">{t('admin.weeklyActivity')}</CardTitle>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('admin.weeklyActivityDesc')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {weeklyStats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${stat.bgColor} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 