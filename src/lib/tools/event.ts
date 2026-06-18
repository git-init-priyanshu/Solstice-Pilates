import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const eventLookupTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_events_in_range",
      description:
        "Read studio events from the Event sheet before answering event schedule, pricing, or availability questions. Use the exact event name from the lookup result when booking or changing an event.",
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
            description: "Event name, for example Pilates event.",
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
            description: "Maximum number of customers who can book this event.",
          },
        },
        required: ["name", "startTime", "endTime", "pricingPerHour", "capacity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_event_record",
      description:
        "Update an existing studio event in Google Calendar and the Event sheet after the admin identifies the event and provides one or more changed fields such as name, start time, end time, pricing per hour, or capacity.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          eventId: {
            type: "string",
            description: "Existing Event sheet event_id for the event.",
          },
          name: {
            type: "string",
            description: "Updated event name.",
          },
          startTime: {
            type: "string",
            description:
              "Updated event start time as an RFC3339 date-time with timezone.",
          },
          endTime: {
            type: "string",
            description:
              "Updated event end time as an RFC3339 date-time with timezone.",
          },
          pricingPerHour: {
            type: "number",
            description: "Updated event price per hour.",
          },
          capacity: {
            type: "integer",
            description: "Updated maximum number of customers who can book this event.",
          },
        },
        required: ["eventId"],
      },
    },
  },
  ...eventLookupTools,
];
