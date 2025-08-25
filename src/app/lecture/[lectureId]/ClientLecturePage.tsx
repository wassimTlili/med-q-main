"use client";
// Client-side lecture page logic extracted from page.tsx to satisfy Next.js RSC boundaries
import React, { Suspense } from 'react';
import { useLecture } from '@/hooks/use-lecture';
import { MCQQuestion } from '@/components/questions/MCQQuestion';
import { OpenQuestion } from '@/components/questions/OpenQuestion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ClinicalCase } from '@/types';

interface ClientLecturePageProps { lectureId: string }

const ClientLecturePage: React.FC<ClientLecturePageProps> = ({ lectureId }) => {
  const {
    lecture,
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    answers,
    answerResults,
    isLoading,
    isComplete,
    handleAnswerSubmit,
    handleClinicalCaseSubmit,
    handleNext,
    handleRestart,
    handleBackToSpecialty,
    handleQuestionUpdate,
  } = useLecture(lectureId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground mb-4">Lecture introuvable ou accès refusé.</p>
        <Button onClick={handleBackToSpecialty} variant="secondary">Retour</Button>
      </div>
    );
  }

  const current: any = questions[currentQuestionIndex];

  const goNext = () => { handleNext(); };

  const renderQuestion = () => {
    if (!current) return <div className="text-sm text-muted-foreground">Aucune question.</div>;
    // Clinical case grouping (array of questions inside an object)
    if ((current as ClinicalCase).questions) {
      const caseObj = current as ClinicalCase;
      return (
        <div className="space-y-10">
          <h2 className="font-semibold text-lg">Cas clinique #{caseObj.caseNumber}</h2>
          {caseObj.questions.map((q, idx) => (
            <div key={q.id} className="border rounded-md p-4">
              {q.type === 'mcq' || q.type === 'clinic_mcq' ? (
                <MCQQuestion
                  question={q as any}
                  onSubmit={() => {}}
                  onNext={() => {}}
                  lectureId={lecture.id}
                  lectureTitle={lecture.title}
                  specialtyName={lecture.specialty?.name}
                  isAnswered={!!answers[q.id]}
                  answerResult={answerResults[q.id]}
                  userAnswer={Array.isArray(answers[q.id]) ? answers[q.id] : []}
                  hideActions
                  hideNotes
                  hideComments
                />
              ) : (
                <OpenQuestion
                  question={q as any}
                  onSubmit={() => {}}
                  onNext={() => {}}
                  lectureId={lecture.id}
                  lectureTitle={lecture.title}
                  specialtyName={lecture.specialty?.name}
                  isAnswered={!!answers[q.id]}
                  answerResult={answerResults[q.id]}
                  userAnswer={typeof answers[q.id] === 'string' ? answers[q.id] : ''}
                  hideActions
                  hideNotes
                  hideComments
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (current?.type === 'mcq' || current?.type === 'clinic_mcq') {
      return (
        <MCQQuestion
          question={current as any}
          onSubmit={() => {}}
          onNext={goNext}
          lectureId={lecture.id}
          lectureTitle={lecture.title}
          specialtyName={lecture.specialty?.name}
          isAnswered={!!answers[current.id]}
          answerResult={answerResults[current.id]}
          userAnswer={Array.isArray(answers[current.id]) ? answers[current.id] : []}
          onQuestionUpdate={handleQuestionUpdate}
        />
      );
    }
    return (
      <OpenQuestion
        question={current as any}
        onSubmit={() => {}}
        onNext={goNext}
        lectureId={lecture.id}
        lectureTitle={lecture.title}
        specialtyName={lecture.specialty?.name}
        isAnswered={!!answers[current.id]}
        answerResult={answerResults[current.id]}
        userAnswer={typeof answers[current.id] === 'string' ? answers[current.id] : ''}
        onQuestionUpdate={handleQuestionUpdate}
      />
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold leading-tight">{lecture.title}</h1>
          {lecture.specialty?.name && (
            <p className="text-xs text-muted-foreground mt-0.5">{lecture.specialty.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleBackToSpecialty}>Retour</Button>
          {isComplete && (
            <Button size="sm" onClick={handleRestart}>Recommencer</Button>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Question {currentQuestionIndex + 1} / {questions.length}</div>
      <div>
        {renderQuestion()}
      </div>
      <div className="flex justify-end pt-4">
        {!isComplete && (
          <Button onClick={goNext} size="sm" variant="secondary">Suivant</Button>
        )}
      </div>
    </div>
  );
};

export default ClientLecturePage;
