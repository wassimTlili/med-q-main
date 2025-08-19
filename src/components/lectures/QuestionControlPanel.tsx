
import { useState, useEffect, useRef, useMemo } from 'react';
import { Question, ClinicalCase } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, XCircle, MinusCircle, Stethoscope, EyeOff, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface QuestionControlPanelProps {
  questions: (Question | ClinicalCase)[];
  currentQuestionIndex: number;
  answers: Record<string, any>;
  answerResults?: Record<string, boolean | 'partial'>;
  onQuestionSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  isComplete: boolean;
}

export function QuestionControlPanel({
  questions,
  currentQuestionIndex,
  answers,
  answerResults = {},
  onQuestionSelect,
  onPrevious,
  onNext,
  isComplete
}: QuestionControlPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<string, boolean>>({});
  
  // Refs to track question buttons for auto-scrolling
  const questionRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef<number>(-1);
  const hasInitiallyScrolled = useRef<boolean>(false);

  // Auto-scroll to current question when index changes
  useEffect(() => {
    // Only scroll if the index has actually changed
    if (lastScrolledIndex.current !== currentQuestionIndex) {
      const scrollToCurrentQuestion = () => {
        const currentButton = questionRefs.current[currentQuestionIndex];
        if (!currentButton) return;
        
        // Simple and reliable scrolling
        currentButton.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
        
        lastScrolledIndex.current = currentQuestionIndex;
      };

      // Small delay for smooth rendering
      const timeoutId = setTimeout(scrollToCurrentQuestion, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentQuestionIndex]);

  // Initial scroll on component mount (for when page loads with existing progress)
  useEffect(() => {
    // Only do initial scroll once when questions are loaded
    if (questions.length > 0 && !hasInitiallyScrolled.current) {
      const scrollToCurrentQuestion = () => {
        const currentButton = questionRefs.current[currentQuestionIndex];
        if (!currentButton) return;
        
        // Simple approach: just use scrollIntoView with proper options
        currentButton.scrollIntoView({
          behavior: 'auto', // Use 'auto' for initial scroll to avoid conflicts
          block: 'center',
          inline: 'nearest'
        });
        
        lastScrolledIndex.current = currentQuestionIndex;
        hasInitiallyScrolled.current = true;
      };

      // Use requestAnimationFrame for better timing on initial load
      const animationFrame = requestAnimationFrame(() => {
        setTimeout(scrollToCurrentQuestion, 200);
      });
      
      return () => cancelAnimationFrame(animationFrame);
    }
  }, [questions.length, currentQuestionIndex]); // Include currentQuestionIndex for initial positioning
  
  // Build list of regular question IDs (exclude clinical case wrappers)
  const regularQuestionIds = useMemo(() => {
    const ids: string[] = [];
    questions.forEach((item) => {
      if (!('questions' in item)) {
        ids.push((item as Question).id);
      }
    });
    return ids;
  }, [questions]);

  // Fetch whether the user has notes for each question (used to show a small notes icon)
  useEffect(() => {
    if (!user?.id || regularQuestionIds.length === 0) return;

    const idsToFetch = regularQuestionIds.filter((id) => notesMap[id] === undefined);
    if (idsToFetch.length === 0) return;

    const controller = new AbortController();

    (async () => {
      try {
        const results = await Promise.all(
          idsToFetch.map(async (id) => {
            try {
              const res = await fetch(`/api/user-question-state?userId=${encodeURIComponent(user.id)}&questionId=${encodeURIComponent(id)}` , { signal: controller.signal });
              if (!res.ok) return [id, false] as [string, boolean];
              const data = await res.json();
              const hasNote = !!(data?.notes && String(data.notes).trim().length > 0);
              return [id, hasNote] as [string, boolean];
            } catch {
              return [id, false] as [string, boolean];
            }
          })
        );
        setNotesMap((prev) => {
          const next = { ...prev };
          results.forEach(([id, has]) => {
            next[id] = has;
          });
          return next;
        });
      } catch {
        // ignore
      }
    })();

    return () => controller.abort();
  }, [user?.id, regularQuestionIds]);


  // Only show on mobile devices using a drawer
  const MobileDrawer = () => (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerTrigger asChild>
        <Button 
          variant="outline" 
          className="fixed bottom-6 right-6 lg:hidden z-50 gap-2 shadow-xl backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl"
        >
          <span className="font-medium">{t('questions.questions')}</span>
          <span className="text-xs bg-blue-600 dark:bg-blue-700 text-white rounded-full px-2 py-0.5 font-medium">
            {questions.length}
          </span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[80vh] backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-t border-gray-200/60 dark:border-gray-700/60">
        <div className="p-6">
          <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100 mb-6">{t('questions.questions')}</h3>
          <ScrollArea ref={scrollAreaRef} className="h-[calc(80vh-180px)]">
            {renderQuestionsList()}
          </ScrollArea>
          {renderNavigationButtons()}
        </div>
      </DrawerContent>
    </Drawer>
  );

  // Desktop panel
  const DesktopPanel = () => (
    <Card className="hidden lg:block sticky top-6 h-fit max-h-[calc(100vh-8rem)] backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 shadow-lg rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
            <Circle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              {t('questions.questions')} {t('questions.navigator')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </p>
          </div>
        </div>
        <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-20rem)]">
          {renderQuestionsList()}
        </ScrollArea>
        {renderNavigationButtons()}
      </CardContent>
    </Card>
  );

  const renderQuestionsList = () => {
    // Group questions by type
    const regularQuestions: Array<Question & { originalIndex: number }> = [];
    const clinicalCases: Array<ClinicalCase & { originalIndex: number }> = [];

    questions.forEach((item, index) => {
      if ('caseNumber' in item && 'questions' in item) {
        // This is a clinical case
        clinicalCases.push({ ...item, originalIndex: index });
      } else {
        // This is a regular question
        regularQuestions.push({ ...item, originalIndex: index });
      }
    });

    // Group regular questions by type
    const groupedQuestions = regularQuestions.reduce((groups, question) => {
      const type = question.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(question);
      return groups;
    }, {} as Record<string, Array<Question & { originalIndex: number }>>);

    console.log('QuestionControlPanel - Questions grouped:', {
      totalQuestions: questions.length,
      regularQuestions: regularQuestions.length,
      clinicalCases: clinicalCases.length,
      groupedByType: Object.keys(groupedQuestions).map(type => ({ type, count: groupedQuestions[type].length }))
    });

    // Define type order and labels - include ALL possible types
    const typeOrder = ['mcq', 'qroc', 'open', 'clinic_mcq', 'clinic_croq'];
    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'mcq': return t('questions.mcq');
        case 'qroc': return 'QROC';
        case 'open': return t('questions.open');
        case 'clinic_mcq': return 'MCQ Clinique';
        case 'clinic_croq': return 'CROQ Clinique';
        default: return type.toUpperCase();
      }
    };

    return (
      <div className="space-y-4">
        {/* Regular Questions */}
        {Object.keys(groupedQuestions).map(type => {
          const typeQuestions = groupedQuestions[type];
          if (!typeQuestions || typeQuestions.length === 0) return null;

          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {getTypeLabel(type)} ({typeQuestions.length})
                </span>
              </div>
              <div className="space-y-2">
                {typeQuestions.map((question) => {
                  const isAnswered = answers[question.id] !== undefined;
                  const isCurrent = question.originalIndex === currentQuestionIndex && !isComplete;
                  const isCorrect = answerResults[question.id];
                  const hasNote = notesMap[question.id] === true;
                  const isHidden = (question as any).hidden === true;
                  

                  
                  return (
                    <Button
                      key={question.id}
                      ref={(el) => { questionRefs.current[question.originalIndex] = el; }}
                      variant="outline"
                      className={cn(
                        "w-full justify-start h-auto p-3 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl transition-all duration-200",
                        isCurrent && "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-md",
                        isAnswered && "bg-gray-50 dark:bg-gray-700/50"
                      )}
                      onClick={() => {
                        onQuestionSelect(question.originalIndex);
                        setIsDrawerOpen(false);
                      }}
                    >
                      <div className="flex items-center w-full">
                        <div className="flex flex-col items-start mr-3 flex-1 min-w-0">
                          {/* Session on top, bold/bigger */}
                          {question.session && (
                            <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {question.session}
                            </span>
                          )}
                          {/* Question label smaller below */}
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {question.number ?
                              `${getTypeLabel(question.type)} ${question.number}` :
                              `${getTypeLabel(question.type)} ${question.originalIndex + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasNote && (
                            <StickyNote className="h-4 w-4 text-yellow-500" />
                          )}
                          {isHidden && (
                            <EyeOff className="h-4 w-4 text-red-500" />
                          )}
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700">
                          {isAnswered ? (
                            isCorrect === true ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : isCorrect === 'partial' ? (
                              <MinusCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          )}
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Clinical Cases */}
        {clinicalCases.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-xl">
              <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Cas Cliniques ({clinicalCases.length})
              </span>
            </div>
            <div className="space-y-2">
              {clinicalCases.map((clinicalCase) => {
                // Add null checks for questions array
                if (!clinicalCase.questions || !Array.isArray(clinicalCase.questions)) {
                  console.error('Invalid clinical case structure:', clinicalCase);
                  return null;
                }
                
                const isAnswered = clinicalCase.questions.every(q => answers[q.id] !== undefined);
                const isCurrent = clinicalCase.originalIndex === currentQuestionIndex && !isComplete;
                
                // Calculate overall result for the clinical case
                let isCorrect: boolean | 'partial' | undefined;
                if (isAnswered) {
                  const allCorrect = clinicalCase.questions.every(q => answerResults[q.id] === true);
                  const someCorrect = clinicalCase.questions.some(q => answerResults[q.id] === true || answerResults[q.id] === 'partial');
                  isCorrect = allCorrect ? true : (someCorrect ? 'partial' : false);
                }
                
                return (
                  <Button
                    key={`case-${clinicalCase.caseNumber}`}
                    ref={(el) => { questionRefs.current[clinicalCase.originalIndex] = el; }}
                    variant="outline"
                    className={cn(
                      "w-full justify-start h-auto p-3 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl transition-all duration-200",
                      isCurrent && "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-md",
                      isAnswered && "bg-gray-50 dark:bg-gray-700/50"
                    )}
                    onClick={() => {
                      onQuestionSelect(clinicalCase.originalIndex);
                      setIsDrawerOpen(false);
                    }}
                  >
                    <div className="flex items-center w-full">
                      <div className="flex flex-col items-start mr-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            Cas #{clinicalCase.caseNumber}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {clinicalCase.totalQuestions} questions
                        </span>
                      </div>
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700">
                        {isAnswered ? (
                          isCorrect === true ? (
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : isCorrect === 'partial' ? (
                            <MinusCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          )
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        )}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderNavigationButtons = () => (
    <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
      <Button
        variant="outline"
        onClick={() => {
          onPrevious();
          setIsDrawerOpen(false);
        }}
        disabled={currentQuestionIndex === 0 || isComplete}
        className="flex-1 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        {t('common.previous')}
      </Button>
      {isComplete ? (
        <Button
          variant="outline"
          onClick={() => {
            // This should trigger the completion view
            onNext();
            setIsDrawerOpen(false);
          }}
          className="flex-1 backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-gray-200/60 dark:border-gray-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:border-blue-300 dark:hover:border-blue-600 rounded-xl"
        >
          {t('questions.viewSummary')}
        </Button>
      ) : (
        <Button
          onClick={() => {
            onNext();
            setIsDrawerOpen(false);
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 rounded-xl"
        >
          {t('common.next')}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <MobileDrawer />
      <DesktopPanel />
    </>
  );
}
