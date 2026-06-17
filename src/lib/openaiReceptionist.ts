import OpenAI from 'openai'

export type ReceptionistChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ReceptionistReplyInput = {
  apiKey?: string
  messages: ReceptionistChatMessage[]
}

const receptionistInstructions = `
You are the AI receptionist for Solstice Pilates, a small pilates studio.
Be warm, concise, and practical.
Help clients with class questions, new client onboarding, pricing questions,
booking requests, cancellations, and call requests.
If the user wants to book, ask for the class type, preferred date/time,
name, phone number, and email if missing.
Do not claim a booking is confirmed unless calendar availability has been checked.
`

function getOpenRouterApiKey(apiKey?: string) {
  return apiKey?.trim() || import.meta.env.VITE_OPENROUTER_API_KEY
}

function getOpenRouterModel() {
  return import.meta.env.VITE_OPENROUTER_MODEL || 'openai/gpt-4o-mini'
}

export async function getReceptionistReply({
  apiKey,
  messages,
}: ReceptionistReplyInput) {
  const resolvedApiKey = getOpenRouterApiKey(apiKey)

  if (!resolvedApiKey) {
    throw new Error('Add an OpenRouter API key to chat with the receptionist.')
  }

  const client = new OpenAI({
    apiKey: resolvedApiKey,
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
    model: getOpenRouterModel(),
    messages: [
      {
        role: 'system',
        content: receptionistInstructions,
      },
      ...messages,
    ],
  })

  return (
    response.choices[0]?.message.content ||
    'I can help with that. Could you share a little more detail?'
  )
}
