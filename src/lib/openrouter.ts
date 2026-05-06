import { AI } from 'ai'

export const openrouter = new AI({
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
})

export const AI_MODEL = 'meta-llama/llama-3.2-90b-vision-instruct'

export async function generateContent(prompt: string, image?: string) {
  const messages: any[] = [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt }
      ]
    }
  ]

  if (image) {
    messages[0].content.push({
      type: 'image_url',
      image_url: { url: image }
    })
  }

  const response = await openrouter.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: 4096
  })

  return response.choices[0]?.message?.content || ''
}

export async function generateChat(messages: any[]) {
  const response = await openrouter.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: 4096
  })

  return response.choices[0]?.message?.content || ''
}