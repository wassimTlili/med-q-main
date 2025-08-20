
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface OpenQuestionActionsProps {
  isSubmitted: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  onNext: () => void;
  onPrevious?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
  onReAnswer?: () => void;
  hasSubmitted?: boolean; // Track if question has been submitted (for clinical cases)
}

export function OpenQuestionActions({
  isSubmitted,
  canSubmit,
  onSubmit,
  onNext,
  onPrevious,
  showPrevious = false,
  showNext = true,
  onReAnswer,
  hasSubmitted = false
}: OpenQuestionActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-6">
      {showPrevious && onPrevious && (
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-1 w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Précédent</span>
        </Button>
      )}
      
      <div className={`flex gap-2 ${showPrevious ? 'sm:ml-auto' : ''} justify-end flex-wrap`}>
        {!isSubmitted ? (
          <Button 
            onClick={onSubmit} 
            disabled={hasSubmitted || !canSubmit}
            className="flex items-center gap-1 w-full sm:w-auto"
          >
            {hasSubmitted ? "Répondu" : "Soumettre"}
          </Button>
        ) : (
          <div className="flex gap-2">
            {onReAnswer && (
              <Button 
                variant="outline"
                onClick={onReAnswer}
              >
                <RotateCcw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Répondre à nouveau</span>
              </Button>
            )}
            {showNext && (
              <Button 
                onClick={onNext}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Suivant</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
