import OpenAI from 'openai'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type LLMReplyInput = {
  messages: ChatMessage[]
}

const llmInstructions = `
You are the AI receptionist for Solstice Pilates, a small pilates studio.
Be warm, concise, and practical.
Help clients with class questions, new client onboarding, pricing questions,
booking requests, cancellations, and call requests.
If the user wants to book, ask for the class type, preferred date/time,
name, phone number, and email if missing.
Do not claim a booking is confirmed unless calendar availability has been checked.
`

export async function getLLMReply({ messages }: LLMReplyInput) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('Add an OpenRouter API key to chat with the receptionist.')
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      ...(import.meta.env.VITE_APP_URL
        ? { 'HTTP-Referer': import.meta.env.VITE_APP_URL }
        : {}),
      'X-OpenRouter-Title': 'Solstice Pilates',
    },
  })

  const response = await client.chat.completions.create({
    model: import.meta.env.VITE_OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content: llmInstructions,
      },
      ...messages,
    ],
  })

  return (
    response.choices[0]?.message.content ||
    'I can help with that. Could you share a little more detail?'
  )
}
