const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4'

type GoogleApiRequestInit = RequestInit & {
  accessToken: string
}

type CalendarBusySlot = {
  start: string
  end: string
}

type FreeBusyResponse = {
  calendars: Record<
    string,
    {
      busy?: CalendarBusySlot[]
      errors?: Array<{
        domain: string
        reason: string
      }>
    }
  >
}

type CalendarEventResponse = {
  id: string
  htmlLink?: string
  summary?: string
}

type SheetValuesResponse = {
  range: string
  majorDimension: string
  values?: string[][]
}

type SheetUpdateResponse = {
  updatedRange: string
  updatedRows: number
  updatedColumns: number
  updatedCells: number
}

export type CalendarAvailabilityInput = {
  accessToken: string
  calendarId: string
  timeMin: string
  timeMax: string
  timeZone: string
}

export type CalendarScheduleInput = {
  accessToken: string
  calendarId: string
  summary: string
  startDateTime: string
  endDateTime: string
  timeZone: string
  description?: string
  attendeeEmail?: string
}

export type CalendarCancelInput = {
  accessToken: string
  calendarId: string
  eventId: string
}

export type SheetReadInput = {
  accessToken: string
  spreadsheetId: string
  range: string
}

export type SheetUpdateInput = SheetReadInput & {
  values: string[][]
}

export type SheetDeleteDimensionInput = {
  accessToken: string
  spreadsheetId: string
  sheetId: number
  dimension: 'ROWS' | 'COLUMNS'
  startIndex: number
  endIndex: number
}

async function googleApi<T>(url: string, init: GoogleApiRequestInit): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${init.accessToken}`)

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || `Google API request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function checkCalendarAvailability({
  accessToken,
  calendarId,
  timeMin,
  timeMax,
  timeZone,
}: CalendarAvailabilityInput) {
  const response = await googleApi<FreeBusyResponse>(
    `${CALENDAR_API_BASE}/freeBusy`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone,
        items: [{ id: calendarId }],
      }),
    },
  )

  const calendar = response.calendars[calendarId]

  if (calendar?.errors?.length) {
    throw new Error(calendar.errors.map((error) => error.reason).join(', '))
  }

  return calendar?.busy ?? []
}

export function scheduleCalendarEvent({
  accessToken,
  calendarId,
  summary,
  startDateTime,
  endDateTime,
  timeZone,
  description,
  attendeeEmail,
}: CalendarScheduleInput) {
  return googleApi<CalendarEventResponse>(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(
      calendarId,
    )}/events?sendUpdates=all`,
    {
      accessToken,
      method: 'POST',
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
  )
}

export function cancelCalendarEvent({
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
      method: 'DELETE',
    },
  )
}

export function getSheetValues({
  accessToken,
  spreadsheetId,
  range,
}: SheetReadInput) {
  return googleApi<SheetValuesResponse>(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}`,
    {
      accessToken,
      method: 'GET',
    },
  )
}

export function updateSheetValues({
  accessToken,
  spreadsheetId,
  range,
  values,
}: SheetUpdateInput) {
  return googleApi<SheetUpdateResponse>(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      accessToken,
      method: 'PUT',
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values,
      }),
    },
  )
}

export function clearSheetValues({
  accessToken,
  spreadsheetId,
  range,
}: SheetReadInput) {
  return googleApi<Record<string, never>>(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}/values/${encodeURIComponent(range)}:clear`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}

export function deleteSheetDimension({
  accessToken,
  spreadsheetId,
  sheetId,
  dimension,
  startIndex,
  endIndex,
}: SheetDeleteDimensionInput) {
  return googleApi<Record<string, unknown>>(
    `${SHEETS_API_BASE}/spreadsheets/${encodeURIComponent(
      spreadsheetId,
    )}:batchUpdate`,
    {
      accessToken,
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension,
                startIndex,
                endIndex,
              },
            },
          },
        ],
      }),
    },
  )
}
