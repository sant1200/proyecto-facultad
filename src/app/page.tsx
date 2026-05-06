'use client';

import { useState, useRef, useEffect } from 'react';
import { loadState, saveState, addSession, updateCurrentSession, updateFlashcards, addExamResult, deleteSession } from '@/lib/storage';
import { StudySession, Flashcard, ChatMessage, QuizQuestion, ExamResult } from '@/types';

type Mode = 'home' | 'upload' | 'study' | 'exam' | 'chat';

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

function createEmptyFlashcard(): Flashcard {
  return {
    id: generateId(),
    question: '',
    answer: '',
    ease: 2.5,
    interval: 1,
    nextReview: Date.now()
  };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('home');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [now, setNow] = useState(0);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  
  const [studyTab, setStudyTab] = useState<'summary' | 'flashcards' | 'quiz' | 'chat'>('summary');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<{ [key: string]: number }>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<{ [key: string]: number }>({});
  const [showExamResults, setShowExamResults] = useState(false);
  const [examScore, setExamScore] = useState(0);
  
  const [userQuestion, setUserQuestion] = useState('');
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[]>([]);
  const [showUserQuiz, setShowUserQuiz] = useState(false);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const state = loadState();
    const timer = setTimeout(() => {
      if (state.sessions.length > 0) setSessions(state.sessions);
      if (state.currentSession) setCurrentSession(state.currentSession);
      if (state.examResults.length > 0) setExamResults(state.examResults);
      setNow(Date.now());
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    saveState({ currentSession, sessions, examResults });
  }, [currentSession, sessions, examResults]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.chatHistory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setMode('upload');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      setUploadProgress(30);
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          fileBase64: base64,
          fileType: file.type,
          fileName: file.name
        })
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Error en el análisis (${res.status}): ${errData.error || 'Error desconocido'}`);
      }
      const result = await res.json();
      
      setUploadProgress(70);
      
      const newSession: StudySession = {
        id: generateId(),
        documentName: file.name,
        createdAt: Date.now(),
        summary: result.summary || 'No se pudo generar resumen',
        keyPoints: result.keyPoints || [],
        flashcards: (result.flashcards || []).map((f: { question: string; answer: string }) => ({
          ...createEmptyFlashcard(),
          id: generateId(),
          question: f.question,
          answer: f.answer
        })),
        quizQuestions: (result.quizQuestions || []).map((q: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => ({
          id: generateId(),
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        })),
        chatHistory: []
      };
      
      setUploadProgress(90);
      
      addSession(newSession);
      setSessions(prev => [...prev, newSession]);
      setCurrentSession(newSession);
      
      setUploadProgress(100);
      setTimeout(() => {
        setMode('study');
        setStudyTab('summary');
      }, 500);
    } catch (error) {
      console.error('Error analyzing document:', error);
      alert('Error al analizar el documento. Por favor intenta de nuevo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !currentSession || isChatLoading) return;
    
    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    };
    
    const updatedSession = {
      ...currentSession,
      chatHistory: [...currentSession.chatHistory, userMsg]
    };
    
    setCurrentSession(updatedSession);
    updateCurrentSession(updatedSession);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: chatInput,
          context: {
            summary: currentSession.summary,
            keyPoints: currentSession.keyPoints
          }
        })
      });
      
      if (!res.ok) throw new Error('Error en chat');
      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.content || data.choices?.[0]?.message?.content || 'No pude generar respuesta',
        timestamp: Date.now()
      };
      
      const finalSession = {
        ...updatedSession,
        chatHistory: [...updatedSession.chatHistory, assistantMsg]
      };
      
      setCurrentSession(finalSession);
      updateCurrentSession(finalSession);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleQuizAnswer = (questionId: string, answerIndex: number) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
  };

  const calculateQuizScore = () => {
    if (!currentSession) return 0;
    let correct = 0;
    currentSession.quizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.correctAnswer) correct++;
    });
    return Math.round((correct / currentSession.quizQuestions.length) * 10);
  };

  const startExam = async () => {
    if (!currentSession) return;
    
    setIsUploading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exam',
          context: {
            summary: currentSession.summary,
            keyPoints: currentSession.keyPoints
          },
          numQuestions: 10
        })
      });
      
      if (!res.ok) throw new Error('Error generando examen');
      const result = await res.json();
      
      const questions = (result.questions || []).map((q: { question: string; options: string[]; correctAnswer: number; explanation?: string }) => ({
        id: generateId(),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      }));
      
      setExamQuestions(questions);
      setExamAnswers({});
      setShowExamResults(false);
      setMode('exam');
    } catch (error) {
      console.error('Error generating exam:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const submitExam = () => {
    let correct = 0;
    examQuestions.forEach(q => {
      if (examAnswers[q.id] === q.correctAnswer) correct++;
    });
    
    const score = Math.round((correct / examQuestions.length) * 10);
    setExamScore(score);
    setShowExamResults(true);
    
    const result: ExamResult = {
      id: generateId(),
      sessionId: currentSession!.id,
      date: Date.now(),
      score,
      totalQuestions: examQuestions.length,
      correctAnswers: correct
    };
    
    addExamResult(result);
    setExamResults(prev => [...prev, result]);
  };

  const rateFlashcard = (quality: number) => {
    if (!currentSession) return;
    
    const card = currentSession.flashcards[currentCardIndex];
    let { ease, interval } = card;
    
    ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    
    if (quality < 3) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease);
    }
    
    const updatedCards = [...currentSession.flashcards];
    updatedCards[currentCardIndex] = {
      ...card,
      ease,
      interval,
      nextReview: Date.now() + interval * 24 * 60 * 60 * 1000
    };
    
    const updatedSession = { ...currentSession, flashcards: updatedCards };
    setCurrentSession(updatedSession);
    updateFlashcards(currentSession.id, updatedCards);
    
    if (currentCardIndex < updatedCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setCurrentCardIndex(0);
    }
    setShowAnswer(false);
  };

  const handleUserQuestion = () => {
    if (!userQuestion.trim() || !currentSession) return;
    
    const newQuestion: QuizQuestion = {
      id: generateId(),
      question: userQuestion,
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correctAnswer: 0,
      explanation: 'Esta es una pregunta que creaste tú mismo. ¡精神的!'
    };
    
    setGeneratedQuiz([...generatedQuiz, newQuestion]);
    setUserQuestion('');
  };

  const selectSession = (session: StudySession) => {
    setCurrentSession(session);
    setMode('study');
    setStudyTab('summary');
  };

  const deleteSessionHandler = (sessionId: string) => {
    deleteSession(sessionId);
    setSessions(sessions.filter(s => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMode('home');
    }
  };

  const goHome = () => {
    setMode('home');
    setFile(null);
  };

  const dueCards = now > 0 
    ? (currentSession?.flashcards.filter(c => c.nextReview <= now) || [])
    : [];

  if (!isHydrated) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-cyan-400/70 text-sm font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg relative">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={goHome}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">GenioFacultad</span>
          </div>
          
          {mode !== 'home' && mode !== 'upload' && (
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setMode('study')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'study' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Estudiar
                </span>
              </button>
              <button
                onClick={() => setMode('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'chat' 
                    ? 'bg-cyan-500/20 text-cyan-400' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Chat IA
                </span>
              </button>
              <button
                onClick={startExam}
                className="ml-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Simular Examen
                </span>
              </button>
            </nav>
          )}
          
          {mode === 'home' && sessions.length > 0 && (
            <button 
              onClick={goHome} 
              className="text-zinc-500 hover:text-white text-sm font-medium transition-colors"
            >
              ← Volver
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 p-4 max-w-6xl mx-auto">
        {mode === 'home' && (
          <div className="animate-fade-in">
            <div className="text-center py-20">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Powered by IA
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                Transforma tu estudio con{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-500">
                  inteligencia
                </span>
              </h1>
              <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Sube tus apuntes, PDFs o fotos de clases. La IA te genera resúmenes, flashcards, quizzes y te ayuda a estudiar de forma inteligente.
              </p>
              
              <label className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-2xl cursor-pointer transition-all hover:scale-105 cyan-glow text-black font-semibold">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-lg">Subir Archivo</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" 
                  onChange={handleFileSelect} 
                />
              </label>

              <div className="mt-16 flex justify-center gap-8 text-zinc-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm">PDF, imágenes, documentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm">Análisis instantáneo</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm">Flashcards automáticas</span>
                </div>
              </div>
            </div>
            
            {sessions.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <span className="w-1 h-8 bg-cyan-500 rounded-full"></span>
                  Tus Materiales
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {sessions.map((session, index) => (
                    <div
                      key={session.id}
                      onClick={() => selectSession(session)}
                      className={`glass card-hover p-5 rounded-2xl cursor-pointer animate-fade-in-up stagger-${index + 1}`}
                      style={{ opacity: 0, animationFillMode: 'forwards' }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-lg truncate">{session.documentName}</h3>
                          <p className="text-zinc-500 text-sm mt-1">
                            {new Date(session.createdAt).toLocaleDateString('es-AR', { 
                              day: 'numeric', 
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSessionHandler(session.id); }}
                          className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-zinc-400 text-sm line-clamp-2 mb-4">{session.summary}</p>
                      <div className="flex gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {session.flashcards.length} cards
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {session.quizQuestions.length} preg
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {session.chatHistory.length} msgs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {examResults.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <span className="w-1 h-8 bg-emerald-500 rounded-full"></span>
                  Resultados de Exámenes
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {examResults.slice(-5).reverse().map((result, index) => (
                    <div 
                      key={result.id} 
                      className={`glass p-5 rounded-2xl min-w-[160px] text-center animate-fade-in-up stagger-${index + 1}`}
                      style={{ opacity: 0, animationFillMode: 'forwards' }}
                    >
                      <div className={`text-4xl font-bold mb-2 ${
                        result.score >= 8 ? 'text-emerald-400' : 
                        result.score >= 6 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {result.score}
                        <span className="text-lg text-zinc-600">/{result.totalQuestions}</span>
                      </div>
                      <div className="text-zinc-500 text-xs">
                        {new Date(result.date).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="animate-fade-in py-20">
            <div className="max-w-md mx-auto glass rounded-3xl p-8 text-center border border-white/5">
              <div className="w-20 h-20 mx-auto mb-6 bg-cyan-500/10 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              
              {file && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl">
                  <p className="text-white font-medium text-lg truncate">{file.name}</p>
                  <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              )}
              
              {!isUploading ? (
                <>
                  {!file ? (
                    <>
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl cursor-pointer transition-all text-black font-semibold">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Seleccionar archivo</span>
                        <input type="file" className="hidden" accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                      </label>
                      <p className="text-zinc-500 text-sm mt-4">PDF, imágenes, documentos de texto</p>
                    </>
                  ) : (
                    <button
                      onClick={handleUpload}
                      className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-semibold transition-all hover:scale-[1.02] text-black"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Analizar con IA
                      </span>
                    </button>
                  )}
                </>
              ) : (
                <div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-zinc-400">
                    {uploadProgress < 30 ? '📖 Leyendo archivo...' :
                     uploadProgress < 70 ? '🧠 Analizando con IA...' :
                     '✨ Generando contenido...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'study' && currentSession && (
          <div className="animate-fade-in">
            <div className="flex gap-2 mb-8 border-b border-white/10 pb-2 overflow-x-auto">
              {(['summary', 'flashcards', 'quiz', 'chat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setStudyTab(tab); if (tab === 'chat') setMode('chat'); }}
                  className={`px-5 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    studyTab === tab
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab === 'summary' && '📝 Resumen'}
                  {tab === 'flashcards' && `🎴 Flashcards (${dueCards.length})`}
                  {tab === 'quiz' && `❓ Quiz`}
                  {tab === 'chat' && '💬 Chat'}
                </button>
              ))}
            </div>
            
            {studyTab === 'summary' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                    Resumen
                  </h3>
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{currentSession.summary}</p>
                </div>
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                    Puntos Clave
                  </h3>
                  <ul className="space-y-3">
                    {currentSession.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-3 text-zinc-300">
                        <span className="text-cyan-400 font-bold min-w-[24px]">{i + 1}.</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {studyTab === 'flashcards' && (
              <div className="glass p-8 rounded-2xl max-w-2xl mx-auto border border-white/5">
                {currentSession.flashcards.length > 0 ? (
                  <div className="text-center">
                    <div className="text-sm text-zinc-500 mb-6">
                      Tarjeta {currentCardIndex + 1} de {currentSession.flashcards.length}
                    </div>
                    <div className="bg-white/5 p-8 rounded-2xl mb-6 min-h-[200px] flex items-center justify-center">
                      <div>
                        <p className="text-white text-lg font-medium text-center">
                          {currentSession.flashcards[currentCardIndex].question}
                        </p>
                        {showAnswer && (
                          <p className="text-cyan-400 text-lg font-medium text-center mt-6 animate-fade-in">
                            {currentSession.flashcards[currentCardIndex].answer}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!showAnswer ? (
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-semibold transition-all text-black"
                      >
                        Ver Respuesta
                      </button>
                    ) : (
                      <div className="flex gap-3 justify-center flex-wrap">
                        <button onClick={() => rateFlashcard(1)} className="px-5 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-all text-sm font-medium border border-red-500/20">
                          Muy difícil
                        </button>
                        <button onClick={() => rateFlashcard(3)} className="px-5 py-2.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-xl transition-all text-sm font-medium border border-yellow-500/20">
                          Difícil
                        </button>
                        <button onClick={() => rateFlashcard(4)} className="px-5 py-2.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition-all text-sm font-medium border border-blue-500/20">
                          Bien
                        </button>
                        <button onClick={() => rateFlashcard(5)} className="px-5 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition-all text-sm font-medium border border-emerald-500/20">
                          Fácil
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-zinc-500">No hay flashcards disponibles</p>
                )}
              </div>
            )}
            
            {studyTab === 'quiz' && (
              <div className="space-y-6">
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                    Preguntas de la IA
                  </h3>
                  {currentSession.quizQuestions.map((q, i) => (
                    <div key={q.id} className="mb-6 p-5 bg-white/5 rounded-xl">
                      <p className="text-white mb-4 font-medium">{i + 1}. {q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {q.options.map((opt, j) => (
                          <button
                            key={j}
                            onClick={() => handleQuizAnswer(q.id, j)}
                            className={`p-3 rounded-xl text-left text-sm transition-all ${
                              quizAnswers[q.id] === j
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-transparent'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {showQuizResults && quizAnswers[q.id] !== undefined && (
                        <div className={`mt-4 p-3 rounded-xl text-sm ${
                          quizAnswers[q.id] === q.correctAnswer 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {quizAnswers[q.id] === q.correctAnswer ? '✓ Correcto!' : `✗ La respuesta era: ${q.options[q.correctAnswer]}`}
                          {q.explanation && <p className="mt-2 text-zinc-400">{q.explanation}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {!showQuizResults ? (
                    <button
                      onClick={() => setShowQuizResults(true)}
                      className="w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-semibold transition-all text-black"
                    >
                      Ver Resultados
                    </button>
                  ) : (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white mb-4">
                        Nota: {calculateQuizScore()}/10
                      </p>
                      <button
                        onClick={() => { setQuizAnswers({}); setShowQuizResults(false); }}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm"
                      >
                        Repetir Quiz
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="glass p-6 rounded-2xl border border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                    Crea tu propia pregunta
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      placeholder="Escribe tu pregunta de estudio..."
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 input-focus"
                      onKeyDown={(e) => e.key === 'Enter' && handleUserQuestion()}
                    />
                    <button
                      onClick={handleUserQuestion}
                      className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-medium transition-all text-black"
                    >
                      +
                    </button>
                  </div>
                  {generatedQuiz.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowUserQuiz(!showUserQuiz)}
                        className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors"
                      >
                        {showUserQuiz ? 'Ocultar' : 'Ver'} tus preguntas ({generatedQuiz.length})
                      </button>
                      {showUserQuiz && generatedQuiz.map((q, i) => (
                        <div key={q.id} className="mt-3 p-4 bg-white/5 rounded-xl">
                          <p className="text-white">{i + 1}. {q.question}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'chat' && currentSession && (
          <div className="glass rounded-2xl h-[calc(100vh-200px)] flex flex-col border border-white/5">
            <div className="p-5 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                Chat con tu Tutor IA
              </h2>
              <p className="text-zinc-500 text-sm mt-1">Pregunta lo que quieras sobre el material</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {currentSession.chatHistory.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-cyan-500/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-zinc-400">¡Hola! Soy tu tutor de estudio.<br/>Pregúntame sobre el material o pide ayuda con algún concepto.</p>
                </div>
              ) : (
                currentSession.chatHistory.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-medium'
                        : 'bg-white/10 text-zinc-200'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-4 rounded-2xl">
                    <div className="flex gap-2">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-5 border-t border-white/10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 input-focus"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-all text-black"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'exam' && (
          <div className="animate-fade-in">
            <div className="glass p-6 rounded-2xl mb-6 border border-white/5">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-1 h-8 bg-emerald-500 rounded-full"></span>
                Simular Examen
              </h2>
              <p className="text-zinc-400">Responde las preguntas como en un examen real</p>
            </div>
            
            {!showExamResults ? (
              <div className="space-y-6">
                {examQuestions.map((q, i) => (
                  <div key={q.id} className="glass p-5 rounded-2xl border border-white/5">
                    <p className="text-white font-medium mb-4">{i + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, j) => (
                        <button
                          key={j}
                          onClick={() => setExamAnswers(prev => ({ ...prev, [q.id]: j }))}
                          className={`p-4 rounded-xl text-left transition-all ${
                            examAnswers[q.id] === j
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-white/5 text-zinc-300 hover:bg-white/10 border border-transparent'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={submitExam}
                  disabled={Object.keys(examAnswers).length !== examQuestions.length}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all text-black"
                >
                  Entregar Examen
                </button>
              </div>
            ) : (
              <div className="glass p-8 rounded-2xl text-center border border-white/5">
                <div className="text-6xl mb-6">
                  {examScore >= 8 ? '🏆' : examScore >= 6 ? '👍' : '📚'}
                </div>
                <h3 className="text-4xl font-bold text-white mb-4">Nota: {examScore}/10</h3>
                <p className="text-zinc-400 mb-8">
                  {examScore >= 8
                    ? '¡Excelente! Estás listo para el examen real 🚀'
                    : examScore >= 6
                    ? '¡Bien! Pero puedes mejorar un poco más'
                    : 'Necesitas estudiar más. ¡Tú puedes!'}
                </p>
                
                <div className="flex gap-4 justify-center flex-wrap">
                  <button
                    onClick={() => { setShowExamResults(false); setExamAnswers({}); }}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-xl font-medium transition-all text-black"
                  >
                    Repetir Examen
                  </button>
                  <button
                    onClick={() => setMode('study')}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all"
                  >
                    Volver a Estudiar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}