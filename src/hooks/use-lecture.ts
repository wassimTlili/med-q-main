import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/hooks/use-toast';
import { Lecture, Question, ClinicalCase } from '@/types';
import { useLocalStorage } from './use-local-storage';
import { useAuth } from '@/contexts/AuthContext';

// Cache for lecture data to avoid refetching
const lectureCache = new Map<string, { lecture: Lecture; questions: Question[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useLecture(lectureId: string | undefined) {
  const router = useRouter();
  const { user } = useAuth();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  
  const storageKey = `lecture-${lectureId}`;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useLocalStorage<number>(`${storageKey}-currentIndex`, 0);
  const [answers, setAnswers] = useLocalStorage<Record<string, any>>(`${storageKey}-answers`, {});
  const [answerResults, setAnswerResults] = useLocalStorage<Record<string, boolean | 'partial'>>(`${storageKey}-results`, {});
  const [isComplete, setIsComplete] = useLocalStorage<boolean>(`${storageKey}-complete`, false);
  

  
  const [isLoading, setIsLoading] = useState(true);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const hasSyncedProgress = useRef(false);

  // Group clinical case questions and organize all questions properly
  const groupedQuestions = useMemo(() => {
    if (!questions || questions.length === 0) {
      console.log('No questions available, returning empty array');
      return [];
    }
    
    const mcqQuestions: Question[] = [];
    const qrocQuestions: Question[] = [];
    const clinicalCaseMap = new Map<number, Question[]>();

    // Separate questions by type
    questions.forEach(question => {
      if (question.caseNumber && (question.type === 'clinic_mcq' || question.type === 'clinic_croq')) {
        // Clinical case questions
        if (!clinicalCaseMap.has(question.caseNumber)) {
          clinicalCaseMap.set(question.caseNumber, []);
        }
        clinicalCaseMap.get(question.caseNumber)!.push(question);
      } else if (question.type === 'mcq') {
        mcqQuestions.push(question);
      } else {
        // Put ALL other question types (qroc, open, etc.) into qrocQuestions
        qrocQuestions.push(question);
      }
    });

    // Sort each group by their number
    mcqQuestions.sort((a, b) => (a.number || 0) - (b.number || 0));
    qrocQuestions.sort((a, b) => (a.number || 0) - (b.number || 0));

    // Convert clinical case groups to ClinicalCase objects and sort by case number
    const clinicalCases: ClinicalCase[] = [];
    Array.from(clinicalCaseMap.entries())
      .sort(([a], [b]) => a - b) // Sort by case number
      .forEach(([caseNumber, caseQuestions]) => {
        // Sort questions within each case by caseQuestionNumber
        const sortedQuestions = caseQuestions.sort((a, b) => 
          (a.caseQuestionNumber || 0) - (b.caseQuestionNumber || 0)
        );
        
        const clinicalCase: ClinicalCase = {
          caseNumber,
          caseText: sortedQuestions[0]?.caseText || '',
          questions: sortedQuestions,
          totalQuestions: sortedQuestions.length
        };

        clinicalCases.push(clinicalCase);
      });

    // Combine all questions in the correct order: MCQ -> QROC -> Clinical Cases
    const result: (Question | ClinicalCase)[] = [
      ...mcqQuestions,
      ...qrocQuestions,
      ...clinicalCases
    ];

    console.log('Grouped questions result:', {
      totalQuestions: questions.length,
      totalGroupedItems: result.length,
      mcqCount: mcqQuestions.length,
      qrocCount: qrocQuestions.length,
      clinicalCasesCount: clinicalCases.length
    });

    return result;
  }, [questions]);

  const fetchLectureData = useCallback(async () => {
    if (!lectureId) return;
    
    // Check cache first
    const cached = lectureCache.get(lectureId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setLecture(cached.lecture);
      setQuestions(cached.questions);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Single optimized API call to fetch lecture with questions
      const response = await fetch(`/api/lectures/${lectureId}?includeQuestions=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch lecture data');
      }
      
      const data = await response.json();
      
      console.log('Raw API response data:', {
        lectureId,
        hasLecture: !!data,
        lectureTitle: data?.title,
        questionsCount: data?.questions?.length || 0,
        rawQuestions: data?.questions,
        firstQuestionStructure: data?.questions?.[0]
      });
      
      // Cache the data
      lectureCache.set(lectureId, {
        lecture: data,
        questions: data.questions || [],
        timestamp: Date.now()
      });
      
      setLecture(data);
      setQuestions(data.questions || []);
      
      // Reset to first question if current index is out of bounds
      if (data.questions && data.questions.length > 0 && currentQuestionIndex >= data.questions.length) {
        setCurrentQuestionIndex(0);
      }
    } catch (error) {
      console.error('Error fetching lecture data:', error);
      toast({
        title: "Error",
        description: "Failed to load lecture information. Please try again.",
        variant: "destructive",
      });
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [lectureId, router]);

  useEffect(() => {
    fetchLectureData();
    // Reset sync flag when lecture changes
    hasSyncedProgress.current = false;
  }, [fetchLectureData]);

  // Clear cache when adding questions
  useEffect(() => {
    if (isAddQuestionOpen) {
      lectureCache.delete(lectureId!);
    }
  }, [isAddQuestionOpen, lectureId]);

  const handleAnswerSubmit = useCallback((questionId: string, answer: any, isCorrect?: boolean | 'partial') => {
    setAnswers((prevAnswers: Record<string, any>) => ({
      ...prevAnswers,
      [questionId]: answer
    }));
    
    if (isCorrect !== undefined) {
      setAnswerResults((prevResults: Record<string, boolean | 'partial'>) => ({
        ...prevResults,
        [questionId]: isCorrect
      }));
    }
  }, []);

  // Handle clinical case submission
  const handleClinicalCaseSubmit = useCallback((caseNumber: number, caseAnswers: Record<string, any>, caseResults: Record<string, boolean | 'partial'>) => {
    // Store all answers for the clinical case
    setAnswers((prevAnswers: Record<string, any>) => ({
      ...prevAnswers,
      ...caseAnswers
    }));
    
    // Store all results for the clinical case
    setAnswerResults((prevResults: Record<string, boolean | 'partial'>) => ({
      ...prevResults,
      ...caseResults
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < groupedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setIsComplete(true);
    }
  }, [currentQuestionIndex, groupedQuestions.length, setCurrentQuestionIndex]);

  const handleRestart = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setAnswerResults({});
    setIsComplete(false);
    hasSyncedProgress.current = false; // Reset sync flag for restart
  }, [setCurrentQuestionIndex]);

  const handleBackToSpecialty = useCallback(() => {
    if (lecture && lecture.specialtyId) {
      router.push(`/specialty/${lecture.specialtyId}`);
    } else {
      router.push('/dashboard');
    }
  }, [lecture, router]);

  const clearSessionData = useCallback(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setAnswerResults({});
    setIsComplete(false);
  }, [setCurrentQuestionIndex]);

  const currentQuestion = useMemo(() => {
    const question = groupedQuestions[currentQuestionIndex];
    console.log('Current question:', {
      currentQuestionIndex,
      hasQuestion: !!question,
      questionType: question ? ('type' in question ? question.type : 'clinical') : 'unknown'
    });
    return question;
  }, [groupedQuestions, currentQuestionIndex]);
  
  const progress = useMemo(() => {
    // Calculate total number of individual questions (including those in clinical cases)
    let totalQuestions = 0;
    groupedQuestions.forEach(item => {
      if ('questions' in item && Array.isArray(item.questions)) {
        // Clinical case - count all questions within it
        totalQuestions += item.questions.length;
      } else {
        // Regular question
        totalQuestions += 1;
      }
    });

    if (totalQuestions === 0) return 0;
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / totalQuestions) * 100;
  }, [groupedQuestions, answers]);

  return {
    lecture,
    questions: groupedQuestions, // Return grouped questions instead of raw questions
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    answerResults,
    isLoading,
    isComplete,
    isAddQuestionOpen,
    setIsAddQuestionOpen,
    currentQuestion,
    progress,
    handleAnswerSubmit,
    handleClinicalCaseSubmit, // New handler for clinical cases
    handleNext,
    handleRestart,
    handleBackToSpecialty,
    clearSessionData,
    refetch: fetchLectureData
  };
}
