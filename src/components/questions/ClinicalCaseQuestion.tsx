'use client'

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ClinicalCase, Question } from '@/types';
import { MCQQuestion } from './MCQQuestion';
import { OpenQuestion } from './OpenQuestion';
import { ClinicalCaseDisplay } from './ClinicalCaseDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle, Circle, AlertCircle, Eye, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ClinicalCaseQuestionProps {
  clinicalCase: ClinicalCase;
  onSubmit: (caseNumber: number, answers: Record<string, any>, results: Record<string, boolean | 'partial'>) => void;
  onNext: () => void;
  lectureId: string;
  isAnswered: boolean;
  answerResult?: boolean | 'partial';
  userAnswers?: Record<string, any>;
  answerResults?: Record<string, boolean | 'partial'>; // Pass existing results for individual questions
  onAnswerUpdate?: (questionId: string, answer: any, result?: boolean | 'partial') => void; // For persisting individual updates
}

export function ClinicalCaseQuestion({
  clinicalCase,
  onSubmit,
  onNext,
  lectureId,
  isAnswered,
  answerResult,
  userAnswers = {},
  answerResults = {},
  onAnswerUpdate
}: ClinicalCaseQuestionProps) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, any>>(userAnswers);
  const [questionResults, setQuestionResults] = useState<Record<string, boolean | 'partial'>>(answerResults);
  const [isCaseComplete, setIsCaseComplete] = useState(isAnswered);
  const [showResults, setShowResults] = useState(isAnswered);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  
  // Refs to track question elements for auto-scrolling
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const answeredQuestions = Object.keys(answers).length;
  const progress = (answeredQuestions / clinicalCase.totalQuestions) * 100;

  // Reset state when clinical case changes
  useEffect(() => {
    if (!isAnswered) {
      setAnswers({});
      setQuestionResults({});
      setIsCaseComplete(false);
      setShowResults(false);
    }
  }, [clinicalCase.caseNumber, isAnswered]);

  const scrollToNextQuestion = (currentQuestionId: string, updatedAnswers: Record<string, any>) => {
    // Find the current question index
    const currentIndex = clinicalCase.questions.findIndex(q => q.id === currentQuestionId);
    
    // Find the next unanswered question
    for (let i = currentIndex + 1; i < clinicalCase.questions.length; i++) {
      const nextQuestion = clinicalCase.questions[i];
      if (updatedAnswers[nextQuestion.id] === undefined) {
        // Found next unanswered question, scroll to it
        const element = questionRefs.current[nextQuestion.id];
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
        break;
      }
    }
  };

  const handleQuestionAnswer = (questionId: string, answer: any, result?: boolean | 'partial') => {
    const wasAnswered = answers[questionId] !== undefined;
    
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };
      
      // Auto-scroll to next question if this is a new answer (not updating existing)
      if (!wasAnswered && !showResults) {
        setTimeout(() => scrollToNextQuestion(questionId, newAnswers), 300); // Small delay for smooth UX
      }
      
      return newAnswers;
    });

    if (result !== undefined) {
      setQuestionResults(prev => ({
        ...prev,
        [questionId]: result
      }));
    }
  };

  const handleCompleteCase = () => {
    // All questions answered, complete the case
    setIsCaseComplete(true);
    onSubmit(clinicalCase.caseNumber, answers, questionResults);
  };

  const handleShowResults = () => {
    setShowResults(true);
  };

  const handleSelfAssessmentUpdate = (questionId: string, result: boolean | 'partial') => {
    setQuestionResults(prev => ({
      ...prev,
      [questionId]: result
    }));
    
    // Also persist the self-assessment result to parent storage
    if (onAnswerUpdate) {
      const userAnswer = answers[questionId];
      onAnswerUpdate(questionId, userAnswer, result);
    }
  };

  const getQuestionStatus = (question: Question) => {
    if (answers[question.id] !== undefined) {
      if (showResults) {
        const result = questionResults[question.id];
        if (result === true) return 'correct';
        if (result === 'partial') return 'partial';
        return 'incorrect';
      }
      return 'answered';
    }
    return 'unanswered';
  };

  const renderQuestion = (question: Question, index: number) => {
    const isAnswered = answers[question.id] !== undefined;
    const answerResult = showResults ? questionResults[question.id] : undefined;
    const userAnswer = answers[question.id];

    return (
      <div 
        key={question.id} 
        ref={(el) => { questionRefs.current[question.id] = el; }}
        className="border rounded-lg p-6 bg-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            Question {index + 1}
          </div>
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted">
            {question.type === 'clinic_mcq' ? 'QCM' : 'QROC'}
          </div>
          {isAnswered && (
            <div className="ml-auto">
              {showResults ? (
                <>
                  {answerResult === true && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {answerResult === 'partial' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                  {answerResult === false && <AlertCircle className="h-4 w-4 text-red-600" />}
                </>
              ) : (
                <Circle className="h-4 w-4 text-blue-600" />
              )}
            </div>
          )}
        </div>

        {question.type === 'clinic_mcq' ? (
          <MCQQuestion
            question={question}
            onSubmit={(answer, isCorrect) => handleQuestionAnswer(question.id, answer, isCorrect)}
            onNext={() => {}} // No auto-next since we're showing all questions
            lectureId={lectureId}
            isAnswered={showResults ? isAnswered : false} // Only show as answered when results are shown
            answerResult={showResults ? answerResult : undefined}
            userAnswer={userAnswer}
            hideImmediateResults={!showResults} // Hide results until show results is clicked
          />
        ) : (
          <OpenQuestion
            question={question}
            onSubmit={(answer, resultValue) => handleQuestionAnswer(question.id, answer, resultValue)}
            onNext={() => {}} // No auto-next since we're showing all questions
            lectureId={lectureId}
            isAnswered={showResults ? isAnswered : false} // Only show as answered when results are shown
            answerResult={showResults ? answerResult : undefined}
            userAnswer={userAnswer}
            hideImmediateResults={!showResults} // Hide results until show results is clicked
            showDeferredSelfAssessment={showResults && isAnswered && question.type === 'clinic_croq'} // Show self-assessment for clinic_croq when results are shown
            onSelfAssessmentUpdate={handleSelfAssessmentUpdate}
          />
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 w-full max-w-full"
    >
      {/* Clinical Case Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 mb-2">
            <span>Cas Clinique #{clinicalCase.caseNumber}</span>
            {isCaseComplete && showResults && (
              <div className="flex items-center gap-1 text-sm">
                {answerResult === true && <CheckCircle className="h-4 w-4 text-green-600" />}
                {answerResult === 'partial' && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                {answerResult === false && <AlertCircle className="h-4 w-4 text-red-600" />}
              </div>
            )}
          </CardTitle>
          {/* Show case text only once at the top */}
          <ClinicalCaseDisplay
            caseNumber={clinicalCase.caseNumber}
            caseText={clinicalCase.caseText}
          />
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{answeredQuestions} sur {clinicalCase.totalQuestions} questions répondues</span>
              <span>{Math.round(progress)}% complété</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Questions Summary */}
          <div className="flex flex-wrap gap-2 mb-4">
            {clinicalCase.questions.map((question, index) => {
              const status = getQuestionStatus(question);
              return (
                <div
                  key={question.id}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                >
                  {status === 'correct' && <CheckCircle className="h-3 w-3 text-green-600" />}
                  {status === 'partial' && <AlertCircle className="h-3 w-3 text-yellow-600" />}
                  {status === 'incorrect' && <AlertCircle className="h-3 w-3 text-red-600" />}
                  {status === 'answered' && <Circle className="h-3 w-3 text-blue-600" />}
                  {status === 'unanswered' && <Circle className="h-3 w-3 text-muted-foreground" />}
                  <span className={status === 'unanswered' ? 'text-muted-foreground' : ''}>
                    {index + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* All Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Questions du cas clinique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {clinicalCase.questions.map((question, index) => 
              renderQuestion(question, index)
            )}
          </div>
        </CardContent>
      </Card>

      {/* Case Complete Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {answeredQuestions === clinicalCase.totalQuestions 
            ? "Toutes les questions ont été répondues" 
            : `${clinicalCase.totalQuestions - answeredQuestions} question(s) restante(s)`}
        </div>
        
        <div className="flex gap-2">
          {answeredQuestions === clinicalCase.totalQuestions && !isCaseComplete && (
            <Button onClick={handleCompleteCase} className="bg-green-600 hover:bg-green-700">
              Terminer le cas clinique
            </Button>
          )}
          
          {isCaseComplete && !showResults && (
            <Button onClick={handleShowResults} className="bg-blue-600 hover:bg-blue-700">
              <Eye className="h-4 w-4 mr-2" />
              Voir les résultats
            </Button>
          )}
          
          {isCaseComplete && showResults && (
            <Button onClick={onNext}>
              Continuer
            </Button>
          )}
        </div>
      </div>

      {/* Floating Action Button for Case Text */}
      <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="fixed bottom-6 left-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50 bg-blue-600 hover:bg-blue-700"
            aria-label="Voir le texte du cas clinique"
          >
            <FileText className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cas Clinique #{clinicalCase.caseNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="prose max-w-none text-sm leading-relaxed">
              <p className="whitespace-pre-wrap text-foreground">
                {clinicalCase.caseText}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 