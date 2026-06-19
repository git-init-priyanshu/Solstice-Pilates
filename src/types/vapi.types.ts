export type VoiceCallStatus =
  | "idle"
  | "loading"
  | "connecting"
  | "active"
  | "ending"
  | "error";

export type VapiToolDefinition = {
  async?: boolean;
  function?: {
    description?: string;
    name?: string;
    parameters?: Record<string, unknown>;
  };
  type: "function";
};

export type VapiAssistantOverrides = {
  firstMessage?: string;
  firstMessageMode?:
    | "assistant-speaks-first"
    | "assistant-speaks-first-with-model-generated-message"
    | "assistant-waits-for-user";
  metadata?: Record<string, string>;
  model?: {
    messages?: Array<{
      content: string | null;
      role: "assistant" | "function" | "system" | "tool" | "user";
    }>;
    tools?: VapiToolDefinition[];
  };
  serverMessages?: Array<
    "assistant.started" | "conversation-update" | "end-of-call-report" | "tool-calls"
  >;
  variableValues?: Record<string, string>;
};

export type VapiMessage = {
  endedReason?: string;
  status?: string;
  type?: string;
};

export type VapiConversationMessage = {
  content: string | null;
  role: string;
};

export type VapiToolCall = {
  function?: {
    arguments?: Record<string, unknown> | string;
    name?: string;
  };
  id?: string;
  name?: string;
  parameters?: Record<string, unknown>;
};

export type VapiArtifact = {
  messagesOpenAIFormatted?: VapiConversationMessage[];
  transcript?: string;
  variableValues?: Record<string, unknown>;
};

export type VapiWebhookMessage = {
  artifact?: VapiArtifact;
  call?: {
    id?: string;
  };
  endedReason?: string;
  messagesOpenAIFormatted?: VapiConversationMessage[];
  toolCallList?: VapiToolCall[];
  type?: string;
};

export type VapiWebhookPayload = {
  message?: VapiWebhookMessage;
};

export type VapiRouteMessageEntry = {
  content?: string | null;
  role?: string;
};

export type VapiRouteToolCall = {
  function?: {
    arguments?: Record<string, unknown> | string;
    name?: string;
  };
  id?: string;
  name?: string;
  parameters?: Record<string, unknown>;
};

export type VapiRouteArtifact = {
  messagesOpenAIFormatted?: VapiRouteMessageEntry[];
  transcript?: string;
  variableValues?: Record<string, unknown>;
};

export type VapiRouteMessage = {
  artifact?: VapiRouteArtifact;
  messagesOpenAIFormatted?: VapiRouteMessageEntry[];
  toolCallList?: VapiRouteToolCall[];
  type?: string;
};

export type VapiRoutePayload = {
  message?: VapiRouteMessage;
};

export type UseVapiCallOptions = {
  assistantId: string;
  chatId: string;
  publicKey: string;
  userId: string;
  userProfile: {
    email: string;
    name: string;
    phone: string;
  };
};

export type CallStartFailedEvent = {
  error?: string;
};

export type VapiClient = {
  end: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeAllListeners: () => void;
  start: (
    assistant: string,
    assistantOverrides?: VapiAssistantOverrides,
  ) => Promise<unknown>;
  stop: () => Promise<void>;
};
