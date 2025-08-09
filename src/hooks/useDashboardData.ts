import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  averageScore: number;
  totalQuestions: number;
  completedQuestions: number;
  learningStreak: number;
  totalLectures: number;
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
}

interface DailyActivity {
  date: string;
  questions: number;
}

interface RecentResult {
  id: string;
  lectureTitle: string;
  specialtyName: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  isImprovement?: boolean;
}

interface PopularCourse {
  id: string;
  title: string;
  specialty: {
    name: string;
  };
  questionCount: number;
  studentCount: number;
  averageScore: number;
  isFree: boolean;
}

interface DashboardData {
  stats: DashboardStats | null;
  dailyActivity: DailyActivity[];
  recentResults: RecentResult[];
  popularCourses: PopularCourse[];
  isLoading: boolean;
  error: string | null;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData>({
    stats: null,
    dailyActivity: [],
    recentResults: [],
    popularCourses: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!user) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch all data in parallel
        const [statsRes, dailyRes, resultsRes, coursesRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/daily-activity'),
          fetch('/api/dashboard/recent-results'),
          fetch('/api/dashboard/popular-courses')
        ]);

        // Check if all requests were successful
        if (!statsRes.ok || !dailyRes.ok || !resultsRes.ok || !coursesRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        // Parse responses
        const [stats, dailyActivity, recentResults, popularCourses] = await Promise.all([
          statsRes.json(),
          dailyRes.json(),
          resultsRes.json(),
          coursesRes.json()
        ]);

        setData({
          stats,
          dailyActivity,
          recentResults,
          popularCourses,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred'
        }));
      }
    };

    fetchDashboardData();
  }, [user]);

  return data;
} 