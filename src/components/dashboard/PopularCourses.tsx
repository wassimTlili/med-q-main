'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Users, Star } from 'lucide-react';
import Link from 'next/link';

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

interface PopularCoursesProps {
  courses: PopularCourse[];
  isLoading?: boolean;
}

export function PopularCourses({ courses, isLoading = false }: PopularCoursesProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('dashboard.popularCourses.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {t('dashboard.popularCourses.noCourses')}
            </p>
          </div>
        ) : (
          courses.map((course, index) => (
            <div key={course.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <h3 className="font-semibold text-sm">{course.title}</h3>
                  {course.isFree && (
                    <Badge variant="secondary" className="text-xs">
                      {t('dashboard.popularCourses.free')}
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-xs mb-2">
                  {course.specialty.name}
                </Badge>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{course.studentCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span>{course.averageScore.toFixed(1)}%</span>
                  </div>
                  <span>{course.questionCount} {t('dashboard.popularCourses.questions')}</span>
                </div>
              </div>
              <Link href={`/lecture/${course.id}`}>
                <Button size="sm" variant="outline">
                  {t('dashboard.popularCourses.start')}
                </Button>
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
} 