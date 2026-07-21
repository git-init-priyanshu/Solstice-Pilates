import type {
  CalendarCancelInput,
  CalendarEventResponse,
  CalendarEventRangeInput,
  CalendarListEvent,
  CalendarRescheduleInput,
  CalendarScheduleInput,
  CalendarUpdateInput,
} from "@/types/calendar.types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export function listCalendarEvents({
  accessToken,
  calendarId,
  timeMin,
  timeMax,
}: CalendarEventRangeInput) {
  const searchParams = new URLSearchParams({
    orderBy: "startTime",
    singleEvents: "true",
    timeMax,
    timeMin,
  });

  return fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Google API request failed: ${response.status}`);
      }

      return response.json() as Promise<{ items?: CalendarListEvent[] }>;
    })
    .then(({ items = [] }) => items);
}

export function scheduleCalendarEvent({
  accessToken,
  calendarId,
  summary,
  startDateTime,
  endDateTime,
  description,
  attendeeEmail,
  timeZone = process.env.GOOGLE_TIME_ZONE || "UTC",
}: CalendarScheduleInput) {
  return fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
        attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
      }),
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    return response.json() as Promise<CalendarEventResponse>;
  });
}

export function cancelCalendarEvent({
  accessToken,
  calendarId,
  eventId,
}: CalendarCancelInput) {
  return fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }
  });
}

export function rescheduleCalendarEvent({
  accessToken,
  calendarId,
  eventId,
  startDateTime,
  endDateTime,
  timeZone = process.env.GOOGLE_TIME_ZONE || "UTC",
}: CalendarRescheduleInput) {
  return fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: {
          dateTime: startDateTime,
          timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone,
        },
      }),
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    return response.json() as Promise<CalendarEventResponse>;
  });
}

export function updateCalendarEvent({
  accessToken,
  calendarId,
  eventId,
  summary,
  startDateTime,
  endDateTime,
  description,
  timeZone = process.env.GOOGLE_TIME_ZONE || "UTC",
}: CalendarUpdateInput) {
  return fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description,
        start: startDateTime
          ? {
              dateTime: startDateTime,
              timeZone,
            }
          : undefined,
        end: endDateTime
          ? {
              dateTime: endDateTime,
              timeZone,
            }
          : undefined,
      }),
    },
  ).then((response) => {
    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    return response.json() as Promise<CalendarEventResponse>;
  });
}
