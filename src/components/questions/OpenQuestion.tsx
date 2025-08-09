
import { useState, useEffect, useCallback, useRef } from 'react';
import { Question } from '@/types';
import { motion } from 'framer-motion';
import { OpenQuestionHeader } from './open/OpenQuestionHeader';
import { OpenQuestionInput } from './open/OpenQuestionInput';
import { OpenQuestionExplanation } from './open/OpenQuestionExplanation';
import { OpenQuestionSelfAssessment } from './open/OpenQuestionSelfAssessment';
import { OpenQuestionActions } from './open/OpenQuestionActions';
import { QuestionEditDialog } from './QuestionEditDialog';
import { ReportQuestionDialog } from './ReportQuestionDialog';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProgress } from '@/hooks/use-progress';

import { QuestionMedia } from './QuestionMedia';

interface OpenQuestionProps {
  question: Question;
  onSubmit: (answer: string, resultValue: boolean | 'partial') => void;
  onNext: () => void;
  lectureId?: string;
  isAnswered?: boolean;
  answerResult?: boolean | 'partial';
  userAnswer?: string;
  hideImmediateResults?: boolean;
  showDeferredSelfAssessment?: boolean; // Show self-assessment after results are revealed
  onSelfAssessmentUpdate?: (questionId: string, result: boolean | 'partial') => void; // Update result after self-assessment
}

export function OpenQuestion({ 
  question, 
  onSubmit, 
  onNext, 
  lectureId, 
  isAnswered, 
  answerResult, 
  userAnswer,
  hideImmediateResults = false,
  showDeferredSelfAssessment = false,
  onSelfAssessmentUpdate
}: OpenQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if question has been submitted
  const [deferredAssessmentResult, setDeferredAssessmentResult] = useState<boolean | 'partial' | null>(null); // Track deferred self-assessment
  const hasSubmittedRef = useRef(false); // Immediate synchronous access to submission state
  const { t } = useTranslation();
  const { trackQuestionProgress } = useProgress();

  // Force reset when question changes (safety net)
  useEffect(() => {
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
  }, [question.id]);

  // Handle userAnswer changes separately to avoid reinitialization loops
  useEffect(() => {
    if (userAnswer) {
      setAnswer(userAnswer);
    }
  }, [userAnswer]);



  // Initialize component state based on whether question is already answered
  useEffect(() => {
    if (isAnswered && answerResult !== undefined) {
      setAnswer(userAnswer || '');
      setSubmitted(true);
      setHasSubmitted(true); // Question has been submitted
      hasSubmittedRef.current = true; // Also set ref for answered questions
      
      // For deferred self-assessment, don't mark as completed and show self-assessment
      if (showDeferredSelfAssessment) {
        setAssessmentCompleted(false);
        setShowSelfAssessment(true);
      } else {
        setAssessmentCompleted(true);
        setShowSelfAssessment(false);
      }
    } else {
      if (!userAnswer) {
        setAnswer('');
      }
      setSubmitted(false);
      setShowSelfAssessment(false);
      setAssessmentCompleted(false);
      setHasSubmitted(false); // Question has not been submitted
      hasSubmittedRef.current = false; // Reset ref as well
    }
  }, [question.id, isAnswered, answerResult, showDeferredSelfAssessment, userAnswer]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    if (hasSubmittedRef.current) return; // Prevent double submission with immediate synchronous check
    
    // Mark that this question is being submitted IMMEDIATELY
    hasSubmittedRef.current = true;
    setSubmitted(true);
    setHasSubmitted(true);
    
    // For clinical case questions (hideImmediateResults = true), 
    // call onSubmit immediately with a default result since self-assessment is hidden
    if (hideImmediateResults) {
      setAssessmentCompleted(true);
      // Call onSubmit immediately with answer and a placeholder result
      // The actual result will be determined when "Show Results" is clicked
      onSubmit(answer, 'partial'); // Use 'partial' as default for clinic questions
    } else {
      // For regular questions, show self-assessment
      setShowSelfAssessment(true);
    }
  };

  const handleSelfAssessment = async (rating: 'correct' | 'wrong' | 'partial') => {
    setAssessmentCompleted(true);
    setShowSelfAssessment(false);
    
    // Store the rating as a string for proper handling in the navigator
    const resultValue = rating === 'correct' ? true : rating === 'partial' ? 'partial' : false;
    
    // For deferred self-assessment (clinical cases), store the result and update the parent
    if (showDeferredSelfAssessment && onSelfAssessmentUpdate) {
      setDeferredAssessmentResult(resultValue);
      onSelfAssessmentUpdate(question.id, resultValue);
      
      // Track progress for deferred assessment
      if (lectureId) {
        trackQuestionProgress(lectureId, question.id, resultValue);
      }
    } else {
      // For regular questions, track progress and call onSubmit
      if (lectureId) {
        trackQuestionProgress(lectureId, question.id, resultValue);
      }
      onSubmit(answer, resultValue);
    }
  };

  const handleQuestionUpdated = () => {
    // Reload the page to refresh the question data
    window.location.reload();
  };

  // Reset question state to allow re-answering
  const handleReAnswer = () => {
    setAnswer('');
    setSubmitted(false);
    setShowSelfAssessment(false);
    setAssessmentCompleted(false);
    setHasSubmitted(false);
    hasSubmittedRef.current = false; // Reset the ref too!
  };

  // Add keyboard shortcut for submitting answer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '1') {
        // Only trigger if not already submitted and there's text in the answer
        if (!submitted && answer.trim()) {
          handleSubmit();
        } else if (submitted && assessmentCompleted) {
          // If already submitted and assessment completed, move to next question
          onNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [submitted, answer, assessmentCompleted, onNext]);

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
          <OpenQuestionHeader 
            questionText={question.text} 
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

      <OpenQuestionInput
        answer={answer}
        setAnswer={setAnswer}
        isSubmitted={submitted}
      />

      {submitted && !hideImmediateResults && (
        <OpenQuestionExplanation
          courseReminder={question.course_reminder}
          explanation={question.explanation}
          correctAnswers={question.correctAnswers || question.correct_answers}
        />
      )}

      {showSelfAssessment && (!hideImmediateResults || showDeferredSelfAssessment) && (
        <OpenQuestionSelfAssessment
          onAssessment={handleSelfAssessment}
        />
      )}

      <OpenQuestionActions
        isSubmitted={submitted}
        canSubmit={!hasSubmitted && answer.trim().length > 0}
        onSubmit={handleSubmit}
        onNext={onNext}
        showNext={assessmentCompleted}
        onReAnswer={handleReAnswer}
        hasSubmitted={hasSubmitted}
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
