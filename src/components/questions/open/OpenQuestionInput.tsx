
import { ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';

interface OpenQuestionInputProps {
  answer: string;
  setAnswer: (answer: string) => void;
  isSubmitted: boolean;
  onSubmit?: () => void; // optional submit handler for Enter key
}

export function OpenQuestionInput({ answer, setAnswer, isSubmitted, onSubmit }: OpenQuestionInputProps) {
  const { t } = useTranslation();
  
  const handleAnswerChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (isSubmitted) return;
    setAnswer(e.target.value);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isSubmitted) return; // textarea is typically disabled when submitted, but guard anyway
    // Shift+Enter should insert a newline; plain Enter should submit
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent newline insertion
      e.preventDefault();
      if (onSubmit && answer.trim()) {
        onSubmit();
      }
    }
  };
  
  return (
    <div className="space-y-2 w-full">
      <Textarea
        placeholder={t('questions.answerText')}
        value={answer}
        onChange={handleAnswerChange}
        onKeyDown={handleKeyDown}
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
