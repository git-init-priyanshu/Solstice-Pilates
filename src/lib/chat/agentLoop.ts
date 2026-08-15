import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { maxToolRounds } from "@/lib/chat/chatConstants";
import { chatModel, createCurrentDateContext } from "@/lib/chat/chatHelpers";
import { runTool, toolSchemasFor } from "@/lib/tools/registry";
import type { AgentScope, ToolResult, WorkspaceToolContext } from "@/types/tools.types";

import type OpenAI from "openai";

export type AgentLoopInput = {
  client: OpenAI;
  instructions: string;
  scope: AgentScope;
  messages: ChatCompletionMessageParam[];
  contextMessages?: ChatCompletionMessageParam[];
  toolContext: WorkspaceToolContext;
  initialIntent: string;
  fallbackReply?: string;
  maxRounds?: number;
};

export type AgentLoopResult = {
  reply: string | null;
  lastIntent: string;
  bookingStatus?: string;
  conversationSummary?: string;
  userProfileUpdates?: ToolResult["userProfile"];
};

export async function runAgentLoop({
  client,
  instructions,
  scope,
  messages,
  contextMessages = [],
  toolContext,
  initialIntent,
  fallbackReply,
  maxRounds = maxToolRounds,
}: AgentLoopInput): Promise<AgentLoopResult> {
  const conversationMemory: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: instructions,
    },
    createCurrentDateContext(),
    ...contextMessages,
    ...messages,
  ];

  let lastIntent = initialIntent;
  let bookingStatus: string | undefined;
  let conversationSummary: string | undefined;
  let userProfileUpdates: ToolResult["userProfile"];

  for (let round = 0; round < maxRounds; round += 1) {
    const response = await client.chat.completions.create({
      model: chatModel,
      messages: conversationMemory,
      tools: toolSchemasFor(scope),
      tool_choice: "auto",
    });
    const llmMessage = response.choices[0]?.message;

    if (!llmMessage) {
      break;
    }

    const toolCalls = llmMessage.tool_calls ?? [];

    if (!toolCalls.length) {
      return {
        reply: llmMessage.content || fallbackReply || null,
        lastIntent,
        bookingStatus,
        conversationSummary,
        userProfileUpdates,
      };
    }

    conversationMemory.push({
      role: "assistant",
      content: llmMessage.content,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      if (toolCall.type !== "function") {
        continue;
      }

      const result = await runTool(
        toolCall.function.name,
        toolCall.function.arguments,
        scope,
        toolContext,
      );

      lastIntent = result.intent ?? "";

      if (
        result.intent === "human_handoff" &&
        typeof result.data === "object" &&
        result.data &&
        "reason" in result.data &&
        typeof result.data.reason === "string" &&
        result.data.reason
      ) {
        conversationSummary = `Handoff reason: ${result.data.reason}`;
      }

      if (result.bookingStatus) {
        bookingStatus = result.bookingStatus;
      }

      if (result.userProfile) {
        userProfileUpdates = { ...userProfileUpdates, ...result.userProfile };
      }

      conversationMemory.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: toolCall.id,
      });
    }
  }

  // Tool rounds exhausted: force one final natural-language reply without
  // tools so the user's turn is never silently lost.
  const finalResponse = await client.chat.completions.create({
    model: chatModel,
    messages: conversationMemory,
    tool_choice: "none",
  });

  return {
    reply: finalResponse.choices[0]?.message?.content || fallbackReply || null,
    lastIntent,
    bookingStatus,
    conversationSummary,
    userProfileUpdates,
  };
}
