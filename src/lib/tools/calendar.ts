import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const calendarTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_calendar_availability",
      description:
        "Check Solstice Pilates calendar availability before discussing open booking times.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          timeMin: {
            type: "string",
            description:
              "Start of the requested window as an RFC3339 date-time with timezone, for example 2026-06-18T10:00:00+05:30.",
          },
          timeMax: {
            type: "string",
            description:
              "End of the requested window as an RFC3339 date-time with timezone, for example 2026-06-18T11:00:00+05:30.",
          },
        },
        required: ["timeMin", "timeMax"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "schedule_calendar_event",
      description:
        "Book a class only after availability was checked and the client explicitly confirmed.",
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
        "Reschedule an existing event only after the client explicitly confirms the new time.",
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
