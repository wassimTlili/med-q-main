import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OpenQuestionSelfAssessmentProps {
  onAssessment: (rating: 'correct' | 'wrong' | 'partial') => void;
}

export function OpenQuestionSelfAssessment({ onAssessment }: OpenQuestionSelfAssessmentProps) {
  const { t } = useTranslation();

  const handleRatingSelect = (rating: 'correct' | 'wrong' | 'partial') => {
    // Immediately trigger the assessment when a rating is selected
    onAssessment(rating);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 w-full max-w-full"
    >
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium mb-3 text-blue-800 dark:text-blue-300">
          {t('questions.rateYourAnswer')}
        </h4>
        
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-950/30"
              onClick={() => handleRatingSelect('correct')}
            >
              <CheckCircle className="h-4 w-4" />
              {t('questions.correct')}
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
              onClick={() => handleRatingSelect('partial')}
            >
              <MinusCircle className="h-4 w-4" />
              {t('questions.partiallyCorrect')}
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => handleRatingSelect('wrong')}
            >
              <XCircle className="h-4 w-4" />
              {t('questions.incorrect')}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 