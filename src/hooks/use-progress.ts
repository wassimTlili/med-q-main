import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useProgress() {
  const { user } = useAuth();

  const trackQuestionProgress = useCallback((
    lectureId: string, 
    questionId: string, 
    isCorrect: boolean | 'partial',
    score?: number
  ) => {
    if (!user) return;

    // Convert the result to a numeric score for database storage
    let numericScore: number;
    if (isCorrect === true) {
      numericScore = score || 1;
    } else if (isCorrect === 'partial') {
      numericScore = 0.5; // Use 0.5 to represent partial correctness
    } else {
      numericScore = 0;
    }

    // Fire and forget - don't block the UI
    fetch('/api/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lectureId,
        questionId,
        completed: true,
        score: numericScore
      }),
    }).catch(error => {
      console.error('Error tracking progress:', error);
    });
  }, [user]);

  const trackLectureProgress = useCallback((
    lectureId: string,
    completed: boolean = true
  ) => {
    if (!user) return;

    // Fire and forget - don't block the UI
    fetch('/api/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lectureId,
        completed
      }),
    }).catch(error => {
      console.error('Error tracking lecture progress:', error);
    });
  }, [user]);

  const getProgress = useCallback(async (lectureId?: string, specialtyId?: string) => {
    if (!user) return null;

    try {
      const params = new URLSearchParams();
      if (lectureId) params.append('lectureId', lectureId);
      if (specialtyId) params.append('specialtyId', specialtyId);

      const response = await fetch(`/api/progress?${params.toString()}`);
      if (response.ok) {
        const progressData = await response.json();
        
        // Convert numeric scores back to boolean/partial format
        return progressData.map((item: any) => ({
          ...item,
          result: item.score === 1 ? true : item.score === 0.5 ? 'partial' : false
        }));
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
    return null;
  }, [user]);

  // Helper function to convert numeric score to result format
  const convertScoreToResult = useCallback((score: number | null): boolean | 'partial' | false => {
    if (score === null || score === undefined) return false;
    if (score === 1) return true;
    if (score === 0.5) return 'partial';
    return false;
  }, []);

  return {
    trackQuestionProgress,
    trackLectureProgress,
    getProgress,
    convertScoreToResult
  };
} 