
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="flex justify-between mt-6">
      {showPrevious && onPrevious && (
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
      )}
      
      <div className={`flex gap-2 ${showPrevious ? 'ml-auto' : ''}`}>
        {!isSubmitted ? (
          <Button 
            onClick={onSubmit} 
            disabled={hasSubmitted || !canSubmit}
            className="flex items-center gap-1"
          >
            {hasSubmitted ? "Répondu" : "Submit"}
          </Button>
        ) : (
          <div className="flex gap-2">
            {onReAnswer && (
              <Button 
                variant="outline"
                onClick={onReAnswer}
              >
                Re-answer
              </Button>
            )}
            {showNext && (
              <Button 
                onClick={onNext}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
