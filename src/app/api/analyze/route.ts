import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, fileBase64, fileType, fileName, message, context, numQuestions } = await request.json();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    const model = 'qwen/qwen2.5-vl-72b-instruct:free';
    let messages: any[] = [];
    let maxTokens = 4000;
    if (action === 'analyze') {
      const isImage = fileType.startsWith('image/') || fileType === 'application/pdf';
      const mimeType = fileType === 'application/pdf' ? 'application/pdf' : fileType;
      const content = isImage
        ? [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } }, { type: 'text', text: `Analiza "${fileName}". JSON con summary, keyPoints, flashcards, quizQuestions.` }]
        : [{ type: 'text', text: `Analiza "${fileName}". JSON.` }];
      messages = [{ role: 'user', content }];
      maxTokens = 8000;
    } else if (action === 'chat') {
      messages = [{ role: 'system', content: `Tutor. Resumen: ${context.summary}. Puntos: ${context.keyPoints.join(', ')}` }, { role: 'user', content: message }];
      maxTokens = 2000;
    } else if (action === 'exam') {
      messages = [{ role: 'system', content: 'Crea examenes' }, { role: 'user', content: `Genera ${numQuestions} preguntas. JSON.` }];
      maxTokens = 4000;
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://genio-facultad.vercel.app', 'X-Title': 'GenioFacultad' },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' }, max_tokens: maxTokens })
    });
    if (!response.ok) return NextResponse.json({ error: `Error: ${await response.text()}` }, { status: 500 });
    const data = await response.json();
    const contentStr = data.choices?.[0]?.message?.content || '{}';
    try { return NextResponse.json(JSON.parse(contentStr)); } catch { return NextResponse.json({ error: 'Error al parsear' }, { status: 500 }); }
  } catch (error: any) { return NextResponse.json({ error: error.message || 'Error' }, { status: 500 }); }
}