
import { Question } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionContentTab } from './QuestionContentTab';
import { AnswersExplanationsTab } from './AnswersExplanationsTab';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaUpload } from '@/components/admin/MediaUpload';
import { Separator } from '@/components/ui/separator';

interface QuestionEditContentProps {
  question: Question;
  questionText: string;
  setQuestionText: (text: string) => void;
  courseReminder: string;
  setCourseReminder: (text: string) => void;
  questionNumber: number | undefined;
  setQuestionNumber: (number: number | undefined) => void;
  session: string;
  setSession: (session: string) => void;
  options: { id: string; text: string; explanation?: string }[];
  updateOptionText: (id: string, text: string) => void;
  updateOptionExplanation: (id: string, explanation: string) => void;
  correctAnswers: string[];
  toggleCorrectAnswer: (id: string) => void;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  handleMediaChange: (url: string | undefined, type: 'image' | 'video' | undefined) => void;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function QuestionEditContent({
  question,
  questionText,
  setQuestionText,
  courseReminder,
  setCourseReminder,
  questionNumber,
  setQuestionNumber,
  session,
  setSession,
  options,
  updateOptionText,
  updateOptionExplanation,
  correctAnswers,
  toggleCorrectAnswer,
  mediaUrl,
  mediaType,
  handleMediaChange,
  isLoading,
  onCancel,
  onSubmit
}: QuestionEditContentProps) {
  const [activeTab, setActiveTab] = useState<string>("content");
  const { t } = useTranslation();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full">
        <TabsTrigger value="content" className="flex-1">{t('questions.questionContent')}</TabsTrigger>
        <TabsTrigger value="media" className="flex-1">{t('questions.media')}</TabsTrigger>
        {(question.type === 'mcq' || question.type === 'clinic_mcq') && (
          <TabsTrigger value="answers" className="flex-1">{t('questions.answersExplanations')}</TabsTrigger>
        )}
      </TabsList>
      
      <form onSubmit={onSubmit} className="space-y-4 mt-4">
        <TabsContent value="content" className="space-y-4">
          <QuestionContentTab
            questionText={questionText}
            setQuestionText={setQuestionText}
            courseReminder={courseReminder}
            setCourseReminder={setCourseReminder}
            questionType={question.type}
            questionNumber={questionNumber}
            setQuestionNumber={setQuestionNumber}
            session={session}
            setSession={setSession}
          />
        </TabsContent>
        
        <TabsContent value="media" className="space-y-4">
          <MediaUpload 
            mediaUrl={mediaUrl}
            mediaType={mediaType}
            onMediaChange={handleMediaChange}
          />
        </TabsContent>
        
        {(question.type === 'mcq' || question.type === 'clinic_mcq') && (
          <TabsContent value="answers" className="space-y-4">
            <AnswersExplanationsTab
              options={options}
              correctAnswers={correctAnswers}
              updateOptionText={updateOptionText}
              updateOptionExplanation={updateOptionExplanation}
              toggleCorrectAnswer={toggleCorrectAnswer}
            />
          </TabsContent>
        )}
        
        <Separator className="my-2" />
        
        <div className="flex justify-end pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="mr-2"
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('questions.saving') : t('questions.saveChanges')}
          </Button>
        </div>
      </form>
    </Tabs>
  );
}
