import { googleApi } from "@/lib/googleApi";
import { getGoogleAccessToken } from "@/lib/googleAuth";
import type {
  CalendarAvailabilityInput,
  CalendarCancelInput,
  CalendarEventResponse,
  CalendarRescheduleInput,
  CalendarScheduleInput,
  FreeBusyResponse,
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
  function checkCalendarAvailability({
    accessToken,
    calendarId,
    timeMin,
    timeMax,
  }: CalendarAvailabilityInput) {
    return googleApi<FreeBusyResponse>(`${CALENDAR_API_BASE}/freeBusy`, {
      accessToken,
      method: "POST",
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: defaultTimeZone,
        items: [{ id: calendarId }],
      }),
    }).then((response) => {
      const calendar = response.calendars[calendarId];

      if (!calendar) {
        const returnedCalendarIds = Object.keys(response.calendars);

        throw new Error(
          [
            `Calendar availability response did not include ${calendarId}`,
            returnedCalendarIds.length > 0
              ? `returned calendars: ${returnedCalendarIds.join(", ")}`
              : "no calendars were returned",
          ].join("; "),
        );
      }

      if (calendar?.errors?.length) {
        throw new Error(
          calendar.errors.map((error) => error.reason).join(", "),
        );
      }

      return calendar?.busy ?? [];
    });
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
    checkCalendarAvailability,
    getCalendarId,
    requireGoogleAccessToken,
    rescheduleCalendarEvent,
    scheduleCalendarEvent,
  };
}
