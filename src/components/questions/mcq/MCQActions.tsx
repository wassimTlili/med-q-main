
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ArrowRight, Keyboard, RotateCcw, StickyNote } from 'lucide-react';
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
  showNotesArea?: boolean;
  onToggleNotes?: () => void;
}

export function MCQActions({ 
  isSubmitted, 
  canSubmit, 
  isCorrect, 
  onSubmit, 
  onNext,
  onReAnswer,
  hasSubmitted = false,
  buttonRef,
  showNotesArea,
  onToggleNotes
}: MCQActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="hidden sm:flex items-center text-xs text-muted-foreground">
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
          className="sm:ml-auto w-full sm:w-auto"
        >
          {hasSubmitted ? "Répondu" : "Soumettre la réponse"}
        </Button>
      ) : (
        <div className="w-full sm:w-auto sm:ml-auto flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center sm:mr-4">
            {isCorrect ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Correct!</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                <span className="font-medium">Incorrect</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end flex-wrap items-center">
      {onToggleNotes && (
              <Button
                type="button"
                variant="outline"
                size="sm"
        onClick={onToggleNotes}
        className="flex items-center gap-1"
              >
                <StickyNote className="h-4 w-4" />
        <span className="hidden sm:inline">{showNotesArea ? 'Fermer les notes' : 'Prendre une note'}</span>
              </Button>
            )}
            {onReAnswer && (
              <Button 
                variant="outline" 
                onClick={onReAnswer}
                className=""
              >
                <RotateCcw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Répondre à nouveau</span>
              </Button>
            )}
            <Button onClick={onNext} className="group">
              <span className="hidden sm:inline">Question suivante</span>
              <ArrowRight className="sm:ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
