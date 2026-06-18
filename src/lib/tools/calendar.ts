import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const calendarTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "schedule_calendar_event",
      description:
        "Book a class after the client explicitly confirmed. This tool checks Calendar conflicts automatically.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerEmail: { type: "string" },
          classType: { type: "string" },
          startDateTime: { type: "string" },
          endDateTime: { type: "string" },
          confirmedByCustomer: {
            type: "boolean",
            description:
              "True only if the user explicitly confirmed this booking.",
          },
        },
        required: [
          "customerName",
          "customerPhone",
          "classType",
          "startDateTime",
          "endDateTime",
          "confirmedByCustomer",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_calendar_event",
      description:
        "Reschedule an existing event only after the client explicitly confirms the new time. This tool checks Calendar conflicts automatically.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventId: { type: "string" },
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          startDateTime: { type: "string" },
          endDateTime: { type: "string" },
          confirmedByCustomer: { type: "boolean" },
        },
        required: [
          "eventId",
          "customerName",
          "customerPhone",
          "startDateTime",
          "endDateTime",
          "confirmedByCustomer",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_calendar_event",
      description:
        "Cancel an existing calendar event when the event ID is known.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventId: { type: "string" },
          reason: { type: "string" },
        },
        required: ["eventId"],
      },
    },
  },
];
