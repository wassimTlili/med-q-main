
import { ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface OpenQuestionInputProps {
  answer: string;
  setAnswer: (answer: string) => void;
  isSubmitted: boolean;
}

export function OpenQuestionInput({ answer, setAnswer, isSubmitted }: OpenQuestionInputProps) {
  const { t } = useTranslation();
  
  const handleAnswerChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (isSubmitted) return;
    setAnswer(e.target.value);
  };
  
  return (
    <div className="space-y-2 w-full">
      <Textarea
        placeholder={t('questions.answerText')}
        value={answer}
        onChange={handleAnswerChange}
        rows={6}
        disabled={isSubmitted}
        className={`
          resize-none transition-all duration-200 w-full max-w-full
          ${isSubmitted ? 'bg-muted' : ''}
        `}
      />
    </div>
  );
}
