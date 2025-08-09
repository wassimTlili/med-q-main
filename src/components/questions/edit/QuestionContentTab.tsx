
import { QuestionType } from '@/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

interface QuestionContentTabProps {
  questionText: string;
  setQuestionText: (text: string) => void;
  courseReminder: string;
  setCourseReminder: (text: string) => void;
  questionType: QuestionType;
  questionNumber: number | undefined;
  setQuestionNumber: (number: number | undefined) => void;
  session: string;
  setSession: (session: string) => void;
}

export function QuestionContentTab({
  questionText,
  setQuestionText,
  courseReminder,
  setCourseReminder,
  questionType,
  questionNumber,
  setQuestionNumber,
  session,
  setSession
}: QuestionContentTabProps) {
  const { t } = useTranslation();
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="question-number">{t('questions.questionNumber')}</Label>
          <Input 
            id="question-number"
            type="number"
            placeholder={t('questions.enterQuestionNumber')}
            value={questionNumber === undefined ? '' : questionNumber}
            onChange={(e) => {
              const value = e.target.value;
              setQuestionNumber(value === '' ? undefined : parseInt(value, 10));
            }}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="session">{t('questions.session')}</Label>
          <Input 
            id="session"
            placeholder={`${t('questions.examplePrefix')} Session 2022`}
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="question-text">{t('questions.questionText')}</Label>
        <Textarea
          id="question-text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={t('questions.enterQuestionText')}
          className="min-h-24"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="course-reminder">
          {questionType === 'mcq' ? t('questions.courseReminder') : t('questions.referenceAnswer')}
        </Label>
        <Textarea
          id="course-reminder"
          value={courseReminder}
          onChange={(e) => setCourseReminder(e.target.value)}
          placeholder={questionType === 'mcq' 
            ? t('questions.enterReminderText')
            : t('questions.enterReferenceAnswer')}
          className="min-h-32"
        />
      </div>
    </>
  );
}
