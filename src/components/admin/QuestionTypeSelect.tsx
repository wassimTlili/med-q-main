
import { Label } from '@/components/ui/label';
import { HelpCircle, PenLine, Stethoscope } from 'lucide-react';
import { QuestionType } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';

interface QuestionTypeSelectProps {
  questionType: QuestionType;
  setQuestionType: (type: QuestionType) => void;
}

export function QuestionTypeSelect({ questionType, setQuestionType }: QuestionTypeSelectProps) {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-2">
      <Label htmlFor="question-type">{t('admin.questionType')}</Label>
      <Select 
        value={questionType} 
        onValueChange={(value: QuestionType) => setQuestionType(value)}
      >
        <SelectTrigger id="question-type" className="w-full">
          <SelectValue placeholder={t('admin.selectQuestionType')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="mcq">
            <div className="flex items-center">
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>{t('questions.mcq')}</span>
            </div>
          </SelectItem>
          <SelectItem value="qroc">
            <div className="flex items-center">
              <PenLine className="mr-2 h-4 w-4" />
              <span>{t('questions.open')}</span>
            </div>
          </SelectItem>
          <SelectItem value="clinic_mcq">
            <div className="flex items-center">
              <Stethoscope className="mr-2 h-4 w-4" />
              <span>{t('questions.casCliniqueQcm')}</span>
            </div>
          </SelectItem>
          <SelectItem value="clinic_croq">
            <div className="flex items-center">
              <Stethoscope className="mr-2 h-4 w-4" />
              <span>{t('questions.casCliniqueQroc')}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
