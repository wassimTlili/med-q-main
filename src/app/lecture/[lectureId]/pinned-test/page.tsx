'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useLecture } from '@/hooks/use-lecture'
import { useAuth } from '@/contexts/AuthContext'
import { UniversalHeader } from '@/components/layout/UniversalHeader'
import { AppSidebar, AppSidebarProvider } from '@/components/layout/AppSidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Star,
  Clock,
  Trophy,
  RotateCcw,
  Dumbbell
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Question {
  id: string
  questionText: string
  type: 'MCQ' | 'TRUE_FALSE'
  options?: string[]
  correctAnswer: string
  explanation?: string
  difficulty?: string
}

interface TestAnswer {
  questionId: string
  answer: string
  isCorrect: boolean
  timeSpent: number
}

export default function PinnedQuestionsTestPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<TestAnswer[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null)
  
  const lectureId = params?.lectureId as string
  const { lecture } = useLecture(lectureId)

  if (!lectureId) {
    return <div>Lecture ID not found</div>
  }

  // Load pinned questions for this lecture
  useEffect(() => {
    const loadPinnedQuestions = async () => {
      if (!lectureId || !user?.id) return
      
      try {
        setIsLoading(true)
        // First get all pinned questions for this user
        const pinnedResponse = await fetch(`/api/pinned-questions?userId=${user.id}`)
        if (!pinnedResponse.ok) {
          throw new Error('Failed to load pinned questions')
        }
        
        const pinnedQuestions = await pinnedResponse.json()
        
        // Then get all questions for this lecture
        const questionsResponse = await fetch(`/api/questions?lectureId=${lectureId}`)
        if (!questionsResponse.ok) {
          throw new Error('Failed to load lecture questions')
        }
        
        const allQuestions = await questionsResponse.json()
        
        // Filter to only show pinned questions from this lecture
        const pinnedQuestionIds = pinnedQuestions.map((pq: any) => pq.questionId)
        const filteredQuestions = allQuestions.filter((q: Question) => pinnedQuestionIds.includes(q.id))
        
        setQuestions(filteredQuestions)
        
        if (filteredQuestions.length > 0) {
          setStartTime(new Date())
          setQuestionStartTime(new Date())
        }
      } catch (error) {
        console.error('Error loading pinned questions:', error)
        toast({
          title: "Error",
          description: "Failed to load pinned questions",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadPinnedQuestions()
  }, [lectureId, user?.id])

  const currentQuestion = questions[currentQuestionIndex]
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer)
  }

  const handleNextQuestion = () => {
    if (!selectedAnswer || !currentQuestion || !questionStartTime) return

    const timeSpent = new Date().getTime() - questionStartTime.getTime()
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer

    const newAnswer: TestAnswer = {
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      isCorrect,
      timeSpent
    }

    setAnswers(prev => [...prev, newAnswer])
    setSelectedAnswer('')

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setQuestionStartTime(new Date())
    } else {
      setIsTestComplete(true)
    }
  }

  const handleRestartTest = () => {
    setCurrentQuestionIndex(0)
    setAnswers([])
    setSelectedAnswer('')
    setIsTestComplete(false)
    setStartTime(new Date())
    setQuestionStartTime(new Date())
  }

  const getTestResults = () => {
    const correctAnswers = answers.filter(a => a.isCorrect).length
    const totalTime = answers.reduce((sum, a) => sum + a.timeSpent, 0)
    const averageTime = totalTime / answers.length / 1000 // in seconds
    const score = Math.round((correctAnswers / answers.length) * 100)

    return {
      correctAnswers,
      totalQuestions: answers.length,
      score,
      totalTime: Math.round(totalTime / 1000),
      averageTime: Math.round(averageTime)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppSidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader title="Loading..." />
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </SidebarInset>
        </AppSidebarProvider>
      </ProtectedRoute>
    )
  }

  if (questions.length === 0) {
    return (
      <ProtectedRoute>
        <AppSidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex-1 flex flex-col">
            <UniversalHeader title={`Pinned Questions - ${lecture?.title || 'Lecture'}`} />
            <div className="flex-1 bg-gray-50 dark:bg-gray-900">
              <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                  <CardContent className="p-8 text-center">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Pinned Questions</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      You haven&apos;t pinned any questions from this lecture yet. 
                      Pin questions while studying to create your personal test set.
                    </p>
                    <Button
                      onClick={() => router.push(`/lecture/${lectureId}`)}
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Go to Lecture
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </SidebarInset>
        </AppSidebarProvider>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <AppSidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <UniversalHeader title={`Pinned Questions Test - ${lecture?.title || 'Lecture'}`} />
          
          <div className="flex-1 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              
              {!isTestComplete ? (
                <>
                  {/* Test Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="flex items-center gap-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Dumbbell className="w-4 h-4" />
                        Pinned Questions Test
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <h1 className="text-lg font-semibold">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </h1>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Pinned Question
                        </span>
                      </div>
                    </div>
                    
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Question Card */}
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {currentQuestion.questionText}
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      {currentQuestion.type === 'MCQ' && currentQuestion.options ? (
                        <div className="space-y-3">
                          {currentQuestion.options.map((option, index) => (
                            <Button
                              key={index}
                              variant={selectedAnswer === option ? "default" : "outline"}
                              className="w-full justify-start p-4 h-auto"
                              onClick={() => handleAnswerSelect(option)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium">
                                  {String.fromCharCode(65 + index)}.
                                </span>
                                <span className="text-left">{option}</span>
                              </div>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Button
                            variant={selectedAnswer === 'true' ? "default" : "outline"}
                            className="w-full justify-start p-4 h-auto"
                            onClick={() => handleAnswerSelect('true')}
                          >
                            <CheckCircle className="w-5 h-5 mr-3" />
                            True
                          </Button>
                          <Button
                            variant={selectedAnswer === 'false' ? "default" : "outline"}
                            className="w-full justify-start p-4 h-auto"
                            onClick={() => handleAnswerSelect('false')}
                          >
                            <XCircle className="w-5 h-5 mr-3" />
                            False
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Next Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!selectedAnswer}
                      className="flex items-center gap-2"
                    >
                      {currentQuestionIndex < questions.length - 1 ? (
                        <>
                          Next Question
                          <ChevronRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Finish Test
                          <Trophy className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                /* Test Results */
                <div className="space-y-6">
                  <div className="text-center">
                    <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Test Complete!</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      Here are your results for the pinned questions test
                    </p>
                  </div>

                  {(() => {
                    const results = getTestResults()
                    return (
                      <Card>
                        <CardHeader>
                          <CardTitle>Test Results</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {results.score}%
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Final Score
                              </div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {results.correctAnswers}/{results.totalQuestions}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Correct Answers
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{results.totalTime}s</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Total Time
                              </div>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center justify-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">{results.averageTime}s</span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Avg per Question
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}

                  <div className="flex gap-3">
                    <Button
                      onClick={handleRestartTest}
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restart Test
                    </Button>
                    <Button
                      onClick={() => router.back()}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Lecture
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </AppSidebarProvider>
    </ProtectedRoute>
  )
}
