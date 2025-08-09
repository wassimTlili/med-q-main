
export type Niveau = {
  id: string;
  name: string;
  order: number;
};

export type User = {
  id: string;
  email: string;
  role: 'student' | 'admin';
  name?: string;
  image?: string;
  password?: string;
  passwordUpdatedAt?: string;
  // Profile fields
  sexe?: 'M' | 'F';
  niveauId?: string;
  profileCompleted?: boolean;
  // Subscription fields
  hasActiveSubscription?: boolean;
  subscriptionExpiresAt?: string;
  niveau?: {
    id: string;
    name: string;
    order: number;
  };
};

export type Specialty = {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  niveauId?: string;
  isFree?: boolean;
  niveau?: {
    id: string;
    name: string;
  };
  progress?: SpecialtyProgress;
};

export type SpecialtyProgress = {
  totalLectures: number;
  completedLectures: number;
  totalQuestions: number;
  completedQuestions: number;
  lectureProgress: number;
  questionProgress: number;
  averageScore: number;
  // Additional fields for detailed progress
  correctQuestions: number;
  incorrectQuestions: number;
  partialQuestions: number;
  incompleteQuestions: number;
};

export type Lecture = {
  id: string;
  specialtyId: string;
  title: string;
  description?: string;
  isFree?: boolean;
  specialty?: {
    id: string;
    name: string;
    niveauId?: string;
    niveau?: {
      id: string;
      name: string;
    };
  };
  progress?: LectureProgress;
};

export type LectureProgress = {
  totalQuestions: number;
  completedQuestions: number;
  percentage: number;
  lastAccessed?: Date;
};

export type QuestionType = 'mcq' | 'open' | 'qroc' | 'clinic_mcq' | 'clinic_croq' | 'clinical_case';

export type Option = {
  id: string;
  text: string;
  explanation?: string;
};

export type Question = {
  id: string;
  lectureId: string;
  lecture_id: string;
  type: QuestionType;
  text: string;
  options?: Option[];
  correct_answers?: string[]; // Array of option IDs for MCQ
  correctAnswers?: string[]; // Keep for backward compatibility
  explanation?: string; // Keep for backward compatibility
  course_reminder?: string; // Field for "Rappel du cours"
  number?: number; // Question number
  session?: string; // Exam session (e.g., "Session 2022")
  media_url?: string; // URL to the media file
  media_type?: 'image' | 'video'; // Type of media
  // Clinical case fields
  caseNumber?: number; // Case number for clinical cases
  caseText?: string; // Case description text
  caseQuestionNumber?: number; // Question number within the case
};

// New type for grouped clinical cases
export type ClinicalCase = {
  caseNumber: number;
  caseText: string;
  questions: Question[];
  totalQuestions: number;
};

export type Answer = {
  id: string;
  userId: string;
  questionId: string;
  selectedOptions?: string[]; // For MCQ
  textAnswer?: string; // For open questions
  isCorrect?: boolean;
};

export type UserProgress = {
  id: string;
  userId: string;
  lectureId: string;
  questionId?: string;
  completed: boolean;
  score?: number;
  lastAccessed: Date;
  createdAt: Date;
  updatedAt: Date;
};
