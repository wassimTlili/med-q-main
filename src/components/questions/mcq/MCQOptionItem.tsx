
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MCQOptionItemProps {
  option: {
    id: string;
    text: string;
    explanation?: string;
  };
  index: number;
  isSelected: boolean;
  isSubmitted: boolean;
  isCorrect: boolean;
  explanation?: string;
  onSelect: (id: string) => void;
  expandedExplanations: string[];
  toggleExplanation: (id: string) => void;
  hideImmediateResults?: boolean;
}

export function MCQOptionItem({
  option,
  index,
  isSelected,
  isSubmitted,
  isCorrect,
  explanation,
  onSelect,
  expandedExplanations,
  toggleExplanation,
  hideImmediateResults = false
}: MCQOptionItemProps) {
  // Get expanded state from parent component
  const isExpanded = expandedExplanations.includes(option.id);
  
  // Determine option letter (A, B, C, D, etc.)
  const optionLetter = String.fromCharCode(65 + index);
  
  // Background color based on state
  let bgColorClass = 'bg-card dark:bg-card';
  let borderColorClass = 'border-gray-200 dark:border-gray-700';
  let textColorClass = 'text-foreground';
  
  if (isSubmitted && !hideImmediateResults) {
    if (isSelected && isCorrect) {
      bgColorClass = 'bg-green-50 dark:bg-green-900/20';
      borderColorClass = 'border-green-300 dark:border-green-700';
    } else if (isSelected && !isCorrect) {
      bgColorClass = 'bg-red-50 dark:bg-red-900/20';
      borderColorClass = 'border-red-300 dark:border-red-700';
    } else if (!isSelected && isCorrect) {
      bgColorClass = 'bg-amber-50 dark:bg-amber-900/20';
      borderColorClass = 'border-amber-300 dark:border-amber-700';
      textColorClass = 'text-amber-700 dark:text-amber-300';
    }
  } else if (isSelected) {
    bgColorClass = 'bg-primary-50 dark:bg-primary/20';
    borderColorClass = 'border-primary-200 dark:border-primary/30';
  }
  
  return (
    <div 
      className={`rounded-lg border ${borderColorClass} p-4 ${bgColorClass} transition-colors duration-200 w-full max-w-full`}
      onClick={() => onSelect(option.id)}
    >
      <div className="flex items-start gap-3 w-full">
        <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center 
          ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          {optionLetter}
        </div>
        
        <div className="flex-grow min-w-0">
          <p className={`${textColorClass} break-words`}>{option.text}</p>
          
          {isSubmitted && !hideImmediateResults && option.explanation && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExplanation(option.id);
                  }}
                  className="text-sm text-muted-foreground flex items-center hover:text-primary transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide explanation
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Show explanation
                    </>
                  )}
                </button>
              </div>
              
              {isExpanded && (
                <div className="mt-2 text-sm pl-2 border-l-2 border-muted py-2 text-foreground">
                  {option.explanation}
                </div>
              )}
            </div>
          )}
        </div>
        
        {isSelected && (
          <div className={`flex-shrink-0 h-5 w-5 rounded border ${isSelected ? 'border-primary bg-primary' : 'border-muted bg-background'} flex items-center justify-center`}>
            {isSelected && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-white dark:text-black">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
