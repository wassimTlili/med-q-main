
import { useState, useEffect } from 'react';
import { QuestionType, Option } from '@/types';
import { toast } from '@/hooks/use-toast';

interface UseQuestionFormProps {
  lectureId: string;
  editQuestionId?: string;
  onComplete?: () => void;
}

export function useQuestionForm({ lectureId, editQuestionId, onComplete }: UseQuestionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [questionText, setQuestionText] = useState('');
  const [courseReminder, setCourseReminder] = useState('');
  const [questionNumber, setQuestionNumber] = useState<number | undefined>(undefined);
  const [session, setSession] = useState('');
  const [options, setOptions] = useState<Option[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(undefined);

  useEffect(() => {
    if (editQuestionId) {
      fetchQuestionData();
    }
  }, [editQuestionId]);

  const fetchQuestionData = async () => {
    try {
      const response = await fetch(`/api/questions/${editQuestionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      
      const data = await response.json();
      
      if (data) {
        setQuestionType(data.type);
        setQuestionText(data.text);
        setCourseReminder(data.courseReminder || data.explanation || '');
        setQuestionNumber(data.number);
        setSession(data.session || '');
        setMediaUrl(data.mediaUrl);
        setMediaType(data.mediaType);
        
        if (data.type === 'mcq' && data.options) {
          setOptions(data.options);
          setCorrectAnswers(data.correctAnswers || []);
        }
      }
    } catch (error) {
      console.error('Error fetching question:', error);
      toast({
        title: "Error loading question",
        description: "Failed to load question data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleParsedContent = (
    parsedQuestionText: string, 
    parsedOptions: Option[]
  ) => {
    setQuestionText(parsedQuestionText);
    if (parsedOptions.length >= 2) {
      if (options.length === parsedOptions.length) {
        const updatedOptions = options.map((option, index) => ({
          ...option,
          text: parsedOptions[index].text,
          explanation: parsedOptions[index].explanation || option.explanation
        }));
        setOptions(updatedOptions);
      } else {
        setOptions(parsedOptions);
      }
    }
  };

  const handleMediaChange = (url: string | undefined, type: 'image' | 'video' | undefined) => {
    setMediaUrl(url);
    setMediaType(type);
  };

  return {
    isLoading,
    setIsLoading,
    questionType,
    setQuestionType,
    questionText,
    setQuestionText,
    courseReminder,
    setCourseReminder,
    questionNumber,
    setQuestionNumber,
    session,
    setSession,
    options,
    setOptions,
    correctAnswers,
    setCorrectAnswers,
    mediaUrl,
    mediaType,
    handleMediaChange,
    handleParsedContent,
    fetchQuestionData
  };
}
