'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { useLecture } from '@/hooks/use-lecture'
import { AppLayout } from '@/components/layout/AppLayout'
import { LectureTimer } from '@/components/lectures/LectureTimer'
import { LectureComplete } from '@/components/lectures/LectureComplete'
import { LectureLoadingState } from '@/components/lectures/LectureLoadingState'
import { QuestionControlPanel } from '@/components/lectures/QuestionControlPanel'
import { MCQQuestion } from '@/components/questions/MCQQuestion'
import { OpenQuestion } from '@/components/questions/OpenQuestion'
import { ClinicalCaseQuestion } from '@/components/questions/ClinicalCaseQuestion'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ClinicalCase, Question } from '@/types'

export default function LecturePageRoute() {
  const params = useParams()
  const { t } = useTranslation()
  
  if (!params?.lectureId) {
    return <div>Lecture ID not found</div>
  }
  
  const lectureId = params.lectureId as string
  
  const {
    lecture,
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    answerResults,
    isLoading,
    isComplete,
    currentQuestion,
    progress,
    handleAnswerSubmit,
    handleClinicalCaseSubmit,
    handleNext,
    handleRestart,
    handleBackToSpecialty,
  } = useLecture(lectureId);



  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
            <div className="container mx-auto px-4 py-6">
              <LectureLoadingState />
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (!lecture) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
            <div className="container mx-auto px-4 py-12">
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md mx-auto">
                  <div className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-8 shadow-lg">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                      {t('lectures.lectureNotFound')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      The lecture you're looking for doesn't exist or has been removed.
                    </p>
                    <Button 
                      onClick={handleBackToSpecialty} 
                      className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {t('common.back')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (isComplete) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
            <div className="container mx-auto px-4 py-6">
              <LectureComplete
                onRestart={handleRestart}
                onBackToSpecialty={handleBackToSpecialty}
                questions={questions}
                answers={answers}
                answerResults={answerResults}
                lectureTitle={lecture.title}
              />
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const handleQuestionSelect = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleMCQSubmit = (answer: string[], isCorrect: boolean) => {
    // Only handle regular questions here, clinical cases are handled separately
    // Check if this is actually a clinical case (has questions array) vs a regular question
    if (!('questions' in currentQuestion!)) {
      const question = currentQuestion as Question;

      handleAnswerSubmit(question.id, answer, isCorrect);
    }
    // Don't automatically move to next question - let user see the result first
  };

  const handleOpenSubmit = (answer: string, resultValue?: boolean | 'partial') => {
    // Only handle regular questions here, clinical cases are handled separately
    // Check if this is actually a clinical case (has questions array) vs a regular question
    if (!('questions' in currentQuestion!)) {
      const question = currentQuestion as Question;

      // For open questions, we store the answer and the self-assessment result
      handleAnswerSubmit(question.id, answer, resultValue);
    }
    // Don't automatically move to next question - let user see the result first
  };

  const handleClinicalCaseComplete = (caseNumber: number, caseAnswers: Record<string, any>, caseResults: Record<string, boolean | 'partial'>) => {

    handleClinicalCaseSubmit(caseNumber, caseAnswers, caseResults);
  };

  const renderCurrentQuestion = () => {
    console.log('renderCurrentQuestion called:', {
      currentQuestion: currentQuestion,
      currentQuestionIndex,
      questionsLength: questions.length
    });
    
    if (!currentQuestion) {
      console.log('No current question - returning null');
      return null;
    }

    // Check if current question is a clinical case
    if ('caseNumber' in currentQuestion && 'questions' in currentQuestion) {
      const clinicalCase = currentQuestion as ClinicalCase;
      
      // Add null checks for questions array
      if (!clinicalCase.questions || !Array.isArray(clinicalCase.questions)) {
        console.error('Invalid clinical case structure:', clinicalCase);
        return null;
      }
      
      const isAnswered = clinicalCase.questions.every(q => answers[q.id] !== undefined);
      const caseAnswerResult = isAnswered ? 
        (clinicalCase.questions.every(q => answerResults[q.id] === true) ? true : 
         clinicalCase.questions.some(q => answerResults[q.id] === true || answerResults[q.id] === 'partial') ? 'partial' : false) : 
        undefined;
      
      const caseUserAnswers: Record<string, any> = {};
      const caseAnswerResults: Record<string, boolean | 'partial'> = {};
      clinicalCase.questions.forEach(q => {
        if (answers[q.id] !== undefined) {
          caseUserAnswers[q.id] = answers[q.id];
        }
        if (answerResults[q.id] !== undefined) {
          caseAnswerResults[q.id] = answerResults[q.id];
        }
      });

      return (
        <ClinicalCaseQuestion
          clinicalCase={clinicalCase}
          onSubmit={handleClinicalCaseComplete}
          onNext={handleNext}
          lectureId={lectureId}
          isAnswered={isAnswered}
          answerResult={caseAnswerResult}
          userAnswers={caseUserAnswers}
          answerResults={caseAnswerResults}
          onAnswerUpdate={handleAnswerSubmit}
        />
      );
    }

    // Regular question handling
    const isAnswered = answers[currentQuestion.id] !== undefined;
    const answerResult = answerResults[currentQuestion.id];
    const userAnswer = answers[currentQuestion.id];
    

    
    if (currentQuestion.type === 'mcq') {
      return (
        <MCQQuestion
          question={currentQuestion}
          onSubmit={handleMCQSubmit}
          onNext={handleNext}
          lectureId={lectureId}
          isAnswered={isAnswered}
          answerResult={answerResult}
          userAnswer={userAnswer}
        />
      );
    } else {
      return (
        <OpenQuestion
          question={currentQuestion}
          onSubmit={handleOpenSubmit}
          onNext={handleNext}
          lectureId={lectureId}
          isAnswered={isAnswered}
          answerResult={answerResult}
          userAnswer={userAnswer}
        />
      );
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-blue-50/50 dark:from-purple-950/20 dark:via-gray-900 dark:to-blue-950/20">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 pb-10 lg:pb-0">
              <div className="flex-1 space-y-4 sm:space-y-6 min-w-0 w-full max-w-full">
                <div className="flex justify-end">
                  <LectureTimer lectureId={lectureId} />
                </div>

                {currentQuestion && (
                  <div className="space-y-4 sm:space-y-6">
                    {renderCurrentQuestion()}
                  </div>
                )}
              </div>

              <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
                <QuestionControlPanel
                  questions={questions}
                  currentQuestionIndex={currentQuestionIndex}
                  answers={answers}
                  answerResults={answerResults}
                  onQuestionSelect={handleQuestionSelect}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  isComplete={isComplete}
                />
              </div>
            </div>
            
            {/* Mobile Control Panel - rendered separately to avoid layout issues */}
            <div className="lg:hidden mt-4 sm:mt-6">
              <QuestionControlPanel
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                answers={answers}
                answerResults={answerResults}
                onQuestionSelect={handleQuestionSelect}
                onPrevious={handlePrevious}
                onNext={handleNext}
                isComplete={isComplete}
              />
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}