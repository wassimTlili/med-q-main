'use client';

import { useState, useEffect, useRef } from 'react';
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
import { QuickParseQroc } from './QuickParseQroc';

interface CreateQuestionDialogProps {
  lecture: Lecture;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionCreated: () => void;
}

export function CreateQuestionDialog({ lecture, isOpen, onOpenChange, onQuestionCreated }: CreateQuestionDialogProps) {
  const LAST_QROC_ANSWER_KEY = 'last_qroc_answer';
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
  // Multi QROC builder (non clinical case) state
  interface QrocSubQuestion { id: string; text: string; answer: string; }
  const [multiQrocMode, setMultiQrocMode] = useState(false);
  const [qrocSubs, setQrocSubs] = useState<QrocSubQuestion[]>([]);
  // refs to track auto-focus behavior
  const prevQrocSubsLen = useRef(0);
  // Bulk paste helper state
  const [bulkInput, setBulkInput] = useState('');

  // ===== Clinical Case Builder Mode State =====
  interface SubQuestion {
    id: string;
    type: 'clinic_mcq' | 'clinic_croq';
    text: string;
    options: Option[];
    correctAnswers: string[];
    qrocAnswer: string;
    explanation: string;
  }
  const emptySubQuestion = (initialType: 'clinic_mcq' | 'clinic_croq' = 'clinic_mcq'): SubQuestion => ({
    id: `sq_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    type: initialType,
    text: '',
    options: [
      { id: makeId(), text: '', explanation: '' },
      { id: makeId(), text: '', explanation: '' },
      { id: makeId(), text: '', explanation: '' },
      { id: makeId(), text: '', explanation: '' },
    ],
    correctAnswers: [],
    qrocAnswer: '',
  explanation: '', // retained in state but UI hidden; always sent as null for clinical cases
  });
  // builderMode active when parent type == clinical_case
  const [builderMode, setBuilderModeInternal] = useState(false); // internal (legacy toggle) but we'll derive below
  const [caseNumber, setCaseNumber] = useState<number | undefined>(undefined);
  const [caseText, setCaseText] = useState('');
  const [subQuestions, setSubQuestions] = useState<SubQuestion[]>([emptySubQuestion()]);
  const prevClinicalSubsLen = useRef(1);

  const addSubQuestion = () => setSubQuestions(prev => [...prev, emptySubQuestion()]);
  const addSubQuestionOfType = (t: 'clinic_mcq' | 'clinic_croq') => setSubQuestions(prev => [...prev, emptySubQuestion(t)]);
  const removeSubQuestion = (id: string) => {
    setSubQuestions(prev => prev.filter(sq => sq.id !== id));
  };
  const updateSubQuestion = (id: string, updater: (sq: SubQuestion) => SubQuestion) => {
    setSubQuestions(prev => prev.map(sq => sq.id === id ? updater(sq) : sq));
  };
  const addSubOption = (sqId: string) => {
    updateSubQuestion(sqId, sq => ({
      ...sq,
      options: [...sq.options, { id: makeId(), text: '', explanation: '' }]
    }));
  };
  const removeSubOption = (sqId: string, index: number) => {
    updateSubQuestion(sqId, sq => {
      if (sq.options.length <= 2) return sq; // keep at least 2
      const removedId = sq.options[index].id;
      return {
        ...sq,
        options: sq.options.filter((_, i) => i !== index),
        correctAnswers: sq.correctAnswers.filter(id => id !== removedId),
      };
    });
  };
  const toggleSubCorrect = (sqId: string, optionId: string) => {
    updateSubQuestion(sqId, sq => ({
      ...sq,
      correctAnswers: sq.correctAnswers.includes(optionId)
        ? sq.correctAnswers.filter(id => id !== optionId)
        : [...sq.correctAnswers, optionId]
    }));
  };

  const resetBuilder = () => {
    setCaseNumber(undefined);
    setCaseText('');
    setSubQuestions([emptySubQuestion()]);
  };

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
  // Persist last single QROC answer for convenience
  const stored = (typeof window !== 'undefined') ? localStorage.getItem(LAST_QROC_ANSWER_KEY) : '';
  setQrocAnswer(stored || '');
  setMultiQrocMode(false);
  setQrocSubs([]);
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

    if (newType !== 'qroc') {
      setMultiQrocMode(false);
      setQrocSubs([]);
    }

    // Activate builder mode automatically for clinical_case
    if (newType === 'clinical_case') {
      setBuilderModeInternal(true);
      // Ensure at least one sub-question present
      if (subQuestions.length === 0) setSubQuestions([emptySubQuestion()]);
    } else {
      setBuilderModeInternal(false);
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
    // Multi QROC submission path
    if (formData.type === 'qroc' && multiQrocMode) {
      if (qrocSubs.length === 0) {
        toast({ title: 'Erreur', description: 'Ajoutez au moins une sous-question QROC.', variant: 'destructive' });
        return;
      }
      for (const sq of qrocSubs) {
        if (!sq.text.trim() || !sq.answer.trim()) {
          toast({ title: 'Erreur', description: 'Chaque sous-question QROC doit avoir un texte et une réponse.', variant: 'destructive' });
          return;
        }
      }
      try {
        setIsSubmitting(true);
        // Auto assign group number if absent: fetch existing max caseNumber among qroc
        let groupNumber = formData.number;
        if (!groupNumber) {
          try {
            const resp = await fetch(`/api/questions?lectureId=${lecture.id}`);
            if (resp.ok) {
              const data = await resp.json();
              const maxExisting = (data as any[])
                .filter(q => q.type === 'qroc' && q.caseNumber)
                .reduce((m, q) => Math.max(m, q.caseNumber || 0), 0);
              groupNumber = maxExisting + 1;
            } else {
              groupNumber = Math.floor(Date.now()/1000); // fallback
            }
          } catch {
            groupNumber = Math.floor(Date.now()/1000);
          }
        }
        let created = 0;
        for (let i = 0; i < qrocSubs.length; i++) {
          const sq = qrocSubs[i];
          const body = {
            lectureId: lecture.id,
            text: sq.text.trim(),
            type: 'qroc',
            explanation: null,
            courseReminder: formData.courseReminder.trim() || null,
            number: null, // individual numbers not used
            session: formData.session.trim() || null,
            mediaUrl: null,
            mediaType: null,
            courseReminderMediaUrl: formData.reminderMediaUrl || null,
            courseReminderMediaType: formData.reminderMediaType || null,
            caseNumber: groupNumber, // reuse/assign as group id
            caseText: null,
            caseQuestionNumber: i + 1,
            options: [],
            correctAnswers: [sq.answer.trim()],
          };
          const resp = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!resp.ok) {
            const err = await resp.json().catch(()=>({}));
            throw new Error(err.error || `Échec sous-question ${i+1}`);
          }
          created++;
        }
        toast({ title: 'Bloc QROC créé', description: `${created} sous-question(s) ajoutée(s).` });
        resetForm();
        onQuestionCreated();
        onOpenChange(false);
      } catch(e) {
        toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Création échouée.', variant: 'destructive' });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

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

      // Persist last QROC answer (single mode) so it "stays" for next creation
      if (formData.type === 'qroc' && !multiQrocMode && qrocAnswer.trim()) {
        try { localStorage.setItem(LAST_QROC_ANSWER_KEY, qrocAnswer.trim()); } catch {}
      }

      resetForm();
  onQuestionCreated(); // parent should refetch; ensure parent triggers hook refetch
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

  // ===== Bulk Paste Parsing (MCQ) =====
  const parseBulkInput = () => {
    if (!bulkInput.trim()) {
      toast({ title: 'Aucun contenu', description: 'Collez la question et ses options avant d\'analyser.' });
      return;
    }
    if (!(formData.type === 'mcq' || formData.type === 'clinic_mcq')) {
      toast({ title: 'Type non supporté', description: 'Le collage automatique est réservé aux QCM.', variant: 'destructive' });
      return;
    }
    const lines = bulkInput.replace(/\r/g,'').split('\n').map(l=>l.trim()).filter(l=>l.length);
    if (lines.length === 0) {
      toast({ title: 'Format invalide', description: 'Impossible d\'extraire du texte.' , variant: 'destructive'});
      return;
    }
    const optionLineRegex = /^([A-Z]|\d+)[\.)\]:\-]?\s+(.*)$/; // captures label + text
    const explanationMarker = /^(Explication|Justification|Explanation|Pourquoi|Raison)\s*[:\-]\s*/i;
    interface TempOpt { raw:string; text:string; correct:boolean; explanation?:string }
    const detectedOptions: TempOpt[] = [];
    let questionLines: string[] = [];
    for (const line of lines) {
      const m = line.match(optionLineRegex);
      if (m) {
        let optText = m[2].trim();
        let correct = false;
        // Detect correctness markers
        if (/\*+$/.test(optText) || /\bVRAI\b$/i.test(optText) || /(\(x\)|\[x\]|✓)$/i.test(optText)) {
          correct = true;
          optText = optText.replace(/(\*+|\(x\)|\[x\]|✓|\bVRAI\b)$/i,'').trim();
        }
        detectedOptions.push({ raw: line, text: optText, correct });
      } else if (detectedOptions.length === 0) {
        questionLines.push(line);
      } else {
        // treat as explanation for last option
        const last = detectedOptions[detectedOptions.length-1];
        let processed = line;
        const markerMatch = processed.match(explanationMarker);
        if (markerMatch) processed = processed.replace(explanationMarker,'').trim();
        if (!last.explanation) last.explanation = processed; else last.explanation += '\n' + processed;
      }
    }
    if (detectedOptions.length < 2) {
      toast({ title: 'Options insuffisantes', description: 'Au moins 2 options détectées sont requises.', variant: 'destructive' });
      return;
    }
    const newQuestionText = questionLines.join('\n').trim();
    if (!newQuestionText) {
      toast({ title: 'Question manquante', description: 'La première ligne (avant les options) doit contenir le texte de la question.', variant: 'destructive' });
      return;
    }
    const builtOptions: Option[] = detectedOptions.map(o => ({ id: makeId(), text: o.text, explanation: o.explanation || '' }));
    const builtCorrect = detectedOptions.filter(o=>o.correct).map(o=> builtOptions[detectedOptions.indexOf(o)].id);
    setFormData(prev => ({ ...prev, text: newQuestionText }));
    setOptions(builtOptions);
    setCorrectAnswers(builtCorrect);
    const explCount = builtOptions.filter(o=> o.explanation && o.explanation.trim()).length;
    toast({ title: 'Analyse effectuée', description: `${builtOptions.length} options importées. ${builtCorrect.length} correcte(s) détectée(s). Explications: ${explCount}/${builtOptions.length}.` });
  };

  // ===== Builder Submit =====
  const handleBuilderSubmit = async () => {
    // Allow user to only fill the top "N°" field (formData.number) and auto-use it as caseNumber
    let effectiveCaseNumber = caseNumber;
    if ((effectiveCaseNumber === undefined || isNaN(effectiveCaseNumber)) && formData.number !== undefined && !isNaN(formData.number as any)) {
      effectiveCaseNumber = formData.number as number;
      setCaseNumber(formData.number); // sync UI for subsequent edits
    }
    // If still missing, try auto-assign next available (like grouped QROC logic)
    if (effectiveCaseNumber === undefined || isNaN(effectiveCaseNumber)) {
      try {
        const resp = await fetch(`/api/questions?lectureId=${lecture.id}`);
        if (resp.ok) {
          const data = await resp.json();
          const maxExisting = (data as any[])
            .filter(q => (q.type === 'clinic_mcq' || q.type === 'clinic_croq') && q.caseNumber)
            .reduce((m, q) => Math.max(m, q.caseNumber || 0), 0);
          if (maxExisting >= 0) {
            effectiveCaseNumber = maxExisting + 1;
            setCaseNumber(effectiveCaseNumber);
          }
        }
      } catch {
        // swallow – fallback to validation below
      }
    }
    if (effectiveCaseNumber === undefined || isNaN(effectiveCaseNumber)) {
      toast({ title: 'Erreur de validation', description: 'Numéro de cas requis.', variant: 'destructive' });
      return;
    }
    if (!caseText.trim()) {
      toast({ title: 'Erreur de validation', description: 'Texte du cas requis.', variant: 'destructive' });
      return;
    }
    if (subQuestions.length === 0) {
      toast({ title: 'Erreur de validation', description: 'Ajoutez au moins une sous-question.', variant: 'destructive' });
      return;
    }
    // Validate each sub-question
    for (const sq of subQuestions) {
      if (!sq.text.trim()) {
        toast({ title: 'Erreur de validation', description: 'Chaque sous-question doit avoir un énoncé.', variant: 'destructive' });
        return;
      }
      if (sq.type === 'clinic_mcq') {
        const validOpts = sq.options.filter(o => o.text.trim());
        if (validOpts.length < 2) {
          toast({ title: 'Erreur de validation', description: 'Chaque QCM doit avoir au moins 2 options.', variant: 'destructive' });
          return;
        }
        if (sq.correctAnswers.length === 0) {
          toast({ title: 'Erreur de validation', description: 'Sélectionnez au moins une bonne réponse pour chaque QCM.', variant: 'destructive' });
          return;
        }
      }
      if (sq.type === 'clinic_croq' && !sq.qrocAnswer.trim()) {
        toast({ title: 'Erreur de validation', description: 'Chaque QROC doit avoir une réponse.', variant: 'destructive' });
        return;
      }
    }
    try {
      setIsSubmitting(true);
      let created = 0;
      for (let i = 0; i < subQuestions.length; i++) {
        const sq = subQuestions[i];
  const body = {
          lectureId: lecture.id,
          text: sq.text.trim(),
            // Force clinical types
          type: sq.type,
          explanation: null, // per-sub explanation removed
          courseReminder: formData.courseReminder.trim() || null,
          number: null,
          session: null,
          mediaUrl: null,
          mediaType: null,
          courseReminderMediaUrl: formData.reminderMediaUrl || null,
          courseReminderMediaType: formData.reminderMediaType || null,
          caseNumber: effectiveCaseNumber,
          caseText: caseText.trim(),
          caseQuestionNumber: i + 1,
          options: sq.type === 'clinic_mcq'
            ? sq.options.filter(o => o.text.trim()).map(o => ({ id: o.id, text: o.text.trim(), explanation: o.explanation?.trim() || '' }))
            : [],
          correctAnswers: sq.type === 'clinic_mcq' ? sq.correctAnswers : [sq.qrocAnswer.trim()],
        };
        const resp = await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || `Échec création sous-question ${i + 1}`);
        }
        created++;
      }
      toast({ title: 'Cas clinique créé', description: `${created} sous-question(s) ajoutée(s).` });
      resetBuilder();
  onQuestionCreated(); // parent refetch
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Erreur', description: e instanceof Error ? e.message : 'Création du cas échouée.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // derive builderMode from formData.type
  const builderModeDerived = formData.type === 'clinical_case' || builderMode;

  // ===== Keyboard shortcuts (1..9) to jump to sub-question textareas (clinical case or multi QROC) =====
  useEffect(()=> {
    if (!( (formData.type === 'clinical_case') || (formData.type === 'qroc' && multiQrocMode) )) return;
    const handler = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const idx = parseInt(e.key,10) - 1;
      const target = document.querySelector(`[data-sub-text="${idx}"]`) as HTMLTextAreaElement | HTMLInputElement | null;
      if (target) {
        e.preventDefault();
        target.focus();
        // Select content shortly after focus to ensure selection applies
        setTimeout(()=> {
          if (typeof (target as any).select === 'function') (target as any).select();
        }, 0);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [formData.type, multiQrocMode, subQuestions.length, qrocSubs.length]);

  // Auto-focus newly added grouped QROC sub-question textarea
  useEffect(()=>{
    if (formData.type === 'qroc' && multiQrocMode && qrocSubs.length > prevQrocSubsLen.current) {
      const idx = qrocSubs.length - 1;
      const el = document.querySelector(`[data-sub-text="${idx}"]`) as HTMLTextAreaElement | null;
      if (el) {
        setTimeout(()=> { el.focus(); el.select?.(); }, 0);
      }
    }
    prevQrocSubsLen.current = qrocSubs.length;
  }, [qrocSubs.length, formData.type, multiQrocMode, qrocSubs]);

  // Auto-focus newly added clinical sub-question textarea
  useEffect(()=>{
    if (formData.type === 'clinical_case' && subQuestions.length > prevClinicalSubsLen.current) {
      const idx = subQuestions.length - 1;
      const el = document.querySelector(`[data-sub-text="${idx}"]`) as HTMLTextAreaElement | null;
      if (el) {
        setTimeout(()=> { el.focus(); el.select?.(); }, 0);
      }
    }
    prevClinicalSubsLen.current = subQuestions.length;
  }, [subQuestions.length, formData.type, subQuestions]);

  // Load persisted single QROC answer when switching to single QROC mode
  useEffect(()=> {
    if (formData.type === 'qroc' && !multiQrocMode) {
      if (!qrocAnswer.trim()) {
        try {
          const stored = localStorage.getItem(LAST_QROC_ANSWER_KEY);
          if (stored) setQrocAnswer(stored);
        } catch {}
      }
    }
  }, [formData.type, multiQrocMode]);

  // ===== Keyboard flow within grouped QROC (Enter cycles text -> answer -> next) =====
  const handleGroupedQrocTextKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      // Move to answer input of same sub
      const ans = document.querySelector<HTMLInputElement>(`[data-sub-answer="${idx}"]`);
      if (ans) {
        ans.focus(); ans.select?.();
      }
    }
  };
  const handleGroupedQrocAnswerKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, idx: number) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const nextIdx = idx + 1;
      const next = document.querySelector<HTMLTextAreaElement>(`[data-sub-text="${nextIdx}"]`);
      if (next) {
        next.focus(); next.select?.();
      } else {
        // If last -> create one more empty sub and focus it
        if (formData.type === 'qroc' && multiQrocMode) {
          setQrocSubs(prev => [...prev, { id: makeId(), text: '', answer: '' }]);
          setTimeout(()=>{
            const created = document.querySelector<HTMLTextAreaElement>(`[data-sub-text="${nextIdx}"]`);
            created?.focus(); created?.select?.();
          }, 30);
        }
      }
    }
  };

  // ===== Keyboard flow within clinical case QROC subs =====
  const handleClinicQrocTextKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, idx: number) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const ans = document.querySelector<HTMLInputElement>(`[data-clinic-sub-answer="${idx}"]`);
      ans?.focus(); ans?.select?.();
    }
  };
  const handleClinicQrocAnswerKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const nextIdx = idx + 1;
      const next = document.querySelector<HTMLTextAreaElement>(`[data-sub-text="${nextIdx}"]`);
      if (next) {
        next.focus(); next.select?.();
      } else {
        // If last, add another QROC sub automatically
        if (formData.type === 'clinical_case') {
          setSubQuestions(prev => [...prev, emptySubQuestion('clinic_croq')]);
          setTimeout(()=> {
            const created = document.querySelector<HTMLTextAreaElement>(`[data-sub-text="${nextIdx}"]`);
            created?.focus(); created?.select?.();
          }, 30);
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-blue-200/60 dark:border-blue-900/40">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/30">
          <DialogTitle className="text-blue-700 dark:text-blue-400">Créer une question pour "{lecture.title}"</DialogTitle>
        </DialogHeader>
        
  <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6 min-h-0" style={{ maxHeight: 'calc(95vh - 180px)' }}>
          {/* Metadata always visible */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="number">N°</Label>
              {/* Per-sub explanation removed; rely on global rappel du cours below */}
              <Input id="number" type="number" placeholder="N°" value={formData.number === undefined ? '' : formData.number} onChange={(e)=> setFormData(prev => ({ ...prev, number: e.target.value === '' ? undefined : parseInt(e.target.value,10) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="session">Session</Label>
              <Input id="session" placeholder="Ex: Session 2022" value={formData.session} onChange={(e)=> setFormData(prev => ({ ...prev, session: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={handleQuestionTypeChange}>
                <SelectTrigger><SelectValue placeholder="Choisir le type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">QCM</SelectItem>
                  <SelectItem value="qroc">QROC</SelectItem>
                  <SelectItem value="clinical_case">Cas clinique (multi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Global clinical case quick parse (creation) */}
          {formData.type === 'clinical_case' && (
            <QuickParseClinicalCaseCreate
              rawCaseText={caseText}
              subs={subQuestions}
              setCaseText={setCaseText}
              setSubs={setSubQuestions}
              makeId={makeId}
            />
          )}

          {/* Multi QROC toggle shown before quick parse */}
          {formData.type === 'qroc' && !multiQrocMode && (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => {
                setMultiQrocMode(true);
                setQrocSubs([{ id: makeId(), text: formData.text, answer: qrocAnswer }]);
              }}>Activer multi QROC</Button>
            </div>
          )}
          {formData.type === 'qroc' && !multiQrocMode && (
            <QuickParseQroc
              questionText={formData.text}
              answer={qrocAnswer}
              setQuestionText={(t)=> setFormData(prev=> ({ ...prev, text: t }))}
              setAnswer={setQrocAnswer}
              title="Parse rapide QROC"
              autoPrefill
            />
          )}

          {/* Clinical case builder shown when type is clinical_case */}
          {formData.type === 'clinical_case' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-sm">Données du cas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2"><Label htmlFor="caseNumber">Numéro du cas *</Label><Input id="caseNumber" type="number" value={caseNumber === undefined ? '' : caseNumber} onChange={e=> setCaseNumber(e.target.value === '' ? undefined : parseInt(e.target.value,10))} /></div>
                    <div className="md:col-span-3 space-y-2"><Label htmlFor="caseText">Texte du cas *</Label><Textarea id="caseText" value={caseText} onChange={e=> setCaseText(e.target.value)} rows={4} placeholder="Description clinique partagée..." /></div>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-4">
                {subQuestions.map((sq, idx) => (
                  <Card key={sq.id} className="border-blue-200/60 dark:border-blue-900/40">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Sous-question {idx + 1}</CardTitle>
                      {subQuestions.length > 1 && (<Button variant="ghost" size="sm" onClick={()=> removeSubQuestion(sq.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>)}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={sq.type} onValueChange={(v:any)=> updateSubQuestion(sq.id, prev => ({ ...prev, type: v, correctAnswers: [], qrocAnswer: '', options: v === 'clinic_mcq' ? prev.options.length ? prev.options : [
                            { id: makeId(), text: '', explanation: '' },
                            { id: makeId(), text: '', explanation: '' },
                            { id: makeId(), text: '', explanation: '' },
                            { id: makeId(), text: '', explanation: '' },
                          ] : [] }))}>
                            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clinic_mcq">CAS QCM</SelectItem>
                              <SelectItem value="clinic_croq">CAS QROC</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-3 space-y-2"><Label>Énoncé *</Label><Textarea data-sub-text={idx} value={sq.text} onChange={e=> updateSubQuestion(sq.id, prev => ({ ...prev, text: e.target.value }))} rows={3} placeholder="Énoncé de la sous-question" onKeyDown={(e)=> sq.type==='clinic_croq' && handleClinicQrocTextKey(e, idx)} /></div>
                      </div>
                      {sq.type === 'clinic_mcq' && (
                        <div className="space-y-3">
                          {sq.options.map((opt,oIdx)=>(
                            <div key={opt.id} className="flex items-start gap-2 border rounded-md p-2">
                              <div className="pt-2 text-xs w-5 text-center">{String.fromCharCode(65+oIdx)}</div>
                              <div className="flex-1 space-y-2">
                                <Input placeholder={`Option ${oIdx+1}`} value={opt.text} onChange={e=> updateSubQuestion(sq.id, prev => ({ ...prev, options: prev.options.map((o,i)=> i===oIdx ? { ...o, text: e.target.value } : o) }))} />
                                <Input placeholder="Explication (optionnel)" value={opt.explanation || ''} onChange={e=> updateSubQuestion(sq.id, prev => ({ ...prev, options: prev.options.map((o,i)=> i===oIdx ? { ...o, explanation: e.target.value } : o) }))} />
                              </div>
                              <div className="flex flex-col gap-2 items-center">
                                <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={sq.correctAnswers.includes(opt.id)} onChange={()=> toggleSubCorrect(sq.id, opt.id)} />Bonne</label>
                                <Button type="button" size="sm" variant="ghost" disabled={sq.options.length <= 2} onClick={()=> removeSubOption(sq.id, oIdx)} className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            </div>
                          ))}
                          <Button type="button" variant="outline" size="sm" onClick={()=> addSubOption(sq.id)} className="w-full"><Plus className="h-3 w-3 mr-1" /> Ajouter une option</Button>
                        </div>
                      )}
                      {sq.type === 'clinic_croq' && (
                        <div className="space-y-3">
                          <div className="space-y-2"><Label>Réponse attendue *</Label><Input data-clinic-sub-answer={idx} value={sq.qrocAnswer} onChange={e=> updateSubQuestion(sq.id, prev => ({ ...prev, qrocAnswer: e.target.value }))} placeholder="Réponse attendue" onKeyDown={(e)=> handleClinicQrocAnswerKey(e, idx)} className="font-medium bg-blue-50/40 dark:bg-blue-950/20 border-blue-300/50 dark:border-blue-800" /></div>
                          <div><Button type="button" variant="outline" size="sm" onClick={()=> addSubQuestionOfType('clinic_croq')} className="w-full"><Plus className="h-3 w-3 mr-1" /> Ajouter une autre QROC</Button></div>
                        </div>
                      )}
                      {/* Per-sub explanation removed */}
                    </CardContent>
                  </Card>
                ))}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={()=> addSubQuestionOfType('clinic_mcq')} className="flex-1"><Plus className="h-3 w-3 mr-1" /> Ajouter QCM</Button>
                  <Button type="button" variant="outline" size="sm" onClick={()=> addSubQuestionOfType('clinic_croq')} className="flex-1"><Plus className="h-3 w-3 mr-1" /> Ajouter QROC</Button>
                </div>
              </div>
            </div>
          )}

          {formData.type !== 'clinical_case' && (
            <>
          {/* Métadonnées */}
            {/* Bulk paste helper appears only for QCM standard, right under meta inputs */}
            {formData.type === 'mcq' && (
              <Card className="border-blue-200/60 dark:border-blue-900/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Coller question + options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea
                    rows={4}
                    placeholder={`Collez ici.\nExemple:\nQuestion sur ...?\nA. Première option\nExplication: Raison de l'option A (ligne juste après)\nB) Deuxième option *\nJustification: Pourquoi B est correcte\nC - Troisième option (x)\nPourquoi: Détail supplémentaire (autres lignes fusionnées)\nD: Quatrième option`}
                    value={bulkInput}
                    onChange={e=> setBulkInput(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={()=> setBulkInput('')} disabled={!bulkInput}>Vider</Button>
                    <Button type="button" size="sm" onClick={parseBulkInput} disabled={!bulkInput}>Analyser & Remplir</Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug space-y-1">
                    <span className="block">Formats options: A., A), A-, 1), etc. Ajoutez * / (x) / [x] / ✓ / VRAI à la fin pour marquer une bonne réponse.</span>
                    <span className="block">Explications: ajoutez une ou plusieurs lignes directement après une option. Vous pouvez commencer par "Explication:", "Justification:", "Pourquoi:", "Raison:" (le marqueur sera retiré). Les lignes jusqu'à la prochaine option sont fusionnées comme explication.</span>
                  </p>
                </CardContent>
              </Card>
            )}
          {/* (Toggle moved above parse block) */}
            </>
          )}

          {/* Énoncé (single question OR multi QROC group header) */}
          <div className="space-y-2">
            <Label htmlFor="text">{multiQrocMode && formData.type==='qroc' ? 'Texte commun (optionnel)' : 'Énoncé de la question *'}</Label>
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

          {/* (Block reference QROC removed; unified bottom section handles all) */}

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
          {(!multiQrocMode && (formData.type === 'qroc')) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Réponse de référence (QROC)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Réponse courte attendue..."
                  value={qrocAnswer}
                  onChange={(e) => setQrocAnswer(e.target.value)}
                  rows={2}
                  className="w-full resize-none text-base font-medium bg-blue-50/60 dark:bg-blue-950/30 border-blue-300/60 dark:border-blue-800 focus-visible:ring-blue-500"
                />
                <p className="text-[10px] mt-1 text-muted-foreground">Cette valeur est mémorisée et ré-affichée pour accélérer la saisie.</p>
              </CardContent>
            </Card>
          )}
          {multiQrocMode && formData.type==='qroc' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Sous-questions QROC ({qrocSubs.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuickParseGroupedQroc
                  subs={qrocSubs}
                  setSubs={setQrocSubs}
                  makeId={makeId}
                />
                <p className="text-[11px] text-muted-foreground -mt-2">Utilisez le bloc "Parse rapide bloc QROC" ci-dessus pour coller toutes les sous-questions (Qn:, lignes d'énoncé, puis "Réponse:"). Ce parseur remplace la liste actuelle.</p>
                {qrocSubs.map((sq, idx) => (
                  <div key={sq.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-medium bg-muted px-2 py-0.5 rounded">QROC {idx+1}</div>
                      {qrocSubs.length>1 && (
                        <Button variant="ghost" size="sm" onClick={() => setQrocSubs(prev => prev.filter(s=>s.id!==sq.id))} className="text-destructive">Supprimer</Button>
                      )}
                    </div>
                    <Textarea data-sub-text={idx} rows={2} placeholder="Énoncé de la sous-question" value={sq.text} onChange={e=> setQrocSubs(prev => prev.map(s=> s.id===sq.id? {...s, text: e.target.value}: s))} onKeyDown={(e)=> handleGroupedQrocTextKey(e, idx)} />
                    <Textarea data-sub-answer={idx} rows={2} placeholder="Réponse de référence (multi-lignes possible)" value={sq.answer} onChange={e=> setQrocSubs(prev => prev.map(s=> s.id===sq.id? {...s, answer: e.target.value}: s))} onKeyDown={(e)=> handleGroupedQrocAnswerKey(e, idx)} className="font-medium bg-blue-50/40 dark:bg-blue-950/20 border-blue-300/50 dark:border-blue-800 resize-y" />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setQrocSubs(prev => [...prev, { id: makeId(), text: '', answer: '' }])} className="w-full">
                  <Plus className="h-3 w-3 mr-1" /> Ajouter une QROC
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rappel du cours / Réponse de référence (unifié en bas) */}
          {(formData.type === 'mcq' || formData.type === 'clinic_mcq' || formData.type === 'qroc' || formData.type === 'clinical_case') && (
            <div className="space-y-2">
              <Label htmlFor="reminder-bottom">Rappel du cours (optionnel)</Label>
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
                      const MAX = 2 * 1024 * 1024;
                      if (file.size > MAX) {
                        toast({ title: 'Image trop lourde', description: 'Taille maximum 2 Mo.', variant: 'destructive' });
                        e.currentTarget.value = '';
                        return;
                      }
                      if (!file.type.startsWith('image/')) {
                        toast({ title: 'Type non supporté', description: 'Veuillez choisir une image.', variant: 'destructive' });
                        e.currentTarget.value = '';
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
                        setFormData(prev => ({ ...prev, reminderMediaUrl: dataUrl, reminderMediaType: 'image' }));
                      };
                      reader.readAsDataURL(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </Button>
              </div>
              <Textarea
                id="reminder-bottom"
                placeholder={formData.type === 'qroc' ? 'Texte de référence / rappel associé à la correction' : 'Résumé ou rappel associé à la question'}
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
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-4 p-6 pt-4 border-t bg-background flex-shrink-0 border-blue-100/80 dark:border-blue-900/40 flex-wrap">
          {builderModeDerived && (
            <p className="text-xs text-muted-foreground">{subQuestions.length} sous-question(s) prête(s).</p>
          )}
          <div className="flex justify-end space-x-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="border-blue-200 dark:border-blue-800">
              Annuler
            </Button>
            {!builderModeDerived && !multiQrocMode && (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Création…' : 'Créer la question'}
              </Button>
            )}
            {!builderModeDerived && multiQrocMode && (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Création…' : 'Créer le bloc QROC'}
              </Button>
            )}
            {builderModeDerived && (
              <Button onClick={handleBuilderSubmit} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Création…' : 'Créer le cas'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============== Quick Parse Grouped QROC (Creation) ===============
function QuickParseGroupedQroc({ subs, setSubs, makeId }: { subs: { id:string; text:string; answer:string }[]; setSubs: (s:any[])=>void; makeId:()=>string }) {
  const [raw, setRaw] = useState('');
  const [initialized, setInitialized] = useState(false);
  useEffect(()=>{
    if (initialized) return;
    if (!subs.length) return;
    const lines: string[] = [];
    subs.forEach((s, idx)=> {
      lines.push(`Q${idx+1}:`);
      lines.push(s.text || '');
      lines.push(`Réponse: ${s.answer || ''}`);
      lines.push('');
    });
    setRaw(lines.join('\n').trimEnd());
    setInitialized(true);
  }, [initialized, subs]);
  const handleCopy = async () => { try { await navigator.clipboard.writeText(raw); toast({ title:'Copié', description:'Bloc QROC copié.'}); } catch { toast({ title:'Erreur', description:'Copie impossible', variant:'destructive'});} };
  const parse = () => {
    if (!raw.trim()) { toast({ title:'Vide', description:'Rien à analyser.'}); return; }
    const lines = raw.replace(/\r/g,'').split('\n');
    const subHeader = /^Q(\d+)\s*:/i;
    const parsed: { id:string; text:string; answer:string }[] = [];
    let i=0;
    while(i<lines.length){
      while(i<lines.length && !subHeader.test(lines[i])) i++;
      if(i>=lines.length) break;
      // Capture header line with potential inline content
      const headerLine = lines[i];
      i++;
      let headerRemainder = headerLine.replace(/^Q\d+\s*:/i,'').trim();
      let inlineAnswer = '';
      if (headerRemainder) {
        // Allow inline format: "texte ... Réponse: answer" or "... reponse: answer"
        const rIdx = headerRemainder.search(/Réponse\s*:/i);
        if (rIdx >= 0) {
          const before = headerRemainder.slice(0, rIdx).trim();
          const after = headerRemainder.slice(rIdx).replace(/Réponse\s*:/i,'').trim();
          headerRemainder = before;
          inlineAnswer = after;
        }
      }
      const textLines:string[] = headerRemainder ? [headerRemainder] : [];
      while(i<lines.length && !/^Réponse:/i.test(lines[i]) && !subHeader.test(lines[i])) { textLines.push(lines[i]); i++; }
      let answer = inlineAnswer;
      if (!answer && i<lines.length && /^Réponse:/i.test(lines[i])) { answer = lines[i].replace(/^Réponse:\s*/i,'').trim(); i++; }
      // skip blank lines
      while(i<lines.length && lines[i].trim()==='') i++;
      parsed.push({ id: makeId(), text: textLines.join('\n').trim(), answer });
    }
    if(!parsed.length){ toast({ title:'Aucune sous-question', description:'Format non reconnu.', variant:'destructive'}); return; }
    setSubs(parsed);
    toast({ title:'Analyse effectuée', description:`${parsed.length} sous-question(s) importée(s).` });
  };
  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <div className="flex justify-between items-center"><h4 className="text-xs font-semibold">Parse rapide bloc QROC</h4><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={handleCopy}>Copier</Button><Button type="button" size="sm" onClick={parse}>Analyser</Button></div></div>
      <Textarea value={raw} onChange={e=> setRaw(e.target.value)} className="min-h-40 font-mono text-xs" placeholder={`Q1: Énoncé 1 sur une ligne Réponse: réponse 1\nQ2:\nÉnoncé multi-ligne...\nsuite...\nRéponse: réponse 2`} />
      <p className="text-[10px] text-muted-foreground">Formats: (1) Qn: Texte ... Réponse: xxx (sur une ligne) ou (2) Qn: puis lignes d'énoncé et une ligne "Réponse:" séparée. Blocs sans numéro consécutif acceptés, l'ordre d'apparition est utilisé.</p>
    </div>
  );
}

// ================= Quick Parse Clinical Case (Creation) =================
function QuickParseClinicalCaseCreate({
  rawCaseText,
  subs,
  setCaseText,
  setSubs,
  makeId,
}: {
  rawCaseText: string;
  subs: any[]; // using any (SubQuestion shape) local only
  setCaseText: (t:string)=>void;
  setSubs: (s:any[])=>void;
  makeId: ()=>string;
}) {
  const [raw, setRaw] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Prefill once with current case + subs (if user toggles type)
  useEffect(()=>{
    if (initialized) return;
    const lines: string[] = [];
    if (rawCaseText || subs.length) {
      lines.push('Case:');
      lines.push(rawCaseText || '');
      lines.push('');
      subs.forEach((s, idx)=> {
        lines.push(`Q${idx+1}: (${s.type === 'clinic_mcq' ? 'QCM' : 'QROC'})`);
        lines.push(`Énoncé: ${s.text || ''}`);
        if (s.type === 'clinic_mcq') {
          s.options.forEach((o: any, oIdx:number)=> {
            const correct = s.correctAnswers.includes(o.id) ? 'x' : ' ';
            lines.push(`[${correct}] ${String.fromCharCode(65+oIdx)}) ${o.text || ''}`);
            if (o.explanation && o.explanation.trim()) {
              o.explanation.split(/\r?\n/).forEach((el:string,i:number)=>{
                lines.push(i===0 ? `    Explication: ${el}` : `    ${el}`);
              });
            }
          });
        } else {
          lines.push(`Réponse: ${s.qrocAnswer || ''}`);
        }
        lines.push('');
      });
      setRaw(lines.join('\n').trimEnd());
      setInitialized(true);
    }
  }, [initialized, rawCaseText, subs]);

  const optionPattern = /^\[(x|X| )\]\s*([A-Z])\)\s*(.*)$/;
  const subHeaderPattern = /^Q(\d+)\s*:\s*(?:\((QCM|QROC)\))?/i;
  const explMarker = /^(Explication|Explanation|Justification|Pourquoi|Raison)\s*[:\-]\s*/i;
  const indented = /^\s{2,}(.*)$/;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(raw); toast({ title:'Copié', description:'Modèle cas copié.'}); } catch { toast({ title:'Erreur', description:'Copie impossible', variant:'destructive'});} }

  const parse = () => {
    if (!raw.trim()) { toast({ title:'Vide', description:'Rien à analyser.'}); return; }
    const lines = raw.replace(/\r/g,'').split('\n');
    let i=0;
    let newCaseText = rawCaseText;
    if (/^(Case|Cas)\s*:/i.test(lines[0])) {
      i=1; const caseLines:string[]=[];
      while(i<lines.length && lines[i].trim() !== '') { caseLines.push(lines[i]); i++; }
      newCaseText = caseLines.join('\n').trim();
      while(i<lines.length && lines[i].trim()==='') i++;
    }
    const parsedSubs: any[] = [];
    while(i<lines.length) {
      const header = lines[i];
      const mh = header.match(subHeaderPattern);
      if (!mh) { i++; continue; }
      i++;
      const typeHint = (mh[2]||'').toUpperCase();
      const blockStart = i;
      let blockEnd = lines.length;
      for (let j=i; j<lines.length; j++) {
        if (subHeaderPattern.test(lines[j])) { blockEnd = j; break; }
      }
      const block = lines.slice(blockStart, blockEnd);
      let bi=0; let text='';
      if (/^Énoncé:/i.test(block[bi]||'')) { text = block[bi].replace(/^Énoncé:\s*/i,'').trim(); bi++; }
      else { // fallback accumulate until option or Réponse
        const tmpLines:string[]=[];
        while(bi<block.length && !optionPattern.test(block[bi]) && !/^Réponse:/i.test(block[bi])) { tmpLines.push(block[bi]); bi++; }
        text = tmpLines.join(' ').trim();
      }
      // Decide type: if typeHint provided use it; else infer by presence of option pattern lines
      let qType: 'clinic_mcq' | 'clinic_croq' = 'clinic_croq';
      if (typeHint === 'QCM') qType='clinic_mcq'; else if (typeHint === 'QROC') qType='clinic_croq'; else {
        for (let k=bi; k<block.length; k++){ if (optionPattern.test(block[k])) { qType='clinic_mcq'; break; } }
      }
      if (qType==='clinic_mcq') {
        const opts: { text:string; correct:boolean; explanation?:string }[] = [];
        for (; bi<block.length; bi++) {
          const line = block[bi]; if (!line.trim()) continue;
          const m = line.match(optionPattern);
            if (m) {
              opts.push({ text: m[3].trim(), correct: m[1].toLowerCase()==='x' });
              continue;
            }
          if (opts.length) {
            let explLine = line;
            const marker = explLine.match(explMarker);
            if (marker) explLine = explLine.replace(explMarker,'').trim();
            else { const ind = explLine.match(indented); if (ind) explLine = ind[1]; }
            const last = opts[opts.length-1];
            last.explanation = last.explanation ? `${last.explanation}\n${explLine}` : explLine;
          }
        }
        // Build SubQuestion shape
        const builtOptions = opts.map(o=> ({ id: makeId(), text: o.text, explanation: o.explanation || '' }));
        const correctIds = builtOptions.filter((_,idx)=> opts[idx].correct).map(o=> o.id);
        parsedSubs.push({ id: `sq_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, type:'clinic_mcq', text, options: builtOptions.length? builtOptions : [ { id: makeId(), text:'', explanation:'' }, { id: makeId(), text:'', explanation:'' } ], correctAnswers: correctIds, qrocAnswer:'', explanation:'' });
      } else {
        // QROC
        let answer='';
        for (; bi<block.length; bi++) { const line=block[bi]; if (/^Réponse:/i.test(line)) { answer = line.replace(/^Réponse:\s*/i,'').trim(); break; } }
        parsedSubs.push({ id: `sq_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, type:'clinic_croq', text, options: [], correctAnswers: [], qrocAnswer: answer, explanation:'' });
      }
      i = blockEnd;
    }
    if (parsedSubs.length === 0) { toast({ title:'Aucune sous-question', description:'Format non reconnu.', variant:'destructive'}); return; }
    setCaseText(newCaseText);
    setSubs(parsedSubs);
    toast({ title:'Analyse effectuée', description:`${parsedSubs.length} sous-question(s) importée(s).` });
  };

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold">Parse rapide Cas clinique</h3>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>Copier</Button>
          <Button type="button" size="sm" onClick={parse}>Analyser</Button>
        </div>
      </div>
      <Textarea
        value={raw}
        onChange={e=> setRaw(e.target.value)}
        placeholder={`Case:\nTexte du cas...\n\nQ1: (QCM)\nÉnoncé: ...\n[ ] A) Option A\n[x] B) Option B\n    Explication: justification B\n[ ] C) Option C\n\nQ2: (QROC)\nÉnoncé: ...\nRéponse: réponse courte`}
        className="min-h-60 font-mono text-xs"
      />
      <p className="text-[10px] text-muted-foreground leading-snug">Format: "Case:" puis blocs Qn:. Type entre parenthèses (QCM|QROC) optionnel (inféré). Options QCM: [x] A) texte (x = bonne). Lignes indentées ou avec marqueur deviennent explication. Réponse QROC via "Réponse:". Ce parseur remplace la liste actuelle de sous-questions.</p>
    </div>
  );
}
