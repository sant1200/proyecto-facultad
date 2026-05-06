import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { action, fileBase64, fileType, fileName, message, context, numQuestions } = await request.json();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key no configurada' }, { status: 500 });
    const model = 'openrouter/free';
    let messages: any[] = [];
    let maxTokens = 4000;
    if (action === 'analyze') {
      const prompt = `Analiza este documento y devuelve JSON con: summary (resumen breve), keyPoints (array de 5 puntos clave), flashcards (array de 5 objetos con question y answer), quizQuestions (array de 5 preguntas con question, options array, correctAnswer, explanation). JSON limpio sin texto extra.`;
      const isImage = fileType.startsWith('image/') || fileType === 'application/pdf';
      const mimeType = fileType === 'application/pdf' ? 'application/pdf' : fileType;
      const content = isImage
        ? [{ type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } }, { type: 'text', text: prompt }]
        : [{ type: 'text', text: `${prompt}\n\nContenido: ${fileName}` }];
      messages = [{ role: 'user', content }];
      maxTokens = 4000;
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
    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);
      return NextResponse.json({ error: `Error API (${response.status}): ${errText}` }, { status: 500 });
    }
    const data = await response.json();
    console.log('OpenRouter response:', JSON.stringify(data).substring(0, 200));
    const contentStr = data.choices?.[0]?.message?.content || '{}';
    try { return NextResponse.json(JSON.parse(contentStr)); } catch { 
      console.error('Parse error, content was:', contentStr.substring(0, 200));
      return NextResponse.json({ error: 'Error al parsear respuesta' }, { status: 500 }); 
    }
  } catch (error: any) { 
    console.error('Server error:', error);
    return NextResponse.json({ error: `Error: ${error.message || 'Error desconocido'}` }, { status: 500 }); 
  }
}