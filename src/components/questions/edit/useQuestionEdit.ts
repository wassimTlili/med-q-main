
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Question } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface UseQuestionEditProps {
  questionId?: string;
  question?: Question | null;
  onSave?: () => void;
  onOpenChange?: (open: boolean) => void;
  onQuestionUpdated?: () => void;
}

export function useQuestionEdit({ 
  questionId, 
  question: propQuestion, 
  onSave, 
  onOpenChange,
  onQuestionUpdated 
}: UseQuestionEditProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [question, setQuestion] = useState<Question | null>(propQuestion || null);
  const [isLoading, setIsLoading] = useState(!propQuestion);
  const [isSaving, setIsSaving] = useState(false);

  // State for editing
  const [questionText, setQuestionText] = useState(propQuestion?.text || '');
  const [courseReminder, setCourseReminder] = useState(propQuestion?.course_reminder || (propQuestion as any)?.courseReminder || '');
  const [questionNumber, setQuestionNumber] = useState<number | undefined>(propQuestion?.number);
  const [session, setSession] = useState(propQuestion?.session || '');
  const [options, setOptions] = useState(
    propQuestion?.options?.map((opt: any, index: number) => {
      if (typeof opt === 'string') {
        return { id: index.toString(), text: opt, explanation: '' };
      }
      return {
        id: opt.id || index.toString(),
        text: opt.text || '',
        explanation: opt.explanation || ''
      };
    }) || []
  );
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(
    propQuestion?.correctAnswers || propQuestion?.correct_answers || []
  );
  const [mediaUrl, setMediaUrl] = useState(propQuestion?.media_url || '');
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(
    propQuestion?.media_url ? (propQuestion.media_url.includes('image') ? 'image' : 'video') : undefined
  );
  const [reminderMediaUrl, setReminderMediaUrl] = useState(propQuestion?.course_reminder_media_url || '');
  const [reminderMediaType, setReminderMediaType] = useState<'image' | 'video' | undefined>(
    propQuestion?.course_reminder_media_url ? 'image' : undefined
  );

  useEffect(() => {
    if (questionId && !propQuestion) {
      fetchQuestion();
    }
  }, [questionId, propQuestion]);

  useEffect(() => {
    if (propQuestion) {
      setQuestion(propQuestion);
      setQuestionText(propQuestion.text || '');
  setCourseReminder(propQuestion.course_reminder || (propQuestion as any).courseReminder || '');
      setQuestionNumber(propQuestion.number);
      setSession(propQuestion.session || '');
      setOptions(
        propQuestion.options?.map((opt: any, index: number) => {
          if (typeof opt === 'string') {
            return { id: index.toString(), text: opt, explanation: '' };
          }
          return {
            id: opt.id || index.toString(),
            text: opt.text || '',
            explanation: opt.explanation || ''
          };
        }) || []
      );
      setCorrectAnswers(
        propQuestion.correctAnswers || propQuestion.correct_answers || []
      );
      setMediaUrl(propQuestion.media_url || '');
      setMediaType(
        propQuestion.media_url ? (propQuestion.media_url.includes('image') ? 'image' : 'video') : undefined
      );
  setReminderMediaUrl(propQuestion.course_reminder_media_url || '');
  setReminderMediaType(propQuestion.course_reminder_media_url ? 'image' : undefined);
      setIsLoading(false);
    }
  }, [propQuestion]);

  const fetchQuestion = async () => {
    if (!questionId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/questions/${questionId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      
      const data = await response.json();
      setQuestion(data);
      setQuestionText(data.text || '');
  setCourseReminder(data.course_reminder || data.courseReminder || '');
      setQuestionNumber(data.number);
      setSession(data.session || '');
      setOptions(
        data.options?.map((opt: any, index: number) => {
          if (typeof opt === 'string') {
            return { id: index.toString(), text: opt, explanation: '' };
          }
          return {
            id: opt.id || index.toString(),
            text: opt.text || '',
            explanation: opt.explanation || ''
          };
        }) || []
      );
      setCorrectAnswers(
        data.correctAnswers || data.correct_answers || []
      );
      setMediaUrl(data.media_url || '');
      setMediaType(
        data.media_url ? (data.media_url.includes('image') ? 'image' : 'video') : undefined
      );
  setReminderMediaUrl(data.course_reminder_media_url || '');
  setReminderMediaType(data.course_reminder_media_url ? 'image' : undefined);
    } catch (error) {
      console.error('Error fetching question:', error);
      toast({
        title: t('common.error'),
        description: t('common.tryAgain'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuestion = async (updatedQuestion: Partial<Question>) => {
    if (!user) {
      toast({
        title: t('auth.notAuthenticated'),
        description: t('auth.pleaseSignIn'),
        variant: "destructive",
      });
      return;
    }

    const questionIdToUse = questionId || question?.id;
    if (!questionIdToUse) {
      toast({
        title: t('common.error'),
        description: 'No question ID available',
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch(`/api/questions/${questionIdToUse}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updatedQuestion),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update question');
      }
      
      const data = await response.json();
      setQuestion(data);
      
      toast({
        title: t('common.success'),
        description: t('questions.updatedSuccessfully'),
      });
      
      onSave?.();
      onQuestionUpdated?.();
      onOpenChange?.(false);
    } catch (error: any) {
      console.error('Error updating question:', error);
      let errorMessage = t('common.tryAgain');
      
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateOptionText = (id: string, text: string) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  const updateOptionExplanation = (id: string, explanation: string) => {
    setOptions(prev => prev.map(opt => opt.id === id ? { ...opt, explanation } : opt));
  };

  const toggleCorrectAnswer = (id: string) => {
    setCorrectAnswers(prev => 
      prev.includes(id) 
        ? prev.filter(answerId => answerId !== id)
        : [...prev, id]
    );
  };

  const handleMediaChange = (url: string | undefined, type: 'image' | 'video' | undefined) => {
    setMediaUrl(url || '');
    setMediaType(type);
  };
  const handleReminderMediaChange = (url: string | undefined, type: 'image' | 'video' | undefined) => {
    setReminderMediaUrl(url || '');
    setReminderMediaType(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question) return;

    const updatedQuestion: Partial<Question> & any = {
      text: questionText,
      // Use camelCase to match API route expectations
      courseReminder: courseReminder,
      number: questionNumber,
      session,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      courseReminderMediaUrl: reminderMediaUrl,
      courseReminderMediaType: reminderMediaType,
      options: question.type === 'mcq' ? options.map(opt => ({
        id: opt.id,
        text: opt.text,
        explanation: opt.explanation
      })) : undefined,
      // Use camelCase to match API route
      correctAnswers: (question.type === 'mcq' || question.type === 'clinic_mcq' || question.type === 'qroc' || question.type === 'clinic_croq') ? correctAnswers : undefined
    };

    await saveQuestion(updatedQuestion);
  };

  return {
    question,
    isLoading,
    isSaving,
    questionText,
    setQuestionText,
    courseReminder,
    setCourseReminder,
    questionNumber,
    setQuestionNumber,
    session,
    setSession,
    options,
    correctAnswers,
    mediaUrl,
    mediaType,
  reminderMediaUrl,
  reminderMediaType,
    handleMediaChange,
  handleReminderMediaChange,
    updateOptionText,
    updateOptionExplanation,
    toggleCorrectAnswer,
    handleSubmit,
    saveQuestion,
    fetchQuestion,
  setCorrectAnswers,
  };
}
