
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Question } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface ReportQuestionDialogProps {
  question: Question;
  lectureId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportQuestionDialog({ 
  question, 
  lectureId,
  isOpen, 
  onOpenChange 
}: ReportQuestionDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t('auth.notAuthenticated'),
        description: t('auth.pleaseSignIn'),
        variant: "destructive",
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: t('reports.validationError'),
        description: t('reports.reasonRequired'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId: question.id,
          lectureId: lectureId,
          message: reason.trim(),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }
      
      toast({
        title: t('reports.success'),
        description: t('reports.reportSubmitted'),
      });
      
      // Reset form and close dialog
      setReason('');
      onOpenChange(false);
      
    } catch (error: any) {
      console.error('Error submitting report:', error);
      let errorMessage = t('common.tryAgain');
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('reports.reportQuestion')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('reports.reason')}</Label>
            <Textarea 
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reports.reasonPlaceholder')}
              required
              rows={4}
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('reports.submitting') : t('reports.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
