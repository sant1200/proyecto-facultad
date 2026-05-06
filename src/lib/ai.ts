import { AIAnalysisResponse } from '@/types';

const getApiKey = () => {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY no configurada. Verifica las variables de entorno.');
  return key;
};

export async function analyzeDocument(
  fileBase64: string,
  fileType: string,
  fileName: string
): Promise<AIAnalysisResponse> {
  const model = 'google/gemini-2.5-flash';
  
  const isImage = fileType.startsWith('image/') || fileType === 'application/pdf';
  const mimeType = fileType === 'application/pdf' ? 'application/pdf' : fileType;
  
  const content = isImage
    ? [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${fileBase64}` }
        },
        {
          type: 'text',
          text: `Analiza este documento "${fileName}" (${fileType}) para estudio universitario. Extrae:
1. Resumen ejecutivo (5-7 líneas max)
2. Puntos clave (lista de 8-10 items)
3. 10 flashcards (pregunta	respuesta simple)
4. 10 preguntas de quiz (4 opciones cada una, indicar cuál es correcta y una explicación breve)

Responde en JSON exactamente así:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "flashcards": [{"question": "...", "answer": "..."}],
  "quizQuestions": [{"question": "...", "options": ["a", "b", "c", "d"], "correctAnswer": 0, "explanation": "..."}]
}`
        }
      ]
    : [
        {
          type: 'text',
          text: `Analiza este documento de estudio "${fileName}" y extrae para un estudiante universitario:
1. Resumen ejecutivo claro
2. Puntos clave importantes (8-10 items)
3. 10 flashcards efectivas para estudio
4. 10 preguntas de quiz con 4 opciones, indicando cuál es correcta y explicación breve

Responde en JSON exactamente así:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "flashcards": [{"question": "...", "answer": "..."}],
  "quizQuestions": [{"question": "...", "options": ["a", "b", "c", "d"], "correctAnswer": 0, "explanation": "..."}]
}`
        }
      ];

  console.log(`[AI] Llamando a OpenRouter con modelo: ${model}`);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://genio-facultad.vercel.app',
      'X-Title': 'GenioFacultad'
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_tokens: 4000 // Reducido para mayor estabilidad
    })
  });

  console.log(`[AI] Status: ${response.status}`);
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI] Error de OpenRouter: ${errorText}`);
    throw new Error(`Error de API: ${response.status}`);
  }

  const rawData = await response.text();
  console.log(`[AI] Respuesta recibida (primeros 100 caracteres): ${rawData.substring(0, 100)}`);
  
  try {
    const data = JSON.parse(rawData);
    const contentStr = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(contentStr);
    return {
      summary: parsed.summary || 'No se pudo generar resumen',
      keyPoints: parsed.keyPoints || [],
      flashcards: parsed.flashcards || [],
      quizQuestions: parsed.quizQuestions || []
    };
  } catch (err) {
    console.error('[AI] Error parseando JSON:', err);
    throw new Error('Error al procesar la respuesta de la IA');
  }
}

export async function generateChatResponse(
  message: string,
  context: { summary: string; keyPoints: string[] }
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://genio-facultad.vercel.app',
      'X-Title': 'GenioFacultad'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Eres un tutor de estudio experto, súper didactivo y motivador. Tu objetivo es ayudar al estudiante a convertirse en un GENIO de la universidad. 
          
Contexto del material de estudio:
- Resumen: ${context.summary}
- Puntos clave: ${context.keyPoints.join(', ')}

Sé claro, usa ejemplos cotidianos, analogías perfectas, y explica como si fuera para un niño de 10 años. Usa emojis，偶尔 mezcla español con inglés cuando sea útil para mejor comprensión. Mantén al estudiante motivado y emocionado por aprender.`
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    throw new Error('Error al generar respuesta');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
}

export async function generateExam(
  context: { summary: string; keyPoints: string[] },
  numQuestions: number = 10
): Promise<{ questions: { question: string; options: string[]; correctAnswer: number; explanation: string }[] }> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://genio-facultad.vercel.app',
      'X-Title': 'GenioFacultad'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en crear exámenes universitarios realistas. Crea preguntas challenging pero justas.'
        },
        {
          role: 'user',
          content: `Genera un examen de ${numQuestions} preguntas sobre:
- Resumen: ${context.summary}
- Puntos clave: ${context.keyPoints.join(', ')}

Cada pregunta debe tener 4 opciones (a, b, c, d) y indicar cuál es la correcta con explicación breve.
Responde en JSON: {"questions": [{"question": "...", "options": ["a", "b", "c", "d"], "correctAnswer": 0, "explanation": "..."}]}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000
    })
  });

  const data = await response.json();
  const contentStr = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(contentStr);
}