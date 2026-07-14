import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const bookingTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_user_booking",
      description:
        "Store a confirmed event booking in the User sheet after the event is identified from the Event sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventName: {
            type: "string",
            description:
              "Exact Event sheet event name to book. Use the event name from the lookup result.",
          },
          customerName: { type: "string" },
          customerEmail: { type: "string" },
          customerPhone: { type: "string" },
          confirmedByCustomer: {
            type: "boolean",
            description:
              "True only if the user explicitly confirmed this booking.",
          },
        },
        required: [
          "eventName",
          "customerName",
          "customerEmail",
          "customerPhone",
          "confirmedByCustomer",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "change_user_booking",
      description:
        "Move the current user's existing event booking to another Event sheet event after the user explicitly confirms the new event.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventName: {
            type: "string",
            description:
              "Exact Event sheet event name to move into. Use the event name from the lookup result.",
          },
          confirmedByCustomer: {
            type: "boolean",
            description:
              "True only if the user explicitly confirmed the event change.",
          },
        },
        required: ["eventName", "confirmedByCustomer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_user_booking",
      description:
        "Cancel the current user's existing event booking after the user explicitly confirms the cancellation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          confirmedByCustomer: {
            type: "boolean",
            description:
              "True only if the user explicitly confirmed the cancellation.",
          },
        },
        required: ["confirmedByCustomer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_human_handoff",
      description:
        "Escalate the conversation to a human studio admin for billing complaints, refunds, safety concerns, private events, or when the client explicitly asks for a person.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          reason: {
            type: "string",
            description: "Short reason for the handoff.",
          },
        },
        required: ["reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_booking_status",
      description:
        "Fetch the current user's booking status from the User and Event sheets.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_alternative_event_options",
      description:
        "For a user with an existing booking, find alternative event times in a requested window, excluding the current booking and checking seat availability.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          startTime: {
            type: "string",
            description:
              "Start of the search window as an RFC3339 date-time with timezone.",
          },
          endTime: {
            type: "string",
            description:
              "End of the search window as an RFC3339 date-time with timezone.",
          },
          eventName: {
            type: "string",
            description:
              "Optional event name filter. If omitted, use the currently booked event name.",
          },
        },
        required: ["startTime", "endTime"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_booking_guest_capacity",
      description:
        "Check whether the user's currently booked event has enough remaining capacity for one or more additional guests.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          additionalGuests: {
            type: "integer",
            description:
              "How many extra guests to check for. Omit to check for one friend.",
          },
        },
      },
    },
  },
];
