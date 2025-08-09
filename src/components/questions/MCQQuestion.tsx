
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Question } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { MCQHeader } from './mcq/MCQHeader';
import { MCQOptionItem } from './mcq/MCQOptionItem';
import { MCQExplanation } from './mcq/MCQExplanation';
import { MCQActions } from './mcq/MCQActions';
import { QuestionEditDialog } from './QuestionEditDialog';
import { ReportQuestionDialog } from './ReportQuestionDialog';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProgress } from '@/hooks/use-progress';

import { QuestionMedia } from './QuestionMedia';

interface MCQQuestionProps {
  question: Question;
  onSubmit: (selectedOptionIds: string[], isCorrect: boolean) => void;
  onNext: () => void;
  lectureId?: string;
  isAnswered?: boolean;
  answerResult?: boolean | 'partial';
  userAnswer?: string[];
  hideImmediateResults?: boolean;
}

export function MCQQuestion({ 
  question, 
  onSubmit, 
  onNext, 
  lectureId, 
  isAnswered, 
  answerResult, 
  userAnswer,
  hideImmediateResults = false
}: MCQQuestionProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<string[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if question has been submitted
  const [isSubmitting, setIsSubmitting] = useState(false); // Track if currently submitting
  const hasSubmittedRef = useRef(false); // Ref for immediate access to submission state
  const buttonRef = useRef<HTMLButtonElement>(null); // Ref to directly control button
  const { t } = useTranslation();
  const { trackQuestionProgress } = useProgress();

  // Force reset when question changes (safety net)
  useEffect(() => {
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
    setIsSubmitting(false);
  }, [question.id]);

  // Handle userAnswer changes separately to avoid reinitialization loops
  useEffect(() => {
    if (userAnswer && userAnswer.length > 0) {
      setSelectedOptionIds(userAnswer);
    }
  }, [userAnswer]);

  // Initialize component state based on whether question is already answered
  useEffect(() => {
    
    if (isAnswered && answerResult !== undefined) {
      // Set the previously selected options
      setSelectedOptionIds(userAnswer || []);
      setHasSubmitted(true); // Question has been submitted
      setIsSubmitting(false); // Not currently submitting (already submitted)
      hasSubmittedRef.current = true; // Set ref as well
      
      // For clinical case questions with hidden results, don't set submitted to true
      // This keeps the UI in "answering" mode while still showing the selected options
      if (!hideImmediateResults) {
        setSubmitted(true);
        setIsCorrect(answerResult === true);
        // Auto-expand explanations for answered questions
        const autoExpandIds: string[] = [];
        const correctAnswers = question.correctAnswers || question.correct_answers || [];
        
        // For answered questions, show explanations for all options
        question.options?.forEach((option: any, index: number) => {
          const optionId = option.id || index.toString();
          autoExpandIds.push(optionId);
        });
        
        setExpandedExplanations(autoExpandIds);
      } else {
        // For clinical case questions with hidden results, keep UI in answering mode
        setSubmitted(false);
        setIsCorrect(null);
        setExpandedExplanations([]);
      }
    } else {
      // Don't reset selectedOptionIds if userAnswer exists (preserve selections)
      if (!userAnswer || userAnswer.length === 0) {
        setSelectedOptionIds([]);
      }
      setSubmitted(false);
      setIsCorrect(null);
      setExpandedExplanations([]);
      setHasSubmitted(false); // Question has not been submitted
      setIsSubmitting(false); // Not currently submitting
      hasSubmittedRef.current = false; // Reset ref as well
    }
  }, [question.id, isAnswered, answerResult, question.options, question.correctAnswers, question.correct_answers, hideImmediateResults]);

  // Normalize options to ensure they have the correct format
  const normalizedOptions = useMemo(() => {
    if (!question.options) return [];
    
    return question.options
      .map((option, index) => {
        if (typeof option === 'string') {
          // Convert string option to object format
          return {
            id: index.toString(),
            text: option,
            explanation: undefined
          };
        } else if (option && typeof option === 'object') {
          // Ensure object option has required properties
          return {
            id: option.id || index.toString(),
            text: option.text || '',
            explanation: option.explanation
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{ id: string; text: string; explanation?: string }>;
  }, [question.options]);

  // Get correct answers array from question
  const correctAnswers = question.correctAnswers || question.correct_answers || [];

  // Handle checkbox change
  const handleOptionSelect = (optionId: string) => {
    // Allow re-selection even if submitted (for re-answering)
    setSelectedOptionIds(prev => 
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  // Toggle explanation visibility
  const toggleExplanation = (optionId: string) => {
    setExpandedExplanations(prev =>
      prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  // Reset question state to allow re-answering
  const handleReAnswer = () => {
    setSelectedOptionIds([]);
    setSubmitted(false);
    setIsCorrect(null);
    setExpandedExplanations([]);
    setHasSubmitted(false); // Reset submitted flag
    setIsSubmitting(false); // Reset submitting flag
    hasSubmittedRef.current = false; // Reset ref too
  };

  const handleSubmit = async () => {
    if (selectedOptionIds.length === 0) return;
    if (hasSubmittedRef.current) return; // Prevent double submission
    if (isSubmitting) return; // Prevent double submission during processing
    
    // Mark that this question is being submitted IMMEDIATELY
    hasSubmittedRef.current = true;
    setIsSubmitting(true);
    setHasSubmitted(true);
    
    // For clinical case questions with hidden results, NEVER set submitted to true
    // This keeps the UI in "answering" mode while still tracking the answer
    if (!hideImmediateResults) {
      setSubmitted(true);
    }
    // If hideImmediateResults is true, keep submitted as false to show checkboxes
    
    // Check if answer is completely correct (all correct options selected and no incorrect ones)
    const allCorrectSelected = correctAnswers.every(id => selectedOptionIds.includes(id));
    const noIncorrectSelected = selectedOptionIds.every(id => correctAnswers.includes(id));
    const isAnswerCorrect = allCorrectSelected && noIncorrectSelected;
    setIsCorrect(isAnswerCorrect);
    
    // Auto-expand explanations for incorrect answers and correct answers that weren't selected
    // Only do this if results are not hidden
    if (!hideImmediateResults) {
      const autoExpandIds: string[] = [];
      
      // Add incorrect selections to auto-expand
      selectedOptionIds.forEach(id => {
        if (!correctAnswers.includes(id)) {
          autoExpandIds.push(id);
        }
      });
      
      // Add correct answers that weren't selected to auto-expand
      correctAnswers.forEach(id => {
        if (!selectedOptionIds.includes(id)) {
          autoExpandIds.push(id);
        }
      });
      
      setExpandedExplanations(autoExpandIds);
    }
    
    // Track progress if lectureId is provided
    if (lectureId) {
      trackQuestionProgress(lectureId, question.id, isAnswerCorrect);
    }
    
    onSubmit(selectedOptionIds, isAnswerCorrect);
    // Don't automatically move to next question - let user see the result first
  };

  const handleQuestionUpdated = () => {
    // Reload the page to refresh the question data
    window.location.reload();
  };

  // Add keyboard shortcuts for submitting answer and selecting options
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't process keyboard shortcuts when focus is on input elements
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Number keys 1-5 select options A-E (only if options exist)
      if (!submitted && question.options && ['1', '2', '3', '4', '5'].includes(event.key)) {
        const index = parseInt(event.key) - 1;
        if (index < question.options.length) {
          const optionId = question.options[index].id;
          handleOptionSelect(optionId);
        }
      }
      
      // Spacebar to submit answer or go to next question
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault(); // Prevent page scrolling
        
        if (!submitted && selectedOptionIds.length > 0) {
          handleSubmit();
        } else if (submitted) {
          // If already submitted, move to next question
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [question.options, submitted, selectedOptionIds, onNext]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <MCQHeader 
            questionText={question.text}
            isSubmitted={submitted}
            questionNumber={question.number}
            session={question.session}
          />
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('common.edit')}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsReportDialogOpen(true)}
          >
            <span className="hidden sm:inline">{t('questions.report')}</span>
          </Button>
        </div>
      </div>
      
      {/* Question Media */}
      <QuestionMedia question={question} className="mb-4" />

      <div className="space-y-3">
        {normalizedOptions.map((option, index) => (
          <MCQOptionItem
            key={option.id}
            option={option}
            index={index}
            isSelected={selectedOptionIds.includes(option.id)}
            isSubmitted={submitted}
            isCorrect={correctAnswers.includes(option.id)}
            explanation={option.explanation}
            onSelect={handleOptionSelect}
            expandedExplanations={expandedExplanations}
            toggleExplanation={toggleExplanation}
            hideImmediateResults={hideImmediateResults}
          />
        ))}
      </div>

      {submitted && !hideImmediateResults && (
        <MCQExplanation
          courseReminder={question.course_reminder}
          explanation={question.explanation}
        />
      )}

       <MCQActions 
         isSubmitted={submitted}
         canSubmit={!hasSubmitted && !isSubmitting && selectedOptionIds.length > 0}
         isCorrect={isCorrect}
         onSubmit={handleSubmit}
         onNext={onNext}
         onReAnswer={handleReAnswer}
         hasSubmitted={hasSubmitted || isSubmitting}
         buttonRef={buttonRef}
       />
      
      <QuestionEditDialog
        question={question}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onQuestionUpdated={handleQuestionUpdated}
      />
      
      <ReportQuestionDialog
        question={question}
        lectureId={lectureId!}
        isOpen={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
      />
    </motion.div>
  );
}
