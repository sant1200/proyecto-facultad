export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  ease: number;
  interval: number;
  nextReview: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface StudySession {
  id: string;
  documentName: string;
  createdAt: number;
  summary: string;
  keyPoints: string[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  chatHistory: ChatMessage[];
  fileBase64?: string;
  fileType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ExamResult {
  id: string;
  sessionId: string;
  date: number;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
}

export interface AppState {
  currentSession: StudySession | null;
  sessions: StudySession[];
  examResults: ExamResult[];
}

export interface AIAnalysisResponse {
  summary: string;
  keyPoints: string[];
  flashcards: { question: string; answer: string }[];
  quizQuestions: {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }[];
}