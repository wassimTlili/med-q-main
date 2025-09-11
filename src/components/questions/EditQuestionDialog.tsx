'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save } from 'lucide-react';
import { QuestionType, Option, Question } from '@/types';
import { toast } from '@/hooks/use-toast';

interface EditQuestionDialogProps {
  question: Question;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionUpdated: () => void;
}

export function EditQuestionDialog({ question, isOpen, onOpenChange, onQuestionUpdated }: EditQuestionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    type: 'mcq' as QuestionType,
    explanation: '',
    difficulty: 'medium',
  });
  const [options, setOptions] = useState<Option[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);
  const [bulkInput, setBulkInput] = useState('');

  // Initialize form with question data
  useEffect(() => {
    if (question && isOpen) {
      setFormData({
        text: question.text || '',
        type: question.type || 'mcq',
        explanation: question.explanation || '',
        difficulty: 'medium',
      });
      
      if (question.options && question.options.length > 0) {
        // Create fresh options with new IDs to ensure proper updates
        const freshOptions = question.options.map((option, index) => ({
          id: option.id || (index + 1).toString(),
          text: option.text || '',
          explanation: option.explanation
        }));
        setOptions(freshOptions);
      } else {
        // Default options for MCQ if none exist
        setOptions([
          { id: '1', text: '' },
          { id: '2', text: '' },
          { id: '3', text: '' },
          { id: '4', text: '' },
        ]);
      }
      
      setCorrectAnswers(question.correctAnswers || question.correct_answers || []);
    }
  }, [question, isOpen]);

  const handleOptionChange = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      text: text
    };
    setOptions(newOptions);
  };

  const handleQuestionTypeChange = (newType: QuestionType) => {
    setFormData(prev => ({ ...prev, type: newType }));
    
    // Reset options and correct answers when changing to/from MCQ
    if (newType !== 'mcq') {
      setOptions([]);
      setCorrectAnswers([]);
    } else if (options.length === 0) {
      // Initialize with default options when switching to MCQ
      setOptions([
        { id: 'option_1', text: '' },
        { id: 'option_2', text: '' },
        { id: 'option_3', text: '' },
        { id: 'option_4', text: '' },
      ]);
      setCorrectAnswers([]);
    }
  };

  const addOption = () => {
    const newOption: Option = {
      id: `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  text: ''
    };
    setOptions([...options, newOption]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      toast({
        title: "Cannot remove option",
        description: "A question must have at least 2 options.",
        variant: "destructive",
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

  // Bulk parser (MCQ) with explanations
  const parseBulkInput = () => {
    if (!bulkInput.trim()) {
      toast({ title: 'Empty', description: 'Paste question + options first.' });
      return;
    }
    if (formData.type !== 'mcq') {
      toast({ title: 'Wrong type', description: 'Bulk analyse is only for MCQ.', variant: 'destructive' });
      return;
    }
    const lines = bulkInput.replace(/\r/g,'').split('\n').map(l=> l.trim()).filter(Boolean);
    if (!lines.length) { toast({ title:'Format invalide', description:'Texte introuvable', variant:'destructive'}); return; }
    const optionLineRegex = /^([A-Z]|\d+)[\.)\]:\-]?\s+(.*)$/;
    const explanationMarker = /^(Explication|Justification|Explanation|Pourquoi|Raison)\s*[:\-]\s*/i;
    interface TempOpt { text:string; correct:boolean; explanation?:string }
    const detected: TempOpt[] = [];
    const questionLines: string[] = [];
    for(const line of lines){
      const m = line.match(optionLineRegex);
      if(m){
        let body = m[2].trim();
        let correct = false;
        if (/\*+$/.test(body) || /\bVRAI\b$/i.test(body) || /(\(x\)|\[x\]|✓)$/i.test(body)) {
          correct = true; body = body.replace(/(\*+|\(x\)|\[x\]|✓|\bVRAI\b)$/i,'').trim();
        }
        detected.push({ text: body, correct });
      } else if (!detected.length) {
        questionLines.push(line);
      } else {
        // explanation line
        const last = detected[detected.length-1];
        let processed = line;
        const marker = processed.match(explanationMarker);
        if (marker) processed = processed.replace(explanationMarker,'').trim();
        last.explanation = last.explanation ? last.explanation + '\n' + processed : processed;
      }
    }
    if (detected.length < 2) { toast({ title:'Pas assez d\'options', description:'Au moins 2.', variant:'destructive'}); return; }
    const qText = questionLines.join('\n').trim();
    if (qText) setFormData(prev => ({ ...prev, text: qText }));
    const built = detected.map(d => ({ id:`option_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, text:d.text, explanation:d.explanation || '' }));
    setOptions(built);
    const correctIds: string[] = [];
    detected.forEach((d,i)=> { if(d.correct) correctIds.push(built[i].id); });
    setCorrectAnswers(correctIds);
    toast({ title:'Analyse effectuée', description:`${built.length} options. Correctes: ${correctIds.length}. Explications: ${built.filter(o=>o.explanation).length}/${built.length}` });
  };

  const handleSubmit = async () => {
    if (!formData.text.trim()) {
      toast({
        title: "Validation Error",
        description: "Question text is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === 'mcq') {
      const validOptions = options.filter(opt => opt.text.trim());
      if (validOptions.length < 2) {
        toast({
          title: "Validation Error",
          description: "At least 2 options are required for MCQ questions.",
          variant: "destructive",
        });
        return;
      }

      if (correctAnswers.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one correct answer must be selected.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const questionData = {
        text: formData.text.trim(),
        type: formData.type,
        explanation: formData.explanation.trim() || null,
        difficulty: formData.difficulty,
        options: formData.type === 'mcq' ? options.filter(opt => opt.text.trim()) : [],
        correctAnswers: formData.type === 'mcq' ? correctAnswers : [],
        correct_answers: formData.type === 'mcq' ? correctAnswers : [],
      };

      const response = await fetch(`/api/questions/${question.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update question');
      }

      toast({
        title: "Question updated",
        description: "The question has been successfully updated.",
      });

      onQuestionUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-blue-200/60 dark:border-blue-900/40">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/30">
          <DialogTitle className="text-blue-700 dark:text-blue-400">Edit Question</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6 min-h-0" style={{ maxHeight: 'calc(95vh - 180px)' }}>
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="text">Question Text *</Label>
            <Textarea
              id="text"
              placeholder="Enter the question text..."
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Question Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={handleQuestionTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select question type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                <SelectItem value="open">Open Question</SelectItem>
                <SelectItem value="qroc">QROC</SelectItem>
                <SelectItem value="clinic_mcq">Clinical MCQ</SelectItem>
                <SelectItem value="clinic_croq">Clinical CROQ</SelectItem>
                <SelectItem value="clinical_case">Clinical Case</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select 
              value={formData.difficulty} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk paste parser (MCQ) */}
          {formData.type === 'mcq' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Coller question + options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  rows={4}
                  placeholder={`Collez ici.\nÉnoncé...\nA. Option 1\nExplication: détail pour A\nB) Option 2 *\nJustification: pourquoi B\nC - Option 3 (x)\nAutre ligne explication C\nD: Option 4`}
                  value={bulkInput}
                  onChange={e=> setBulkInput(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={()=> setBulkInput('')} disabled={!bulkInput}>Vider</Button>
                  <Button type="button" size="sm" onClick={parseBulkInput} disabled={!bulkInput}>Analyser & Remplir</Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug space-y-1">
                  <span className="block">Formats: A., A), A-, 1)... Ajoutez * / (x) / [x] / ✓ / VRAI pour marquer une bonne réponse.</span>
                  <span className="block">Explications: lignes après une option (avec ou sans préfixe Explication:/Justification:/Pourquoi:/Raison:) jusqu'à la prochaine option.</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Options (only for MCQ) */}
          {formData.type === 'mcq' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Answer Options</CardTitle>
                <p className="text-xs text-muted-foreground">Add explanations in the field under each option (optional).</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {options.map((option, index) => (
                  <div key={`${option.id}-${index}`} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground w-6 text-center">{String.fromCharCode(65 + index)}</span>
                      <div className="flex-1">
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center space-x-1">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={correctAnswers.includes(option.id)}
                            onChange={() => toggleCorrectAnswer(option.id)}
                            className="rounded"
                          />
                          <span className="text-xs whitespace-nowrap">Correct</span>
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
                    <Input
                      placeholder="Explanation (optional)"
                      value={option.explanation || ''}
                      onChange={(e)=> setOptions(prev => prev.map((o,i)=> i===index ? { ...o, explanation: e.target.value } : o))}
                    />
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
                  Add New Option
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              placeholder="Enter explanation for the answer..."
              value={formData.explanation}
              onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 p-6 pt-4 border-t bg-background flex-shrink-0 border-blue-100/80 dark:border-blue-900/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="border-blue-200 dark:border-blue-800">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Updating...' : 'Update Question'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
