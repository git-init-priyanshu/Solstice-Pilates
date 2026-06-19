"use client";

import { useEffect, useRef, useState } from "react";

import { assistantInstructions } from "@/lib/chat/chatConstants";
import { bookingTools } from "@/lib/tools/booking";
import { eventLookupTools } from "@/lib/tools/event";
import type {
  CallStartFailedEvent,
  UseVapiCallOptions,
  VapiAssistantOverrides,
  VapiClient,
  VapiMessage,
  VoiceCallStatus,
} from "@/types/vapi.types";

const voiceToolDefinitions = [...eventLookupTools, ...bookingTools]
  .filter((tool) => tool.type === "function")
  .map((tool) => ({
    type: "function" as const,
    function: tool.function,
  }));

export function useVapiCall({
  assistantId,
  chatId,
  publicKey,
  userId,
  userProfile,
}: UseVapiCallOptions) {
  const vapiRef = useRef<VapiClient | null>(null);

  const [callStatus, setCallStatus] = useState<VoiceCallStatus>("loading");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function initializeVapi() {
      try {
        const module = await import("@vapi-ai/web");

        if (isCancelled) return;

        const vapi = new module.default(publicKey) as VapiClient;

        vapi.on("call-start", () => {
          setCallStatus("active");
        });
        vapi.on("call-end", () => {
          setCallStatus("idle");
        });
        vapi.on("call-start-failed", (event: unknown) => {
          const failedEvent = event as CallStartFailedEvent | undefined;
          setCallStatus("error");
          console.error(
            failedEvent?.error,
          );
        });
        vapi.on("error", (error: unknown) => {
          setCallStatus("error");
          console.error(error);
        });
        vapi.on("message", (message: unknown) => {
          const parsedMessage = message as VapiMessage;

          if (parsedMessage.type !== "status-update" || !parsedMessage.status) return;
          if (
            parsedMessage.status === "queued" ||
            parsedMessage.status === "ringing" ||
            parsedMessage.status === "scheduled"
          ) {
            setCallStatus("connecting");
            return;
          }
          if (
            parsedMessage.status === "in-progress" ||
            parsedMessage.status === "forwarding"
          ) {
            setCallStatus("active");
            return;
          }
          if (
            parsedMessage.status === "ended" ||
            parsedMessage.status === "not-found"
          ) {
            setCallStatus("idle");

            if (
              parsedMessage.endedReason &&
              parsedMessage.endedReason !== "customer-ended-call"
            ) {
              console.error(`Call ended: ${parsedMessage.endedReason}`);
            }
          }
        });

        vapiRef.current = vapi;
        setIsReady(true);
        setCallStatus("idle");
      } catch {
        if (isCancelled) return;
        setCallStatus("error");
        console.error("The Vapi SDK could not be loaded.");
      }
    }

    initializeVapi();

    return () => {
      isCancelled = true;

      const client = vapiRef.current;
      vapiRef.current = null;

      if (!client) return;
      client.removeAllListeners();
    };
  }, [publicKey]);

  async function startCall() {
    if (!vapiRef.current || !isReady || !chatId || !userId) {
      setCallStatus("error");
      return;
    }

    setCallStatus("connecting");

    try {
      const assistantOverrides: VapiAssistantOverrides = {
        firstMessage:
          "Hi, this is Solstice Pilates. How can I help you today?",
        firstMessageMode: "assistant-speaks-first",
        metadata: {
          channel: "web",
          chatId,
          userId,
        },
        model: {
          messages: [
            {
              role: "system",
              content: assistantInstructions,
            },
          ],
          tools: voiceToolDefinitions,
        },
        serverMessages: [
          "assistant.started",
          "conversation-update",
          "end-of-call-report",
          "tool-calls",
        ],
        variableValues: {
          chatId,
          userId,
          name: userProfile.name,
          email: userProfile.email,
          phone: userProfile.phone,
        },
      };

      await vapiRef.current.start(assistantId, assistantOverrides);
    } catch (error) {
      setCallStatus("error");
      console.error(error);
    }
  }

  function endCall() {
    if (!vapiRef.current) return;
    setCallStatus("ending");
    vapiRef.current.end();
  }

  return {
    callStatus,
    endCall,
    hasAssistant: Boolean(assistantId),
    isReady,
    startCall,
  };
}
