'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash, Search, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Question, Lecture } from '@/types';
import { toast } from '@/hooks/use-toast';
import { CreateQuestionDialog } from './CreateQuestionDialog';
import { EditQuestionDialog } from './EditQuestionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuestionManagementDialogProps {
  lecture: Lecture;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionManagementDialog({ lecture, isOpen, onOpenChange }: QuestionManagementDialogProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchQuestions();
      setSearchQuery('');
    }
  }, [isOpen, lecture.id]);

  // Filter questions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredQuestions(questions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = questions.filter(question => 
        question?.text?.toLowerCase().includes(query) ||
        question?.type?.toLowerCase().includes(query) ||
        question?.explanation?.toLowerCase().includes(query) ||
        question?.options?.some(option => option?.text?.toLowerCase().includes(query))
      );
      setFilteredQuestions(filtered);
    }
  }, [questions, searchQuery]);

  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/questions?lectureId=${lecture.id}`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
        setFilteredQuestions(data);
      } else {
        throw new Error('Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        toast({
          title: "Question deleted",
          description: "The question has been successfully removed",
        });
      } else {
        throw new Error('Failed to delete question');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleQuestionCreated = () => {
    fetchQuestions();
    setIsCreateDialogOpen(false);
    setSearchQuery(''); // Clear search when new question is added
  };

  const handleQuestionUpdated = () => {
    fetchQuestions();
    setIsEditDialogOpen(false);
    setSelectedQuestion(null);
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setIsEditDialogOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-blue-200/60 dark:border-blue-900/40">
        <DialogHeader className="flex-shrink-0 p-6 pb-4 border-b border-blue-100/80 dark:border-blue-900/40 bg-gradient-to-b from-blue-50/60 to-transparent dark:from-blue-950/30">
          <DialogTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            Questions for "{lecture.title}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex justify-between items-center flex-shrink-0 px-6 pb-4 space-x-4">
          <p className="text-sm text-muted-foreground">
            {searchQuery ? (
              <>
                {filteredQuestions.length} of {questions.length} question{questions.length !== 1 ? 's' : ''} 
                {filteredQuestions.length === 0 ? ' found' : ' matching search'}
              </>
            ) : (
              <>
                {questions.length} question{questions.length !== 1 ? 's' : ''} total
              </>
            )}
          </p>
          
          <div className="flex items-center space-x-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-64"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {/* Add Question Button */}
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 min-h-0" style={{ maxHeight: 'calc(95vh - 220px)' }}>
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredQuestions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 
                    `No questions found matching "${searchQuery}".` : 
                    'No questions found for this lecture.'
                  }
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSearch}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredQuestions.map((question, index) => {
              // Calculate the original index from the full questions array
              const originalIndex = questions.findIndex(q => q.id === question.id);
              return (
              <Card key={question.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium line-clamp-3">
                        <span className="text-xs text-muted-foreground mr-2">#{originalIndex + 1}</span>
                        {/* Highlight search terms */}
                        {searchQuery && question?.text ? (
                          <span dangerouslySetInnerHTML={{
                            __html: question.text.replace(
                              new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                            )
                          }} />
                        ) : (
                          question?.text || ''
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Type: <span className="font-medium">{question.type.toUpperCase()}</span>
                        {question.options && (
                          <span className="ml-2">
                            | Options: <span className="font-medium">{question.options.length}</span>
                          </span>
                        )}
                        {question.correctAnswers?.length && (
                          <span className="ml-2">
                            | Correct: <span className="font-medium">{question.correctAnswers.length}</span>
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1 ml-4 flex-shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditQuestion(question)}
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this question? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                {(question.explanation || (question.options && question.options.length > 0)) && (
                  <CardContent className="pt-2">
                    {question.options && question.options.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Options:</p>
                        <div className="space-y-1">
                          {question.options.map((option, optIndex) => (
                            <div key={option?.id || `option-${question.id}-${optIndex}`} className="flex items-center text-xs">
                              <span className="mr-2 font-mono text-muted-foreground">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <span className={`flex-1 ${
                                (question.correctAnswers || question.correct_answers || []).includes(option?.id)
                                  ? 'font-medium text-green-700 bg-green-50 px-2 py-1 rounded'
                                  : ''
                              }`}>
                                {/* Highlight search terms in options */}
                                {searchQuery && option?.text ? (
                                  <span dangerouslySetInnerHTML={{
                                    __html: option.text.replace(
                                      new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                      '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                                    )
                                  }} />
                                ) : (
                                  option?.text || ''
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {question.explanation && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Explanation:</p>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {/* Highlight search terms in explanation */}
                          {searchQuery && question?.explanation ? (
                            <span dangerouslySetInnerHTML={{
                              __html: question.explanation.replace(
                                new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                                '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
                              )
                            }} />
                          ) : (
                            question?.explanation || ''
                          )}
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )})
          )}
        </div>

        {/* Create Question Dialog */}
        <CreateQuestionDialog
          lecture={lecture}
          isOpen={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onQuestionCreated={handleQuestionCreated}
        />

        {/* Edit Question Dialog */}
        {selectedQuestion && (
          <EditQuestionDialog
            question={selectedQuestion}
            isOpen={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onQuestionUpdated={handleQuestionUpdated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
