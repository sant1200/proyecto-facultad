import { AppState, StudySession, ExamResult, Flashcard, ChatMessage } from '@/types';

const STORAGE_KEY = 'genio-facultad-data';

export function loadState(): AppState {
  if (typeof window === 'undefined') {
    return { currentSession: null, sessions: [], examResults: [] };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  
  return { currentSession: null, sessions: [], examResults: [] };
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state:', e);
  }
}

export function addSession(session: StudySession): void {
  const state = loadState();
  state.sessions.push(session);
  state.currentSession = session;
  saveState(state);
}

export function updateCurrentSession(session: StudySession): void {
  const state = loadState();
  const idx = state.sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) {
    state.sessions[idx] = session;
  }
  state.currentSession = session;
  saveState(state);
}

export function addChatMessage(sessionId: string, message: ChatMessage): void {
  const state = loadState();
  const session = state.sessions.find(s => s.id === sessionId);
  if (session) {
    session.chatHistory.push(message);
    if (state.currentSession?.id === sessionId) {
      state.currentSession = session;
    }
    saveState(state);
  }
}

export function updateFlashcards(sessionId: string, flashcards: Flashcard[]): void {
  const state = loadState();
  const session = state.sessions.find(s => s.id === sessionId);
  if (session) {
    session.flashcards = flashcards;
    if (state.currentSession?.id === sessionId) {
      state.currentSession = session;
    }
    saveState(state);
  }
}

export function addExamResult(result: ExamResult): void {
  const state = loadState();
  state.examResults.push(result);
  saveState(state);
}

export function deleteSession(sessionId: string): void {
  const state = loadState();
  state.sessions = state.sessions.filter(s => s.id !== sessionId);
  state.examResults = state.examResults.filter(e => e.sessionId !== sessionId);
  if (state.currentSession?.id === sessionId) {
    state.currentSession = null;
  }
  saveState(state);
}