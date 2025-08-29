
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuestionForm } from '@/hooks/use-question-form';
import { QuestionFormSubmit } from './QuestionFormSubmit';
import { QuestionTypeSelect } from './QuestionTypeSelect';
import { QuestionFields } from './QuestionFields';
import { McqOptionsSection } from './McqOptionsSection';
import { AutoParseInput } from './AutoParseInput';
import { FormActionButtons } from './FormActionButtons';
import { MediaUpload } from './MediaUpload';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

interface QuestionFormProps {
  lectureId: string;
  editQuestionId?: string;
  onComplete?: () => void;
}

export function QuestionForm({ lectureId, editQuestionId, onComplete }: QuestionFormProps) {
  const router = useRouter();
  const {
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
    handleParsedContent
  } = useQuestionForm({ lectureId, editQuestionId, onComplete });

  const handleCancel = () => {
    if (onComplete) {
      onComplete();
    } else {
      router.push(`/admin/lecture/${lectureId}`);
    }
  };

  return (
    <Card className={onComplete ? "w-full border-0 shadow-none" : "w-full max-w-3xl mx-auto"}>
      {!onComplete && (
        <CardHeader>
          <CardTitle>{editQuestionId ? 'Edit Question' : 'Create New Question'}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <form onSubmit={async (e) => {
          e.preventDefault();
          
          if (!questionText.trim()) {
            toast({
              title: "Validation Error",
              description: "Question text is required",
              variant: "destructive",
            });
            return;
          }
          
          setIsLoading(true);
          
          try {
            const questionData = {
              type: questionType,
              text: questionText,
              courseReminder,
              questionNumber,
              session,
              options: (questionType === 'mcq' || questionType === 'clinic_mcq') ? options : undefined,
              correctAnswers: (questionType === 'mcq' || questionType === 'clinic_mcq') ? correctAnswers : undefined,
              mediaUrl,
              mediaType
            };
            
            const response = await fetch('/api/questions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                ...questionData,
                lectureId: lectureId
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to create question');
            }
            
            toast({
              title: "Success",
              description: "Question created successfully",
            });
            
            onComplete?.();
            
                    } catch (error: unknown) {
            console.error('Error creating question:', error);
            const errorMessage = error instanceof Error && error.message 
              ? error.message 
              : "Failed to create question";
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            });
          } finally {
            setIsLoading(false);
          }
        }}>
          <QuestionTypeSelect 
            questionType={questionType} 
            setQuestionType={setQuestionType} 
          />
          
          {/* Auto parse available on create for MCQ, clinical MCQ, QROC, and clinical CROQ */}
          {(questionType === 'mcq' || questionType === 'clinic_mcq' || questionType === 'qroc' || questionType === 'clinic_croq') && (
            <div className="my-4">
              <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Parsing automatique</div>
              <AutoParseInput questionType={questionType} onParsedContent={handleParsedContent} />
            </div>
          )}
          
          <QuestionFields 
            questionText={questionText}
            setQuestionText={setQuestionText}
            courseReminder={courseReminder}
            setCourseReminder={setCourseReminder}
            questionType={questionType}
            questionNumber={questionNumber}
            setQuestionNumber={setQuestionNumber}
            session={session}
            setSession={setSession}
          />
          
          <Separator className="my-6" />
          
          <MediaUpload
            mediaUrl={mediaUrl}
            mediaType={mediaType}
            onMediaChange={handleMediaChange}
          />
          
          {(questionType === 'mcq' || questionType === 'clinic_mcq') && (
            <>
              <Separator className="my-6" />
              <McqOptionsSection
                options={options}
                setOptions={setOptions}
                correctAnswers={correctAnswers}
                setCorrectAnswers={setCorrectAnswers}
              />
            </>
          )}
          
          <FormActionButtons 
            isLoading={isLoading} 
            onCancel={handleCancel} 
            isEdit={!!editQuestionId} 
          />
        </form>
      </CardContent>
    </Card>
  );
}
