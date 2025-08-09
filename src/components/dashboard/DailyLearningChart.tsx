'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DailyLearningChartProps {
  data: Array<{
    date: string;
    questions: number;
  }>;
  isLoading?: boolean;
}

export function DailyLearningChart({ data, isLoading = false }: DailyLearningChartProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg">
        <CardHeader>
          <div className="h-6 w-48 bg-muted/60 rounded-lg animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full bg-muted/60 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // Generate sample data if no real data is available
  const chartData = data && data.length > 0 ? data : [
    { date: '2024-01-01', questions: 5 },
    { date: '2024-01-02', questions: 8 },
    { date: '2024-01-03', questions: 3 },
    { date: '2024-01-04', questions: 12 },
    { date: '2024-01-05', questions: 7 },
    { date: '2024-01-06', questions: 9 },
    { date: '2024-01-07', questions: 6 }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-muted/95 border border-border/50 rounded-xl p-3 shadow-lg backdrop-blur-sm">
          <p className="font-medium text-foreground">{formatDate(label)}</p>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.chart.questionsAnswered')}: <span className="font-medium text-purple-600 dark:text-purple-400">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-800 dark:from-purple-400 dark:to-purple-600 bg-clip-text text-transparent">
          <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          {t('dashboard.chart.dailyActivity')}
          {(!data || data.length === 0) && (
            <span className="text-sm text-muted-foreground bg-gradient-to-r from-muted-foreground to-muted-foreground bg-clip-text">(Données d'exemple)</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[300px] flex items-center justify-center">
          {isClient && (
            <BarChart width={600} height={280} data={chartData}>
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="questions" 
                fill="url(#purpleGradient)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </BarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 