
import { QuestionType } from '@/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Image, X } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface QuestionContentTabProps {
  questionText: string;
  setQuestionText: (text: string) => void;
  courseReminder: string;
  setCourseReminder: (text: string) => void;
  questionType: QuestionType;
  questionNumber: number | undefined;
  setQuestionNumber: (number: number | undefined) => void;
  session: string;
  setSession: (session: string) => void;
  // Image for the question (from bulk import or manual upload)
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  onMediaChange?: (url: string | undefined, type: 'image' | 'video' | undefined) => void;
  // Image for rappel section
  reminderMediaUrl?: string;
  reminderMediaType?: 'image' | 'video';
  onReminderMediaChange?: (url: string | undefined, type: 'image' | 'video' | undefined) => void;
}

export function QuestionContentTab({
  questionText,
  setQuestionText,
  courseReminder,
  setCourseReminder,
  questionType,
  questionNumber,
  setQuestionNumber,
  session,
  setSession,
  mediaUrl,
  mediaType,
  onMediaChange,
  reminderMediaUrl,
  reminderMediaType,
  onReminderMediaChange
}: QuestionContentTabProps) {
  const handleImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onMediaChange) return;
    if (!file.type.startsWith('image/')) {
      // silently ignore non-images for now
      return;
    }
    // Use Data URL so it persists in DB (blob: URLs break after reload)
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      onMediaChange?.(dataUrl, dataUrl ? 'image' : undefined);
    };
    reader.readAsDataURL(file);
    // clear input
    e.currentTarget.value = '';
  };
  const handleReminderImagePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onReminderMediaChange) return;
    if (!file.type.startsWith('image/')) return;
    // Use Data URL so it persists in DB (blob: URLs break after reload)
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
      onReminderMediaChange?.(dataUrl, dataUrl ? 'image' : undefined);
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = '';
  };
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="question-number">Numéro de question</Label>
          <Input 
            id="question-number"
            type="number"
            placeholder="Entrer le numéro de la question"
            value={questionNumber === undefined ? '' : questionNumber}
            onChange={(e) => {
              const value = e.target.value;
              setQuestionNumber(value === '' ? undefined : parseInt(value, 10));
            }}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="session">Session</Label>
          <Input 
            id="session"
            placeholder="Ex: Session 2022"
            value={session}
            onChange={(e) => setSession(e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="question-text">Énoncé de la question</Label>
        <Textarea
          id="question-text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder="Saisir l'énoncé de la question"
          className="min-h-24"
        />
        {/* Image de la question: ajouter ici pour éviter toute confusion avec l'image du rappel */}
        {onMediaChange && (
          <div className="mt-2">
            <Button type="button" variant="outline" size="sm" className="relative">
              <Image className="h-4 w-4 mr-2" /> Image de la question
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleImagePick}
              />
            </Button>
          </div>
        )}
        {/* Aperçu de l'image de la question */}
        {mediaUrl && mediaType === 'image' && (
          <div className="mt-2 border rounded-md p-3 bg-muted/30">
            <div className="aspect-video relative bg-muted rounded-md overflow-hidden">
              <img src={mediaUrl} alt="Image de la question" className="w-full h-full object-contain" />
            </div>
            {onMediaChange && (
              <div className="flex justify-end mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onMediaChange(undefined, undefined)}>
                  <X className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
  {/* Rappel du cours removed here; handled once in parent edit component */}
    </>
  );
}
