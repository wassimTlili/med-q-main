
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ArrowRight, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MCQActionsProps {
  isSubmitted: boolean;
  canSubmit: boolean;
  isCorrect: boolean | null;
  onSubmit: () => void;
  onNext: () => void;
  onReAnswer?: () => void;
  hasSubmitted?: boolean; // Track if question has been submitted (for clinical cases)
  buttonRef?: React.RefObject<HTMLButtonElement>; // Ref for direct button control
}

export function MCQActions({ 
  isSubmitted, 
  canSubmit, 
  isCorrect, 
  onSubmit, 
  onNext,
  onReAnswer,
  hasSubmitted = false,
  buttonRef
}: MCQActionsProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex justify-between pt-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-xs text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5 mr-1" />
              <span>
                {isSubmitted ? "Spacebar: Next" : "1-5: Select options, Spacebar: Submit"}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-4">
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold">Keyboard Shortcuts:</h4>
              <ul className="space-y-1.5">
                <li className="flex justify-between">
                  <span className="font-mono bg-muted px-1.5 rounded text-xs">1-5</span>
                  <span>Select answer options A-E</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-mono bg-muted px-1.5 rounded text-xs">Spacebar</span>
                  <span>{isSubmitted ? "Next question" : "Submit answer"}</span>
                </li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!isSubmitted ? (
        <Button 
          ref={buttonRef}
          onClick={onSubmit} 
          disabled={hasSubmitted || !canSubmit}
          className="ml-auto"
        >
          {hasSubmitted ? "Répondu" : t('questions.submitAnswer')}
        </Button>
      ) : (
        <div className="flex items-center ml-auto gap-2">
          <div className="flex items-center mr-4">
            {isCorrect ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">{t('questions.correct')}</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">{t('questions.incorrect')}</span>
              </div>
            )}
          </div>
          {onReAnswer && (
            <Button 
              variant="outline" 
              onClick={onReAnswer}
              className="mr-2"
            >
              {t('questions.reAnswer')}
            </Button>
          )}
          <Button onClick={onNext} className="group">
            {t('questions.nextQuestion')}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
