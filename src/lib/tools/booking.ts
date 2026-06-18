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
];
