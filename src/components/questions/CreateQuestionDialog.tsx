'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, Image as ImageIcon, X } from 'lucide-react';
import { QuestionType, Option, Lecture } from '@/types';
import { toast } from '@/hooks/use-toast';

interface CreateQuestionDialogProps {
  lecture: Lecture;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionCreated: () => void;
}

export function CreateQuestionDialog({ lecture, isOpen, onOpenChange, onQuestionCreated }: CreateQuestionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    type: 'mcq' as QuestionType,
    explanation: '',
    courseReminder: '',
    session: '',
    number: undefined as number | undefined,
    mediaUrl: '' as string,
    mediaType: undefined as 'image' | 'video' | undefined,
    reminderMediaUrl: '' as string,
    reminderMediaType: undefined as 'image' | 'video' | undefined,
  });
  const makeId = () => `opt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const [options, setOptions] = useState<Option[]>([
    { id: makeId(), text: '', explanation: '' },
    { id: makeId(), text: '', explanation: '' },
    { id: makeId(), text: '', explanation: '' },
    { id: makeId(), text: '', explanation: '' },
  ]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [qrocAnswer, setQrocAnswer] = useState('');

  const resetForm = () => {
    setFormData({
      text: '',
      type: 'mcq' as QuestionType,
      explanation: '',
      courseReminder: '',
      session: '',
      number: undefined,
      mediaUrl: '',
      mediaType: undefined,
      reminderMediaUrl: '',
      reminderMediaType: undefined,
    });
    setOptions([
      { id: makeId(), text: '', explanation: '' },
      { id: makeId(), text: '', explanation: '' },
      { id: makeId(), text: '', explanation: '' },
      { id: makeId(), text: '', explanation: '' },
    ]);
    setCorrectAnswers([]);
    setQrocAnswer('');
  };

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      text: text
    };
    setOptions(newOptions);
  };

  const handleOptionExplanationChange = (index: number, explanation: string) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      explanation,
    };
    setOptions(newOptions);
  };

  const handleQuestionTypeChange = (newType: QuestionType) => {
    setFormData(prev => ({ ...prev, type: newType }));
    
    // Reset options and correct answers when changing to/from MCQ types
    if (newType !== 'mcq' && newType !== 'clinic_mcq') {
      setOptions([]);
      setCorrectAnswers([]);
    } else if (options.length === 0) {
      // Initialize with default options when switching to MCQ types
      setOptions([
        { id: makeId(), text: '', explanation: '' },
        { id: makeId(), text: '', explanation: '' },
        { id: makeId(), text: '', explanation: '' },
        { id: makeId(), text: '', explanation: '' },
      ]);
      setCorrectAnswers([]);
    }
    
    // Reset QROC answer when not QROC type
    if (newType !== 'qroc' && newType !== 'clinic_croq') {
      setQrocAnswer('');
    }
  };

  const addOption = () => {
    const newOption: Option = {
      id: makeId(),
      text: '',
      explanation: ''
    };
    setOptions([...options, newOption]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast({
        title: 'Impossible de supprimer',
        description: 'Une question doit avoir au moins 2 options.',
        variant: 'destructive',
      });
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    
    // Remove from correct answers if it was selected
    const removedOptionId = options[index].id;
    setCorrectAnswers(prev => prev.filter(id => id !== removedOptionId));
  };

  const toggleCorrectAnswer = (optionId: string) => {
    if (correctAnswers.includes(optionId)) {
      setCorrectAnswers(prev => prev.filter(id => id !== optionId));
    } else {
      setCorrectAnswers(prev => [...prev, optionId]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.text.trim()) {
      toast({
        title: 'Erreur de validation',
        description: "Le texte de la question est requis.",
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'mcq' || formData.type === 'clinic_mcq') {
      const validOptions = options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        toast({
          title: 'Erreur de validation',
          description: 'Au moins 2 options sont requises pour un QCM.',
          variant: 'destructive',
        });
        return;
      }

      if (correctAnswers.length === 0) {
        toast({
          title: 'Erreur de validation',
          description: 'Sélectionnez au moins une bonne réponse.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (formData.type === 'qroc' || formData.type === 'clinic_croq') {
      if (!qrocAnswer.trim()) {
        toast({
          title: 'Erreur de validation',
          description: 'La réponse est requise pour une QROC.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const questionData = {
        lectureId: lecture.id,
        text: formData.text.trim(),
        type: formData.type,
        explanation: formData.explanation.trim() || null,
        courseReminder: formData.courseReminder.trim() || null,
        number: formData.number ?? null,
        session: formData.session.trim() || null,
        mediaUrl: formData.mediaUrl || null,
        mediaType: formData.mediaType || null,
        courseReminderMediaUrl: formData.reminderMediaUrl || null,
        courseReminderMediaType: formData.reminderMediaType || null,
        options: (formData.type === 'mcq' || formData.type === 'clinic_mcq')
          ? options.filter(opt => opt.text.trim()).map(o => ({ id: o.id, text: o.text.trim(), explanation: o.explanation?.trim() || '' }))
          : [],
        correctAnswers: (formData.type === 'mcq' || formData.type === 'clinic_mcq') ? correctAnswers : 
                       (formData.type === 'qroc' || formData.type === 'clinic_croq') ? [qrocAnswer.trim()] : [],
      };

      console.log('Creating question with data:', questionData);

      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error creating question:', errorData);
        throw new Error(errorData.error || 'La création de la question a échoué');
      }

      toast({
        title: 'Question créée',
        description: 'La question a été ajoutée au cours.',
      });

      resetForm();
      onQuestionCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'La création a échoué. Réessayez.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-blue-200/60 dark:border-blue-900/40">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/30">
          <DialogTitle className="text-blue-700 dark:text-blue-400">Créer une question pour "{lecture.title}"</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6 min-h-0" style={{ maxHeight: 'calc(95vh - 180px)' }}>
          {/* Métadonnées */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">Numéro</Label>
              <Input
                id="number"
                type="number"
                placeholder="N°"
                value={formData.number === undefined ? '' : formData.number}
                onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value === '' ? undefined : parseInt(e.target.value, 10) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session">Session</Label>
              <Input
                id="session"
                placeholder="Ex: Session 2022"
                value={formData.session}
                onChange={(e) => setFormData(prev => ({ ...prev, session: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={handleQuestionTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">QCM</SelectItem>
                  <SelectItem value="qroc">QROC</SelectItem>
                  <SelectItem value="clinic_mcq">CAS QCM</SelectItem>
                  <SelectItem value="clinic_croq">CAS QROC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Énoncé */}
          <div className="space-y-2">
            <Label htmlFor="text">Énoncé de la question *</Label>
            <Textarea
              id="text"
              placeholder="Saisir l'énoncé de la question..."
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              className="min-h-[100px]"
            />
            {/* Image de la question: placer ici pour éviter la confusion avec l'image du rappel */}
            <div className="flex items-center gap-2 mb-1">
              <Button type="button" variant="outline" size="sm" className="relative">
                <ImageIcon className="h-4 w-4 mr-2" /> Image de la question
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    const MAX = 2 * 1024 * 1024; // 2 Mo
                    if (file.size > MAX) {
                      toast({ title: 'Image trop lourde', description: 'Taille maximum 2 Mo.', variant: 'destructive' });
                      e.currentTarget.value = '';
                      return;
                    }
                    if (!file.type.startsWith('image/')) {
                      toast({ title: 'Type non supporté', description: "Veuillez choisir une image.", variant: 'destructive' });
                      e.currentTarget.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                      setFormData(prev => ({ ...prev, mediaUrl: dataUrl, mediaType: 'image' }));
                    };
                    reader.readAsDataURL(file);
                    // reset input so same file can be re-picked
                    e.currentTarget.value = '';
                  }}
                />
              </Button>
            </div>
            {/* Aperçu de l'image de la question */}
            {formData.mediaUrl && formData.mediaType === 'image' && (
              <div className="mt-2 border rounded-md p-3 bg-muted/30">
                <div className="aspect-video relative bg-muted rounded-md overflow-hidden">
                  <img src={formData.mediaUrl} alt="Image de la question" className="w-full h-full object-contain" />
                </div>
                <div className="flex justify-end mt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(prev => ({ ...prev, mediaUrl: '', mediaType: undefined }))}>
                    <X className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Rappel du cours / Réponse de référence (texte). L'image jointe est l'image de la question. */}
          <div className="space-y-2">
            <Label htmlFor="reminder">{formData.type === 'mcq' || formData.type === 'clinic_mcq' ? 'Rappel du cours (optionnel)' : 'Réponse de référence (optionnel)'}</Label>
            {/* Bouton dédié à l'image du rappel */}
            <div className="flex items-center gap-2 mb-1">
              <Button type="button" variant="outline" size="sm" className="relative">
                <ImageIcon className="h-4 w-4 mr-2" /> Image du rappel
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    const MAX = 2 * 1024 * 1024; // 2 Mo
                    if (file.size > MAX) {
                      toast({ title: 'Image trop lourde', description: 'Taille maximum 2 Mo.', variant: 'destructive' });
                      e.currentTarget.value = '';
                      return;
                    }
                    if (!file.type.startsWith('image/')) {
                      toast({ title: 'Type non supporté', description: "Veuillez choisir une image.", variant: 'destructive' });
                      e.currentTarget.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                      setFormData(prev => ({ ...prev, reminderMediaUrl: dataUrl, reminderMediaType: 'image' }));
                    };
                    reader.readAsDataURL(file);
                    // reset input so same file can be re-picked
                    e.currentTarget.value = '';
                  }}
                />
              </Button>
            </div>
            <Textarea
              id="reminder"
              placeholder={formData.type === 'mcq' || formData.type === 'clinic_mcq' ? 'Résumé ou rappel associé à la question' : 'Texte de référence pour la correction'}
              value={formData.courseReminder}
              onChange={(e) => setFormData(prev => ({ ...prev, courseReminder: e.target.value }))}
              rows={3}
            />
            {formData.reminderMediaUrl && formData.reminderMediaType === 'image' && (
              <div className="mt-2 border rounded-md p-3 bg-muted/30">
                <div className="aspect-video relative bg-muted rounded-md overflow-hidden">
                  <img src={formData.reminderMediaUrl} alt="Image du rappel" className="w-full h-full object-contain" />
                </div>
                <div className="flex justify-end mt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFormData(prev => ({ ...prev, reminderMediaUrl: '', reminderMediaType: undefined }))}>
                    <X className="h-4 w-4 mr-1" /> Supprimer
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Options (MCQ) */}
          {(formData.type === 'mcq' || formData.type === 'clinic_mcq') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Options de réponse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option, index) => (
                  <div key={`${option.id}-${index}`} className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6 text-center">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={correctAnswers.includes(option.id)}
                            onChange={() => toggleCorrectAnswer(option.id)}
                            className="rounded"
                          />
                          Bonne
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                          disabled={options.length <= 2}
                          className="text-destructive hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Input
                        placeholder="Explication (optionnel)"
                        value={option.explanation || ''}
                        onChange={(e) => handleOptionExplanationChange(index, e.target.value)}
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full mt-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter une option
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Réponse QROC */}
          {(formData.type === 'qroc' || formData.type === 'clinic_croq') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Réponse attendue (QROC)</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Saisir la réponse attendue..."
                  value={qrocAnswer}
                  onChange={(e) => setQrocAnswer(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>
          )}

          {/* Explication globale */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explication globale (optionnel)</Label>
            <Textarea
              id="explanation"
              placeholder="Détails d'explication globaux..."
              value={formData.explanation}
              onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 p-6 pt-4 border-t bg-background flex-shrink-0 border-blue-100/80 dark:border-blue-900/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="border-blue-200 dark:border-blue-800">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Création…' : 'Créer la question'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
