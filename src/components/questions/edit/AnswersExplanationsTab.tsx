
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface AnswersExplanationsTabProps {
  options: { id: string; text: string; explanation?: string }[];
  correctAnswers: string[];
  updateOptionText: (id: string, text: string) => void;
  updateOptionExplanation: (id: string, explanation: string) => void;
  toggleCorrectAnswer: (id: string) => void;
}

export function AnswersExplanationsTab({
  options,
  correctAnswers,
  updateOptionText,
  updateOptionExplanation,
  toggleCorrectAnswer
}: AnswersExplanationsTabProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-4">
      {options.map((option, index) => (
        <div key={option.id} className="border rounded-md p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center font-medium bg-muted">
              {String.fromCharCode(65 + index)}
            </div>
            
            <div className="flex-grow space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`option-text-${option.id}`}>{t('questions.answerText')}</Label>
                <Input
                  id={`option-text-${option.id}`}
                  value={option.text}
                  onChange={(e) => updateOptionText(option.id, e.target.value)}
                  placeholder={`${t('questions.option')} ${String.fromCharCode(65 + index)} ${t('questions.optionText')}`}
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor={`option-explanation-${option.id}`}>{t('questions.explanation')}</Label>
                <Textarea
                  id={`option-explanation-${option.id}`}
                  value={option.explanation || ''}
                  onChange={(e) => updateOptionExplanation(option.id, e.target.value)}
                  placeholder={t('questions.explanationPlaceholder')}
                  className="min-h-20"
                />
              </div>
            </div>
            
            <Button
              type="button"
              variant={correctAnswers.includes(option.id) ? "default" : "outline"}
              size="sm"
              className="flex-shrink-0"
              onClick={() => toggleCorrectAnswer(option.id)}
            >
              {correctAnswers.includes(option.id) ? t('questions.correct') : t('questions.markAsCorrect')}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
