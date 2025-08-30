import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OpenQuestionSelfAssessmentProps {
  onAssessment: (rating: 'correct' | 'wrong' | 'partial') => void;
  userAnswerText?: string;
}

export function OpenQuestionSelfAssessment({ onAssessment, userAnswerText }: OpenQuestionSelfAssessmentProps) {
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
      <div className="p-4 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium mb-3 text-blue-900 dark:text-blue-200">
          {t('questions.rateYourAnswer')}{":"}
        </h4>

  {/* Removed duplicate user answer display per request */}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="lg"
            className="w-full sm:w-auto gap-3 bg-green-600/90 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200 transform-gpu hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-green-400"
            onClick={() => handleRatingSelect('correct')}
          >
            <CheckCircle className="h-5 w-5" />
            {t('questions.correct')}
          </Button>

          <Button
            size="lg"
            className="w-full sm:w-auto gap-3 bg-amber-500/90 hover:bg-amber-500 text-white shadow-md hover:shadow-lg transition-all duration-200 transform-gpu hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-amber-400"
            onClick={() => handleRatingSelect('partial')}
          >
            <MinusCircle className="h-5 w-5" />
            {t('questions.partiallyCorrect')}
          </Button>

          <Button
            size="lg"
            className="w-full sm:w-auto gap-3 bg-red-600/90 hover:bg-red-600 text-white shadow-md hover:shadow-lg transition-all duration-200 transform-gpu hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-red-400"
            onClick={() => handleRatingSelect('wrong')}
          >
            <XCircle className="h-5 w-5" />
            {t('questions.incorrect')}
          </Button>
        </div>
      </div>
    </motion.div>
  );
} 