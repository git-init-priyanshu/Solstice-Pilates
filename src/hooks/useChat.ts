import { useState, type FormEvent } from 'react'

import {
  getLLMReply,
  type ChatMessage as LLMChatMessage,
} from '@/lib/openaiReceptionist'
import type { ChatMessage } from '@/types/chat'

function createMessageId() {
  return crypto.randomUUID()
}

function getCurrentTime() {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  async function submitChatMessage() {
    const trimmedInput = chatInput.trim()

    if (!trimmedInput || isChatLoading) {
      return
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      sender: 'You',
      text: trimmedInput,
      time: getCurrentTime(),
      mine: true,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setChatInput('')
    setIsChatLoading(true)

    try {
      const modelMessages: LLMChatMessage[] = nextMessages.map(
        (message) => ({
          role: message.mine ? 'user' : 'assistant',
          content: message.text,
        }),
      )
      const reply = await getLLMReply({ messages: modelMessages })

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          sender: 'Solstice Pilates',
          text: reply,
          time: getCurrentTime(),
          mine: false,
        },
      ])
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          sender: 'Solstice Pilates',
          text:
            error instanceof Error
              ? error.message
              : 'I could not connect to the AI receptionist.',
          time: getCurrentTime(),
          mine: false,
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitChatMessage()
  }

  return {
    chatInput,
    handleChatSubmit,
    isChatLoading,
    messages,
    setChatInput,
    submitChatMessage,
  }
}

export type Chat = ReturnType<typeof useChat>
