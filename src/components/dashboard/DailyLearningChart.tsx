'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ActivityPoint { date: string; questions: number }
interface DailyLearningChartProps {
  data?: ActivityPoint[]; // optional external data
  isLoading?: boolean;    // external loading flag (optional)
  streak?: number;
}

const DAY_WINDOWS = [7,14,30];

export function DailyLearningChart({ data, isLoading: extLoading = false, streak }: DailyLearningChartProps) {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [days, setDays] = useState<number>(() => (typeof window !== 'undefined' ? parseInt(localStorage.getItem('daily_activity_days')||'7',10) : 7));
  const [localData, setLocalData] = useState<ActivityPoint[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [debug, setDebug] = useState(false);
  const [meta, setMeta] = useState<any>(null);
  const [lastOptimisticTs, setLastOptimisticTs] = useState<number>(0);

  const effectiveData = (data && data.length>0 ? data : localData) || [];
  const isLoading = extLoading || loading;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    // If external data provided and non-empty, don't self-fetch
    if (data && data.length>0) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true); setError(null);
      try {
        const url = `/api/dashboard/daily-activity?days=${days}${debug ? '&debug=1':''}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (Array.isArray(json)) {
          setLocalData(json as ActivityPoint[]);
          setMeta(null);
        } else {
          setLocalData((json.dailyData || []) as ActivityPoint[]);
          setMeta({ source: json.source, counts: { activity: json.activityEventsCount, question: json.questionDataCount, progress: json.progressDataCount }, window: json.windowDays });
        }
      } catch (e:any) {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Failed');
        setLocalData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Listen for new attempts to refresh quickly
    const onAttempt = () => fetchData();
    window.addEventListener('activity-attempt', onAttempt);
    return () => { controller.abort(); window.removeEventListener('activity-attempt', onAttempt); };
  }, [days, isClient, data, debug]);

  useEffect(()=>{ if(isClient) localStorage.setItem('daily_activity_days', String(days)); },[days,isClient]);

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

  // Always show the dataset even if all zeros so user sees timeframe structure
  const chartData = effectiveData;
  const nonZero = chartData.filter(d=>d.questions>0).length;
  const allZero = chartData.length>0 && nonZero===0;

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
            {t('dashboard.chart.questionsAnswered')}: <span className="font-medium text-blue-600 dark:text-blue-400">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleManualRefresh = () => setLastOptimisticTs(Date.now());

  // Optimistic bump: if last attempt within 10s, increment today bar locally (in case backend logging slightly delayed)
  const todayKey = new Date(Date.now() - new Date().getTimezoneOffset()*60000).toISOString().split('T')[0];
  const optimisticData = effectiveData.map(d => d.date===todayKey && (Date.now()-lastOptimisticTs)<10000 ? { ...d, questions: d.questions + 1 } : d);

  return (
    <Card className="border-border/50 bg-white/50 dark:bg-muted/30 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-800 dark:from-blue-400 dark:to-blue-600 bg-clip-text text-transparent">
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          {t('dashboard.chart.dailyActivity')}
          {typeof streak === 'number' && streak > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-600/10 dark:bg-blue-400/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 border border-blue-600/20 dark:border-blue-400/20">
              <span>🔥</span>
              {streak}j
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-1 mt-2">
          {DAY_WINDOWS.map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${days===d ? 'bg-blue-600 text-white border-blue-600 shadow-sm':'bg-transparent dark:text-slate-300 border-border/40 hover:bg-blue-500/10'}`}
              disabled={loading}
            >{d}j</button>
          ))}
          <button
            onClick={()=>setDebug(v=>!v)}
            className={`ml-1 px-2 py-0.5 rounded text-[11px] font-medium border border-border/40 ${debug ? 'bg-amber-500/20 text-amber-400 border-amber-500/40':'text-slate-400 hover:bg-amber-500/10'}`}
            title="Basculer mode debug"
          >{debug ? 'dbg':'bug'}</button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[280px]">
          {error && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400">
              <span>Erreur chargement activité: {error}</span>
              <a href={`/api/dashboard/daily-activity?days=${days}&debug=1`} target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline text-xs">Debug API</a>
            </div>
          )}
          {/* Real dynamic chart using actual data */}
          {isClient && !error && (
            <div className="h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={optimisticData}>
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
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="questions"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    minPointSize={2}
                  >
                    {optimisticData.map(entry => (
                      <Cell key={entry.date} fill={entry.questions===0 ? 'rgba(59,130,246,0.3)' : '#3b82f6'} />
                    ))}
                    <LabelList dataKey="questions" position="top" className="fill-current" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Data info overlay */}
              <div className="absolute bottom-2 left-2 text-xs text-slate-400 bg-black/20 px-2 py-1 rounded">
                {effectiveData.length} jours • Total: {optimisticData.reduce((a,b)=>a+b.questions,0)} questions
              </div>
            </div>
          )}
      {debug && meta && (
            <div className="absolute top-2 right-2 text-[10px] text-slate-400 space-y-0.5 bg-black/30 px-2 py-1 rounded border border-white/10">
              <div>src: {meta.source}</div>
              <div>w:{meta.window}</div>
              <div>a:{meta.counts.activity} q:{meta.counts.question} p:{meta.counts.progress}</div>
        <button onClick={handleManualRefresh} className="mt-1 w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded px-1 py-0.5">+1 opti</button>
            </div>
          )}
          {debug && chartData.length > 0 && (
            <pre className="absolute bottom-2 left-2 max-h-24 overflow-auto text-[10px] leading-snug bg-black/30 p-2 rounded border border-white/10 text-slate-300">{JSON.stringify(chartData, null, 2)}</pre>
          )}
        </div>
      </CardContent>
    </Card>
  );
}