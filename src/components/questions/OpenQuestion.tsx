"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Question } from '@/types';
import { motion } from 'framer-motion';
import { OpenQuestionHeader } from './open/OpenQuestionHeader';
import { OpenQuestionInput } from './open/OpenQuestionInput';
// Inline Rappel du cours collapsible replaces separate explanation block
import { OpenQuestionSelfAssessment } from './open/OpenQuestionSelfAssessment';
import { OpenQuestionActions } from './open/OpenQuestionActions';
import { QuestionEditDialog } from './QuestionEditDialog';
import { ReportQuestionDialog } from './ReportQuestionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Pencil, Pin, PinOff, Eye, EyeOff, Flag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProgress } from '@/hooks/use-progress';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

import { QuestionNotes } from './QuestionNotes';
import { logActivity } from '@/lib/logActivity';
import { QuestionComments } from './QuestionComments';
import ZoomableImage from './ZoomableImage';

interface OpenQuestionProps {
  question: Question;
  onSubmit: (answer: string, resultValue: boolean | 'partial') => void;
  onNext: () => void;
  lectureId?: string;
  lectureTitle?: string;
  specialtyName?: string;
  isAnswered?: boolean;
  answerResult?: boolean | 'partial';
  userAnswer?: string;
  hideImmediateResults?: boolean;
  showDeferredSelfAssessment?: boolean; // Show self-assessment after results are revealed
  onSelfAssessmentUpdate?: (questionId: string, result: boolean | 'partial') => void; // Update result after self-assessment
  onQuestionUpdate?: (questionId: string, updates: Partial<Question>) => void;
  hideNotes?: boolean;
  hideComments?: boolean;
  hideActions?: boolean;
  highlightConfirm?: boolean;
  resetSignal?: number; // external trigger to reset state (for grouped QROC re-answer)
  keepInputAfterSubmit?: boolean; // keep textarea mounted (grouped subquestions)
  suppressReminder?: boolean; // hide reminder section (grouped QROC shows one shared)
  hideMeta?: boolean;
}

