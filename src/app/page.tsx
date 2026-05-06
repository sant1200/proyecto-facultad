'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeDocument, generateChatResponse, generateExam } from '@/lib/ai';
import { loadState, saveState, addSession, updateCurrentSession, addChatMessage, updateFlashcards, addExamResult, deleteSession } from '@/lib/storage';
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

  useEffect(() => {
    const state = loadState();
    setSessions(state.sessions);
    setCurrentSession(state.currentSession);
    setExamResults(state.examResults);
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
      const result = await analyzeDocument(base64, file.type, file.name);
      
      setUploadProgress(70);
      
      const newSession: StudySession = {
        id: generateId(),
        documentName: file.name,
        createdAt: Date.now(),
        summary: result.summary,
        keyPoints: result.keyPoints,
        flashcards: result.flashcards.map((f, i) => ({
          ...createEmptyFlashcard(),
          id: generateId(),
          question: f.question,
          answer: f.answer
        })),
        quizQuestions: result.quizQuestions.map((q, i) => ({
          id: generateId(),
          ...q
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
      const response = await generateChatResponse(chatInput, {
        summary: currentSession.summary,
        keyPoints: currentSession.keyPoints
      });
      
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response,
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
      const result = await generateExam({
        summary: currentSession.summary,
        keyPoints: currentSession.keyPoints
      }, 10);
      
      setExamQuestions(result.questions.map((q, i) => ({
        id: generateId(),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation
      })));
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

  const dueCards = currentSession?.flashcards.filter(c => c.nextReview <= Date.now()) || [];

  return (
    <div className="min-h-screen gradient-bg">
      <header className="glass sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="text-xl font-bold text-white">GenioFacultad</span>
        </div>
        
        {mode !== 'home' && mode !== 'upload' && (
          <nav className="flex gap-2">
            <button
              onClick={() => setMode('study')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'study' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Estudiar
            </button>
            <button
              onClick={() => setMode('chat')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'chat' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Chat IA
            </button>
            <button
              onClick={startExam}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
            >
              Simular Examen
            </button>
          </nav>
        )}
        
        {mode === 'home' && sessions.length > 0 && (
          <button onClick={goHome} className="text-zinc-400 hover:text-white text-sm">
            ← Volver
          </button>
        )}
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {mode === 'home' && (
          <div className="animate-fade-in">
            <div className="text-center py-16">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                🧠 Convierte tu material de estudio en <span className="text-violet-400">genio</span>
              </h1>
              <p className="text-xl text-zinc-400 mb-8 max-w-2xl mx-auto">
                Sube tus apuntes, PDFs o fotos de clases. La IA te genera resúmenes, flashcards, quizzes y más.
              </p>
              
              <label className="inline-flex items-center gap-3 px-8 py-4 bg-violet-600 hover:bg-violet-500 rounded-xl cursor-pointer transition-all hover:scale-105 purple-glow">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-lg font-semibold">Subir Archivo</span>
                <input type="file" className="hidden" accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} />
              </label>
            </div>
            
            {sessions.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6">Tus Materiales</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {sessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => selectSession(session)}
                      className="glass p-5 rounded-xl cursor-pointer hover:border-violet-500/50 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white text-lg">{session.documentName}</h3>
                          <p className="text-zinc-500 text-sm mt-1">
                            {new Date(session.createdAt).toLocaleDateString('es-AR')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSessionHandler(session.id); }}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          🗑️
                        </button>
                      </div>
                      <p className="text-zinc-400 text-sm mt-3 line-clamp-2">{session.summary}</p>
                      <div className="flex gap-4 mt-4 text-xs text-zinc-500">
                        <span>📚 {session.flashcards.length} flashcards</span>
                        <span>❓ {session.quizQuestions.length} preguntas</span>
                        <span>💬 {session.chatHistory.length} mensajes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {examResults.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-white mb-6">Resultados de Exámenes</h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {examResults.slice(-5).reverse().map(result => (
                    <div key={result.id} className="glass p-4 rounded-xl min-w-[150px] text-center">
                      <div className={`text-3xl font-bold ${result.score >= 8 ? 'text-emerald-400' : result.score >= 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {result.score}
                      </div>
                      <div className="text-zinc-500 text-sm">/{result.totalQuestions}</div>
                      <div className="text-zinc-600 text-xs mt-2">
                        {new Date(result.date).toLocaleDateString('es-AR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="animate-fade-in py-16">
            <div className="max-w-md mx-auto glass rounded-2xl p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-violet-600/20 rounded-full flex items-center justify-center">
                <span className="text-4xl">📄</span>
              </div>
              
              {file && (
                <div className="mb-6">
                  <p className="text-white font-medium text-lg">{file.name}</p>
                  <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              )}
              
              {!isUploading ? (
                <>
                  {!file ? (
                    <>
                      <label className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg cursor-pointer transition-colors">
                        <span>Seleccionar archivo</span>
                        <input type="file" className="hidden" accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileSelect} />
                      </label>
                      <p className="text-zinc-500 text-sm mt-4">PDF, imágenes, documentos de texto</p>
                    </>
                  ) : (
                    <button
                      onClick={handleUpload}
                      className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium transition-colors"
                    >
                      🚀 Analizar con IA
                    </button>
                  )}
                </>
              ) : (
                <div>
                  <div className="w-full bg-zinc-700 rounded-full h-3 mb-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-purple-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-zinc-400">
                    {uploadProgress < 30 ? 'Leyendo archivo...' :
                     uploadProgress < 70 ? '🧠 Analizando con IA...' :
                     'Generando contenido...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'study' && currentSession && (
          <div className="animate-fade-in">
            <div className="flex gap-2 mb-6 border-b border-zinc-700 pb-2">
              {(['summary', 'flashcards', 'quiz', 'chat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setStudyTab(tab); if (tab === 'chat') setMode('chat'); }}
                  className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                    studyTab === tab
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-400 hover:text-white'
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
                <div className="glass p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-white mb-4">📝 Resumen</h3>
                  <p className="text-zinc-300 leading-relaxed">{currentSession.summary}</p>
                </div>
                <div className="glass p-6 rounded-xl">
                  <h3 className="text-xl font-bold text-white mb-4">🎯 Puntos Clave</h3>
                  <ul className="space-y-3">
                    {currentSession.keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-3 text-zinc-300">
                        <span className="text-violet-400 font-bold">{i + 1}.</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {studyTab === 'flashcards' && (
              <div className="glass p-6 rounded-xl max-w-2xl mx-auto">
                {currentSession.flashcards.length > 0 ? (
                  <div className="text-center">
                    <div className="text-sm text-zinc-500 mb-4">
                      Tarjeta {currentCardIndex + 1} de {currentSession.flashcards.length}
                    </div>
                    <div className="bg-zinc-800/50 p-8 rounded-xl mb-6 min-h-[200px] flex items-center justify-center">
                      <div>
                        <p className="text-white text-lg font-medium text-center">
                          {currentSession.flashcards[currentCardIndex].question}
                        </p>
                        {showAnswer && (
                          <p className="text-violet-400 text-lg font-medium text-center mt-4 animate-fade-in">
                            {currentSession.flashcards[currentCardIndex].answer}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!showAnswer ? (
                      <button
                        onClick={() => setShowAnswer(true)}
                        className="px-8 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium"
                      >
                        Ver Respuesta
                      </button>
                    ) : (
                      <div className="flex gap-3 justify-center">
                        <button onClick={() => rateFlashcard(1)} className="px-4 py-2 bg-red-600/80 rounded-lg hover:bg-red-600">Muy difícil</button>
                        <button onClick={() => rateFlashcard(3)} className="px-4 py-2 bg-yellow-600/80 rounded-lg hover:bg-yellow-600">Difícil</button>
                        <button onClick={() => rateFlashcard(4)} className="px-4 py-2 bg-blue-600/80 rounded-lg hover:bg-blue-600">Bien</button>
                        <button onClick={() => rateFlashcard(5)} className="px-4 py-2 bg-emerald-600/80 rounded-lg hover:bg-emerald-600">Fácil</button>
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
                <div className="glass p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-4">Pregunta de la IA</h3>
                  {currentSession.quizQuestions.map((q, i) => (
                    <div key={q.id} className="mb-6 p-4 bg-zinc-800/30 rounded-lg">
                      <p className="text-white mb-3">{i + 1}. {q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, j) => (
                          <button
                            key={j}
                            onClick={() => handleQuizAnswer(q.id, j)}
                            className={`p-2 rounded-lg text-left text-sm transition-colors ${
                              quizAnswers[q.id] === j
                                ? 'bg-violet-600 text-white'
                                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {showQuizResults && quizAnswers[q.id] !== undefined && (
                        <div className={`mt-3 p-2 rounded-lg text-sm ${
                          quizAnswers[q.id] === q.correctAnswer ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'
                        }`}>
                          {quizAnswers[q.id] === q.correctAnswer ? '✓ Correcto!' : `✗ La respuesta era: ${q.options[q.correctAnswer]}`}
                          {q.explanation && <p className="mt-1 text-zinc-400">{q.explanation}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {!showQuizResults ? (
                    <button
                      onClick={() => setShowQuizResults(true)}
                      className="w-full py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium"
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
                        className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                      >
                        Repetir Quiz
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="glass p-4 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-4">Crea tu propia pregunta</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userQuestion}
                      onChange={(e) => setUserQuestion(e.target.value)}
                      placeholder="Escribe tu pregunta de estudio..."
                      className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleUserQuestion()}
                    />
                    <button
                      onClick={handleUserQuestion}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg"
                    >
                      +
                    </button>
                  </div>
                  {generatedQuiz.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowUserQuiz(!showUserQuiz)}
                        className="text-violet-400 text-sm"
                      >
                        {showUserQuiz ? 'Ocultar' : 'Ver'} tus preguntas ({generatedQuiz.length})
                      </button>
                      {showUserQuiz && generatedQuiz.map((q, i) => (
                        <div key={q.id} className="mt-3 p-3 bg-zinc-800/30 rounded-lg">
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
          <div className="animate-fade-in glass rounded-xl h-[calc(100vh-200px)] flex flex-col">
            <div className="p-4 border-b border-zinc-700">
              <h2 className="text-lg font-bold text-white">💬 Chat con tu Tutor IA</h2>
              <p className="text-zinc-500 text-sm">Pregunta lo que quieras sobre el material</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentSession.chatHistory.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  <p className="text-4xl mb-4">🤖</p>
                  <p>¡Hola! Soy tu tutor de estudio. Pregúntame sobre el material o pide ayuda con algún concepto.</p>
                </div>
              ) : (
                currentSession.chatHistory.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl ${
                      msg.role === 'user'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-200'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 p-3 rounded-xl">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span>
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 border-t border-zinc-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendChat}
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'exam' && (
          <div className="animate-fade-in">
            <div className="glass p-6 rounded-xl mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">📝 Simular Examen</h2>
              <p className="text-zinc-400">Responde las preguntas como en un examen real</p>
            </div>
            
            {!showExamResults ? (
              <div className="space-y-6">
                {examQuestions.map((q, i) => (
                  <div key={q.id} className="glass p-5 rounded-xl">
                    <p className="text-white font-medium mb-4">{i + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.options.map((opt, j) => (
                        <button
                          key={j}
                          onClick={() => setExamAnswers(prev => ({ ...prev, [q.id]: j }))}
                          className={`p-3 rounded-lg text-left transition-colors ${
                            examAnswers[q.id] === j
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
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
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg"
                >
                  Entregar Examen
                </button>
              </div>
            ) : (
              <div className="glass p-8 rounded-xl text-center">
                <div className="text-6xl mb-4">
                  {examScore >= 8 ? '🏆' : examScore >= 6 ? '👍' : '📚'}
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">Nota: {examScore}/10</h3>
                <p className="text-zinc-400 mb-6">
                  {examScore >= 8
                    ? '¡Excelente! Estás listo para el examen real 🚀'
                    : examScore >= 6
                    ? '¡Bien! Pero puedes mejorar un poco más'
                    : 'Necesitas estudiar más. ¡Tú puedes!'}
                </p>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => { setShowExamResults(false); setExamAnswers({}); }}
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-lg font-medium"
                  >
                    Repetir Examen
                  </button>
                  <button
                    onClick={() => setMode('study')}
                    className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium"
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