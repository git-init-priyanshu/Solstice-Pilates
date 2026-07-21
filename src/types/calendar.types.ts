export type CalendarEventRangeInput = {
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
  timeZone?: string;
};

export type CalendarCancelInput = {
  accessToken: string;
  calendarId: string;
  eventId: string;
};

export type CalendarRescheduleInput = CalendarCancelInput & {
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
};

export type CalendarUpdateInput = CalendarCancelInput & {
  summary?: string;
  startDateTime?: string;
  endDateTime?: string;
  description?: string;
  timeZone?: string;
};

export type CalendarEventTime = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type CalendarListEvent = {
  end?: CalendarEventTime;
  htmlLink?: string;
  id: string;
  start?: CalendarEventTime;
  status?: string;
  summary?: string;
};

export type CalendarEventResponse = {
  id: string;
  htmlLink?: string;
  summary?: string;
};
