'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLecture } from '@/hooks/use-lecture'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LectureTimer } from '@/components/lectures/LectureTimer'
import { LectureComplete } from '@/components/lectures/LectureComplete'
import { LectureLoadingState } from '@/components/lectures/LectureLoadingState'
import { QuestionControlPanel } from '@/components/lectures/QuestionControlPanel'
import { MCQQuestion } from '@/components/questions/MCQQuestion'
import { OpenQuestion } from '@/components/questions/OpenQuestion'
import { ClinicalCaseQuestion } from '@/components/questions/ClinicalCaseQuestion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, PlusCircle, ListOrdered } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ClinicalCase, Question } from '@/types'
// removed card/collapsible imports; reminder now lives in question components
import { QuestionManagementDialog } from '@/components/questions/QuestionManagementDialog'
import { useAuth } from '@/contexts/AuthContext'
// import ZoomableImage from '@/components/questions/ZoomableImage'
// import { LectureComments } from '@/components/lectures/LectureComments'

export default function LecturePageRoute() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [openQuestionsDialog, setOpenQuestionsDialog] = useState(false)
  const [openOrganizer, setOpenOrganizer] = useState(false)
  
  const lectureId = params?.lectureId as string
  const specialtyId = params?.specialtyId as string
  const mode = searchParams?.get('mode') // 'pinned' or null for all questions

  // Always call hooks at the top level
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
    handleQuestionUpdate,
  } = useLecture(lectureId, mode);

  if (!lectureId) {
    return <div>Lecture ID not found</div>
  }

  // Override back navigation to use nested route
  const handleBackToSpecialtyNested = () => {
    if (specialtyId) {
      router.push(`/exercices/${specialtyId}`)
    } else {
      handleBackToSpecialty()
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
          <div className="container mx-auto px-4 py-6">
            <LectureLoadingState />
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!lecture) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
          <div className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md mx-auto">
                <div className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-8 shadow-lg">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {t('lectures.lectureNotFound')}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    The lecture you&apos;re looking for doesn&apos;t exist or has been removed.
                  </p>
                  <Button 
                    onClick={handleBackToSpecialtyNested} 
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('common.back')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (isComplete) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
          <div className="container mx-auto px-4 py-6">
            <LectureComplete
              onRestart={handleRestart}
              onBackToSpecialty={handleBackToSpecialtyNested}
              questions={questions}
              answers={answers}
              answerResults={answerResults}
              lectureTitle={lecture.title}
              lectureId={lectureId}
            />
          </div>
        </div>
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

  const handleMCQSubmit = (selectedOptionIds: string[], isCorrect: boolean) => {
    // Only handle regular questions here, clinical cases are handled separately
    // Check if this is actually a clinical case (has questions array) vs a regular question
    if (!('questions' in currentQuestion!)) {
      const question = currentQuestion as Question;

      handleAnswerSubmit(question.id, selectedOptionIds, isCorrect);
    }
    // Don't automatically move to next question - let user see the result first
  };

  const handleOpenSubmit = (answer: string, resultValue: boolean | 'partial') => {
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
          lectureTitle={lecture?.title}
          specialtyName={lecture?.specialty?.name}
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
          lectureTitle={lecture?.title}
          specialtyName={lecture?.specialty?.name}
          isAnswered={isAnswered}
          answerResult={answerResult}
          userAnswer={userAnswer}
          onQuestionUpdate={handleQuestionUpdate}
        />
      );
    } else {
      return (
        <OpenQuestion
          question={currentQuestion}
          onSubmit={handleOpenSubmit}
          onNext={handleNext}
          lectureId={lectureId}
          lectureTitle={lecture?.title}
          specialtyName={lecture?.specialty?.name}
          isAnswered={isAnswered}
          answerResult={answerResult}
          userAnswer={userAnswer}
          onQuestionUpdate={handleQuestionUpdate}
        />
      );
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 pb-10 lg:pb-0">
            <div className="flex-1 space-y-4 sm:space-y-6 min-w-0 w-full max-w-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
                {/* Back to specialty button */}
                <Button
                  onClick={handleBackToSpecialtyNested}
                  variant="ghost"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 w-fit"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back to Specialty</span>
                </Button>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {user?.role === 'admin' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenQuestionsDialog(true)}
                        className="whitespace-nowrap"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">creer</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setOpenOrganizer(true); setOpenQuestionsDialog(true); }}
                        className="whitespace-nowrap"
                      >
                        <ListOrdered className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Organiser</span>
                      </Button>
                    </>
                  )}
                  <LectureTimer lectureId={lectureId} />
                </div>
              </div>

              {currentQuestion && (
                <div className="space-y-4 sm:space-y-6">
                  {renderCurrentQuestion()}
                  {/* Reminder and comments are handled inside question components after submission */}
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
      {/* Admin-only Questions Management Dialog with auto-create */}
      {user?.role === 'admin' && lecture && (
        <QuestionManagementDialog
          lecture={lecture}
          isOpen={openQuestionsDialog}
          onOpenChange={(o)=>{ setOpenQuestionsDialog(o); if(!o) setOpenOrganizer(false); }}
          initialOrganizerOpen={openOrganizer}
          initialCreateOpen
        />
      )}
    </ProtectedRoute>
  )
}
