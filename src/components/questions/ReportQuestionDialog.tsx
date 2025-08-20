
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Question } from '@/types';
import { toast } from '@/hooks/use-toast';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Non authentifié',
        description: 'Veuillez vous connecter.',
        variant: "destructive",
      });
      return;
    }
    
    if (!reason.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'La raison est requise',
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
        title: 'Succès',
        description: 'Votre rapport a été soumis. Merci !',
      });
      
      // Reset form and close dialog
      setReason('');
      onOpenChange(false);
      
    } catch (error: unknown) {
      console.error('Error submitting report:', error);
  let errorMessage = 'Veuillez réessayer.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[95vw] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Signaler la question</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2 sm:mt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Raison</Label>
            <Textarea 
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={'Décrivez le problème (erreur, ambiguïté, image manquante, etc.)...'}
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
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
