import { googleApi } from "@/lib/googleApi";
import { getGoogleAccessToken } from "@/lib/googleAuth";
import type {
  CalendarCancelInput,
  CalendarEventResponse,
  CalendarEventRangeInput,
  CalendarEventsListResponse,
  CalendarRescheduleInput,
  CalendarScheduleInput,
} from "@/types/calendar.types";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const defaultTimeZone = process.env.GOOGLE_TIME_ZONE || "UTC";

function getCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

async function requireGoogleAccessToken() {
  const accessToken = await getGoogleAccessToken();

  if (!accessToken) {
    throw new Error("Google access token is required for Google tools");
  }

  return accessToken;
}

export function createCalendarClient() {
  function listCalendarEvents({
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

    return googleApi<CalendarEventsListResponse>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events?${searchParams.toString()}`,
      {
        accessToken,
        method: "GET",
      },
    ).then((response) => response.items ?? []);
  }

  function scheduleCalendarEvent({
    accessToken,
    calendarId,
    summary,
    startDateTime,
    endDateTime,
    description,
    attendeeEmail,
  }: CalendarScheduleInput) {
    return googleApi<CalendarEventResponse>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events?sendUpdates=all`,
      {
        accessToken,
        method: "POST",
        body: JSON.stringify({
          summary,
          description,
          start: {
            dateTime: startDateTime,
            timeZone: defaultTimeZone,
          },
          end: {
            dateTime: endDateTime,
            timeZone: defaultTimeZone,
          },
          attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
        }),
      },
    );
  }

  function cancelCalendarEvent({
    accessToken,
    calendarId,
    eventId,
  }: CalendarCancelInput) {
    return googleApi<void>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        accessToken,
        method: "DELETE",
      },
    );
  }

  function rescheduleCalendarEvent({
    accessToken,
    calendarId,
    eventId,
    startDateTime,
    endDateTime,
  }: CalendarRescheduleInput) {
    return googleApi<CalendarEventResponse>(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
        calendarId,
      )}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      {
        accessToken,
        method: "PATCH",
        body: JSON.stringify({
          start: {
            dateTime: startDateTime,
            timeZone: defaultTimeZone,
          },
          end: {
            dateTime: endDateTime,
            timeZone: defaultTimeZone,
          },
        }),
      },
    );
  }

  return {
    cancelCalendarEvent,
    getCalendarId,
    listCalendarEvents,
    requireGoogleAccessToken,
    rescheduleCalendarEvent,
    scheduleCalendarEvent,
  };
}
