import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument, generateChatResponse, generateExam, regenerateFlashcards, regenerateQuiz, regenerateExam } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ 
        error: 'OPENROUTER_API_KEY no encontrada. Configúrala en el dashboard de Vercel.' 
      }, { status: 500 });
    }

    const { action, fileBase64, fileType, fileName, message, context, numQuestions } = await request.json();
    
    if (action === 'analyze') {
      if (!fileBase64 || !fileType || !fileName) {
        return NextResponse.json({ error: 'Faltan datos del archivo' }, { status: 400 });
      }
      const result = await analyzeDocument(fileBase64, fileType, fileName);
      return NextResponse.json(result);
    } 
    
    if (action === 'regenerateFlashcards') {
      if (!fileBase64 || !fileType || !fileName) {
        return NextResponse.json({ error: 'Faltan datos del archivo' }, { status: 400 });
      }
      const result = await regenerateFlashcards(fileBase64, fileType, fileName);
      return NextResponse.json(result);
    } 
    
    if (action === 'regenerateQuiz') {
      if (!fileBase64 || !fileType || !fileName) {
        return NextResponse.json({ error: 'Faltan datos del archivo' }, { status: 400 });
      }
      const result = await regenerateQuiz(fileBase64, fileType, fileName);
      return NextResponse.json(result);
    } 
    
    if (action === 'regenerateExam') {
      if (!fileBase64 || !fileType || !fileName) {
        return NextResponse.json({ error: 'Faltan datos del archivo' }, { status: 400 });
      }
      const result = await regenerateExam(fileBase64, fileType, fileName, numQuestions || 10);
      return NextResponse.json(result);
    } 
    
    if (action === 'chat') {
      if (!message || !context) {
        return NextResponse.json({ error: 'Faltan datos para el chat' }, { status: 400 });
      }
      const content = await generateChatResponse(message, context);
      return NextResponse.json({ content });
    } 
    
    if (action === 'exam') {
      if (!context) {
        return NextResponse.json({ error: 'Falta contexto para el examen' }, { status: 400 });
      }
      const result = await generateExam(context, numQuestions || 10);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: unknown) {
    console.error('API Route Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error interno del servidor' 
    }, { status: 500 });
  }
}