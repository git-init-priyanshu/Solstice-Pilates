export type CalendarAvailabilityInput = {
  accessToken: string;
  calendarId: string;
  timeMin: string;
  timeMax: string;
};

export type CalendarScheduleInput = {
  accessToken: string;
  calendarId: string;
  summary: string;
  startDateTime: string;
  endDateTime: string;
  description?: string;
  attendeeEmail?: string;
};

export type CalendarCancelInput = {
  accessToken: string;
  calendarId: string;
  eventId: string;
};

export type CalendarRescheduleInput = CalendarCancelInput & {
  startDateTime: string;
  endDateTime: string;
};

export type CalendarBusySlot = {
  start: string;
  end: string;
};

export type FreeBusyResponse = {
  calendars: Record<
    string,
    {
      busy?: CalendarBusySlot[];
      errors?: Array<{
        domain: string;
        reason: string;
      }>;
    }
  >;
};

export type CalendarEventResponse = {
  id: string;
  htmlLink?: string;
  summary?: string;
};
