import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const eventLookupTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_events_in_range",
      description:
        "Read studio events from the Event sheet before answering class schedule, pricing, or availability questions.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          startTime: {
            type: "string",
            description:
              "Start of the requested window as an RFC3339 date-time with timezone.",
          },
          endTime: {
            type: "string",
            description:
              "End of the requested window as an RFC3339 date-time with timezone.",
          },
        },
        required: ["startTime", "endTime"],
      },
    },
  },
];

export const adminEventTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_event_record",
      description:
        "Create a studio event in Google Calendar and persist it in the Event sheet after the admin provides the name, start time, end time, pricing per hour, and capacity.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            description: "Event name, for example Pilates class.",
          },
          startTime: {
            type: "string",
            description:
              "Event start time as an RFC3339 date-time with timezone.",
          },
          endTime: {
            type: "string",
            description:
              "Event end time as an RFC3339 date-time with timezone.",
          },
          pricingPerHour: {
            type: "number",
            description: "Event price per hour.",
          },
          capacity: {
            type: "integer",
            description: "Maximum number of customers who can book this class.",
          },
        },
        required: ["name", "startTime", "endTime", "pricingPerHour", "capacity"],
      },
    },
  },
  ...eventLookupTools,
];
