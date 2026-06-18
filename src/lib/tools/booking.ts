import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const bookingTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_user_booking",
      description:
        "Store a confirmed class booking in the User sheet after the class event is identified from the Event sheet.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventId: {
            type: "string",
            description: "Event sheet event_id for the class being booked.",
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
          "eventId",
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
        "Move the current user's existing class booking to another Event sheet class after the user explicitly confirms the new class.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventId: {
            type: "string",
            description: "Event sheet event_id for the replacement class.",
          },
          confirmedByCustomer: {
            type: "boolean",
            description:
              "True only if the user explicitly confirmed the class change.",
          },
        },
        required: ["eventId", "confirmedByCustomer"],
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
      name: "find_alternative_class_options",
      description:
        "For a user with an existing booking, find alternative class times in a requested window, excluding the current booking and checking seat availability.",
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
          className: {
            type: "string",
            description:
              "Optional class name filter. If omitted, use the currently booked class name.",
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
        "Check whether the user's currently booked class has enough remaining capacity for one or more additional guests.",
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
