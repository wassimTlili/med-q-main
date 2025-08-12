'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
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
import { ArrowLeft, Dumbbell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ClinicalCase, Question } from '@/types'

export default function LecturePageRoute() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useTranslation()
  
  const lectureId = params?.lectureId as string
  const mode = searchParams?.get('mode') // 'pinned' or null for all questions

  // Always call hooks at the top level
  const {
    lecture,
    questions,
    currentQuestionIndex,
    userAnswers,
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
  } = useLecture(lectureId, mode); // Pass mode to the hook

  if (!lectureId) {
    return <div>Lecture ID not found</div>
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
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
                      onClick={handleBackToSpecialty} 
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
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (isComplete) {
    return (
      <ProtectedRoute>
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
            <div className="container mx-auto px-4 py-6">
              <LectureComplete
                onRestart={handleRestart}
                onBackToSpecialty={handleBackToSpecialty}
                questions={questions}
                answers={answers}
                answerResults={answerResults}
                lectureTitle={lecture.title}
                lectureId={lectureId}
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
      {/* Show navbar only for pinned mode, hide for regular study mode */}
      {mode === 'pinned' ? (
        <AppLayout>
          <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
            <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 pb-10 lg:pb-0">
                <div className="flex-1 space-y-4 sm:space-y-6 min-w-0 w-full max-w-full">
                  <div className="flex justify-between items-center">
                    {/* Mode indicator for pinned questions */}
                    {mode === 'pinned' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
                        <Dumbbell className="w-4 h-4" />
                        Pinned Questions Only
                        {questions.length === 0 && (
                          <span className="text-xs text-orange-600 dark:text-orange-400">
                            (No pinned questions found)
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex-1"></div>
                    <LectureTimer lectureId={lectureId} />
                  </div>

                  {currentQuestion && (
                    <div className="space-y-4 sm:space-y-6">
                      {renderCurrentQuestion()}
                    </div>
                  )}

                  {/* No pinned questions message */}
                  {mode === 'pinned' && questions.length === 0 && !isLoading && (
                    <div className="flex items-center justify-center min-h-[60vh]">
                      <div className="text-center max-w-md mx-auto">
                        <div className="backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-8 shadow-lg">
                          <Dumbbell className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                            No Pinned Questions
                          </h1>
                          <p className="text-gray-600 dark:text-gray-400 mb-6">
                            You haven&apos;t pinned any questions from this lecture yet. 
                            Pin questions while studying to create your personal test set.
                          </p>
                          <Button 
                            onClick={() => router.push(`/lecture/${lectureId}`)} 
                            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 mr-3"
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Study All Questions
                          </Button>
                          <Button 
                            onClick={handleBackToSpecialty} 
                            variant="outline"
                          >
                            Back to Specialty
                          </Button>
                        </div>
                      </div>
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
      ) : (
        /* Regular study mode - NO NAVBAR but keep Questions Navigator */
        <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-blue-50/50 dark:from-blue-950/20 dark:via-gray-900 dark:to-blue-950/20">
          <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 pb-10 lg:pb-0">
              <div className="flex-1 space-y-4 sm:space-y-6 min-w-0 w-full max-w-full">
                <div className="flex justify-between items-center">
                  {/* Back to specialty button */}
                  <Button
                    onClick={handleBackToSpecialty}
                    variant="ghost"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Specialty
                  </Button>
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
      )}
    </ProtectedRoute>
  );
}