export function OpenQuestion({ 
  question, 
  onSubmit, 
  onNext, 
  lectureId, 
  lectureTitle,
  specialtyName,
  isAnswered, 
  answerResult, 
  userAnswer,
  hideImmediateResults = false,
  showDeferredSelfAssessment = false,
  onSelfAssessmentUpdate,
  onQuestionUpdate,
  hideNotes,
  hideComments,
  hideActions,
  highlightConfirm,
  resetSignal,
  keepInputAfterSubmit,
  suppressReminder,
  hideMeta,
}: OpenQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showSelfAssessment, setShowSelfAssessment] = useState(false);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false); // Track if question has been submitted
  const [deferredAssessmentResult, setDeferredAssessmentResult] = useState<boolean | 'partial' | null>(null); // Track deferred self-assessment
  const [isPinned, setIsPinned] = useState(false); // Track if question is pinned
  const [showNotesArea, setShowNotesArea] = useState(false); // Control showing notes/comments after click
  const notesRef = useRef<HTMLDivElement | null>(null);
  const hasSubmittedRef = useRef(false); // Immediate synchronous access to submission state
  const { t } = useTranslation();
  const { user } = useAuth();
  const { trackQuestionProgress } = useProgress();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  const isMaintainer = user?.role === 'maintainer';
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  // Local override for hidden to ensure instant UI toggle regardless of parent update timing
  const [localHidden, setLocalHidden] = useState<boolean | undefined>(undefined);
  // Highlights are managed internally by HighlightableQuestionText; no inline buttons here.

  useEffect(() => {
    setLocalHidden(undefined);
  }, [question.id]);

  // External reset (e.g., grouped QROC re-answer)
  useEffect(() => {
    if (resetSignal !== undefined) {
      // If not preserving input, clear it; else keep content
      if (!keepInputAfterSubmit) {
        setAnswer('');
      }
      setSubmitted(false);
      setShowSelfAssessment(false);
      setAssessmentCompleted(false);
      setHasSubmitted(false);
      hasSubmittedRef.current = false;
    }
  }, [resetSignal]);

  // Clear local override once parent prop reflects the new state
  useEffect(() => {
    if (localHidden !== undefined && (question.hidden === localHidden)) {
      setLocalHidden(undefined);
    }
  }, [question.hidden, localHidden]);

  // Load pinned status from database on mount
  useEffect(() => {
    const loadPinnedStatus = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/pinned-questions?userId=${user.id}`);
        if (response.ok) {
          const pinnedData = await response.json();
          const isQuestionPinned = pinnedData.some((item: any) => item.questionId === question.id);
          setIsPinned(isQuestionPinned);
        }
      } catch (error) {
        console.error('Error loading pinned question status:', error);
      }
    };

    if (user?.id && question.id) {
      loadPinnedStatus();
    }
  }, [user?.id, question.id]);

  // Pin/Unpin handlers for questions
  const handlePinQuestion = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/pinned-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          questionId: question.id,
        }),
      });

      if (response.ok) {
        setIsPinned(true);
        toast({
          title: "Question Pinned",
          description: "This question has been pinned to your collection.",
        });
  window.dispatchEvent(new Event('pinned-updated'));
      } else {
        toast({
          title: "Error",
          description: "Failed to pin question.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error pinning question:', error);
      toast({
        title: "Error",
        description: "Failed to pin question.",
        variant: "destructive",
      });
    }
  }, [user?.id, question.id]);

  const handleUnpinQuestion = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/pinned-questions?userId=${user.id}&questionId=${question.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setIsPinned(false);
        toast({
          title: "Question Unpinned",
          description: "This question has been removed from your pinned collection.",
        });
  window.dispatchEvent(new Event('pinned-updated'));
      } else {
        toast({
          title: "Error",
          description: "Failed to unpin question.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error unpinning question:', error);
      toast({
        title: "Error",
        description: "Failed to unpin question.",
        variant: "destructive",
      });
    }
  }, [user?.id, question.id]);

  // Force reset when question changes (safety net)
  useEffect(() => {
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
  // Close notes area when navigating to another question
  setShowNotesArea(false);
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

    // Log activity immediately for open/QROC so it appears in daily chart even before self-assessment
    if (user?.id) {
      logActivity('open_question_attempt', () => {
        window.dispatchEvent(new CustomEvent('activity-attempt'));
      });
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

    // Persist attempt + score
    if (user?.id) {
      try {
        await fetch('/api/user-question-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            questionId: question.id,
            incrementAttempts: true,
            lastScore: resultValue === true ? 1 : resultValue === 'partial' ? 0.5 : 0,
          }),
        });
        // Log a generic activity event (question attempt)
        logActivity('open_question_attempt', () => {
          window.dispatchEvent(new CustomEvent('activity-attempt'));
        });
      } catch {}
    }
  };

  const handleQuestionUpdated = async () => {
    try {
      const res = await fetch(`/api/questions/${question.id}`, { credentials: 'include' });
      if (!res.ok) return;
      const q = await res.json();
      const updates: Partial<Question> = {
        text: q.text,
        explanation: q.explanation,
        correctAnswers: q.correctAnswers,
        correct_answers: q.correctAnswers,
        course_reminder: q.courseReminder ?? q.course_reminder,
        number: q.number,
        session: q.session,
        media_url: q.mediaUrl ?? q.media_url,
        media_type: q.mediaType ?? q.media_type,
        course_reminder_media_url: q.courseReminderMediaUrl ?? q.course_reminder_media_url,
        course_reminder_media_type: q.courseReminderMediaType ?? q.course_reminder_media_type,
      };
      onQuestionUpdate?.(question.id, updates);
    } catch {}
  };

  // Compute expected reference answer (memoized)
  const expectedReference = useMemo(() => {
    const correctArr: string[] = (question as any).correctAnswers || (question as any).correct_answers || [];
    const expectedFromArray = Array.isArray(correctArr) && correctArr.length > 0 ? correctArr.filter(Boolean).join(' / ') : '';
    const expected = expectedFromArray || (question as any).course_reminder || (question as any).courseReminder || question.explanation || (question as any).correctAnswer || '';
    return expected || '';
  }, [question]);

  // Admin function to toggle question visibility
  const handleToggleVisibility = async () => {
    if (!isAdmin || !onQuestionUpdate) return;
    
  const effectiveHidden = localHidden ?? !!question.hidden;
  const newHiddenStatus = !effectiveHidden;
    
    // Optimistically update the UI
  setLocalHidden(newHiddenStatus);
  onQuestionUpdate(question.id, { hidden: newHiddenStatus });
    
    try {
      setIsTogglingVisibility(true);
      const response = await fetch(`/api/questions/${question.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          hidden: newHiddenStatus
        }),
      });

      if (!response.ok) {
        // Revert the optimistic update on error
        setLocalHidden(undefined);
        onQuestionUpdate(question.id, { hidden: question.hidden });
        toast({
          title: "Error",
          description: "Failed to update question visibility",
          variant: "destructive",
        });
      } else {
        toast({
          title: newHiddenStatus ? 'Question hidden' : 'Question unhidden',
          description: newHiddenStatus
            ? 'The question is now hidden from students.'
            : 'The question is now visible to students.',
        });
      }
    } catch (error) {
      // Revert the optimistic update on error
      setLocalHidden(undefined);
      onQuestionUpdate(question.id, { hidden: question.hidden });
      toast({
        title: "Error",
        description: "Failed to update question visibility",
        variant: "destructive",
      });
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  // Reset question state to allow re-answering
  const handleReAnswer = () => {
    // Allow user to try again: clear evaluation state but keep original answer for optional review? For now clear.
    setAnswer('');
    setSubmitted(false);
    setShowSelfAssessment(false);
    setAssessmentCompleted(false);
    setHasSubmitted(false);
    hasSubmittedRef.current = false;
    // Scroll back to input smoothly
    requestAnimationFrame(() => {
      const textarea = document.querySelector<HTMLTextAreaElement>('textarea');
      if (textarea) {
        textarea.focus();
      }
    });
  };

  // Keyboard shortcuts: Enter to submit (or next), 1/2/3 to rate during self-assessment
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable === true
      );

      // When self-assessment is visible, map 1/2/3 to correct/partial/wrong
      if (showSelfAssessment && (!hideImmediateResults || showDeferredSelfAssessment)) {
        if (['1', '2', '3'].includes(event.key)) {
          event.preventDefault();
          const map: Record<string, 'correct' | 'partial' | 'wrong'> = {
            '1': 'correct',
            '2': 'partial',
            '3': 'wrong',
          };
          handleSelfAssessment(map[event.key]);
        }
        return; // don’t fall through to Enter handling while assessing
      }

      // Submit with Enter (only when not typing in inputs, textarea handles its own Enter)
      if (!submitted && !isTyping && event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (answer.trim()) {
          handleSubmit();
        }
        return;
      }

      // Next question with Enter after assessment is complete
      if (submitted && assessmentCompleted && !isTyping && event.key === 'Enter') {
        event.preventDefault();
        onNext();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSelfAssessment, hideImmediateResults, showDeferredSelfAssessment, submitted, assessmentCompleted, answer]);

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
            lectureTitle={lectureTitle}
            specialtyName={specialtyName}
            questionId={question.id}
            highlightConfirm={highlightConfirm}
            hideMeta={hideMeta}
          />
          {/* Inline media attached to the question (not the reminder) */}
          {(() => {
            const mediaUrl = (question as any).media_url || (question as any).mediaUrl;
            const mediaType = (question as any).media_type || (question as any).mediaType;
            if (!mediaUrl) return null;
            const isImageByExt = /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(mediaUrl);
            const isImage = mediaType === 'image' || (!mediaType && isImageByExt);
            if (!isImage) return null;
            return (
              <div className="mt-3">
                <ZoomableImage
                  src={mediaUrl}
                  alt="Illustration de la question"
                  thumbnailClassName="max-h-64 w-auto sm:max-h-80 max-w-full rounded-md border object-contain shadow-sm"
                />
              </div>
            );
          })()}
        </div>

  {!hideActions && (
  <div className="flex flex-col gap-1 flex-shrink-0 items-end">
          <div className="flex gap-2 items-center">
            <Button 
              variant="outline" 
              size="sm"
              onClick={isPinned ? handleUnpinQuestion : handlePinQuestion}
              className="flex items-center gap-1"
            >
              {isPinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{isPinned ? 'Unpin' : 'Pin'}</span>
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsReportDialogOpen(true)}
              className="flex items-center gap-1"
              title="Signaler"
            >
              <Flag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Signaler</span>
            </Button>
          </div>
          {/* Comment panel removed for grouped context */}
          {(isAdmin || isMaintainer) && (
            <div className="flex gap-2 items-center mt-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="flex items-center gap-1"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleVisibility}
                disabled={isTogglingVisibility}
                className="flex items-center gap-1"
                title={(localHidden ?? !!question.hidden) ? 'Unhide question' : 'Hide question'}
              >
                {(localHidden ?? !!question.hidden) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Delete this question?')) return;
                    try {
                      const res = await fetch(`/api/questions/${question.id}`, { method: 'DELETE', credentials: 'include' });
                      if (!res.ok) throw new Error('Failed');
                      window.location.reload();
                    } catch (e) {
                      toast({ title: 'Error', description: 'Failed to delete question', variant: 'destructive' });
                    }
                  }}
                  className="flex items-center gap-1 text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
  )}
      </div>
      
  {/* Media is now displayed inside the "Rappel du cours" section on the page */}

    {(!submitted || keepInputAfterSubmit) && (
        <OpenQuestionInput
          answer={answer}
          setAnswer={setAnswer}
      isSubmitted={submitted && !keepInputAfterSubmit}
          onSubmit={handleSubmit}
        />
      )}

  {/* Reference answer now shown inside self-assessment panel */}

  {/* Persistent reference + user answer block (including during self-assessment) */}
  {(() => {
    const canShowReference = submitted && expectedReference && (!hideImmediateResults || showSelfAssessment || assessmentCompleted || showDeferredSelfAssessment);
    if (!canShowReference) return null;
    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-md border border-emerald-200 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/60 p-5 shadow-sm">
          <div className="text-xs md:text-sm uppercase tracking-wide font-extrabold text-emerald-700 dark:text-emerald-100 mb-2">RÉPONSE DE RÉFÉRENCE</div>
          <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-medium text-emerald-800 dark:text-emerald-50">{expectedReference}</div>
        </div>
        <div className="rounded-md border border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-950/40 p-4 shadow-sm">
          <div className="text-[11px] uppercase tracking-wide font-semibold text-blue-700 dark:text-blue-300 mb-1">Votre réponse</div>
          <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base font-medium text-blue-800 dark:text-blue-100">{answer || <span className="italic opacity-70">(vide)</span>}</div>
        </div>
      </div>
    );
  })()}

  {showSelfAssessment && (!hideImmediateResults || showDeferredSelfAssessment) && (
        <OpenQuestionSelfAssessment
          onAssessment={handleSelfAssessment}
          userAnswerText={submitted ? answer : undefined}
        />
      )}

      {!hideActions && (
        <OpenQuestionActions
          isSubmitted={submitted}
          canSubmit={!hasSubmitted && answer.trim().length > 0}
          onSubmit={handleSubmit}
          onNext={onNext}
          showNext={assessmentCompleted}
          onReAnswer={handleReAnswer}
          hasSubmitted={hasSubmitted}
          showNotesArea={showNotesArea}
          onToggleNotes={() => {
            setShowNotesArea(prev => !prev);
            setTimeout(() => {
              if (!showNotesArea && notesRef.current) {
                notesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 30);
          }}
        />
      )}

  {/* Rappel du cours (après soumission) */}
  {submitted && !suppressReminder && (() => {
    const text = (question as any).course_reminder || (question as any).courseReminder || question.explanation;
    const reminderMediaUrl = (question as any).course_reminder_media_url || (question as any).courseReminderMediaUrl;
    const reminderMediaType = (question as any).course_reminder_media_type || (question as any).courseReminderMediaType;
    if (!text && !reminderMediaUrl) return null;
    return (
      <Card className="mt-2">
        <CardHeader className="py-3">
          <Collapsible defaultOpen={false}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4" />
                Rappel du cours
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="px-2 group">
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-3">
                {reminderMediaUrl && (reminderMediaType === 'image' || /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(reminderMediaUrl)) && (
                  <ZoomableImage src={reminderMediaUrl} alt="Image du rappel" />
                )}
                {text && (
                  <div className="prose dark:prose-invert max-w-none text-sm">
                    <div className="whitespace-pre-wrap text-foreground">{text}</div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>
    );
  })()}

  {/* Notes & comments only when user chooses to open */}
  {submitted && showNotesArea && !hideNotes && (
        <div ref={notesRef}>
          <QuestionNotes questionId={question.id} />
        </div>
      )}
  {/* Comments (after submission) */}
  {submitted && !hideComments && <QuestionComments questionId={question.id} />}
      
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
