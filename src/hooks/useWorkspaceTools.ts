import { useState } from 'react'

import {
  cancelCalendarEvent,
  checkCalendarAvailability,
  clearSheetValues,
  deleteSheetDimension,
  getSheetValues,
  scheduleCalendarEvent,
  updateSheetValues,
} from '@/lib/googleWorkspace'

const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

function asGoogleDateTime(value: string) {
  if (!value) {
    throw new Error('Date and time are required')
  }

  return new Date(value).toISOString()
}

function formatResult(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value, null, 2)
}

function parseSheetValues(value: string) {
  return value
    .split('\n')
    .filter((row) => row.trim().length > 0)
    .map((row) => row.split(',').map((cell) => cell.trim()))
}

export function useWorkspaceTools() {
  const [accessToken, setAccessToken] = useState('')
  const [calendarId, setCalendarId] = useState('primary')
  const [calendarStart, setCalendarStart] = useState('')
  const [calendarEnd, setCalendarEnd] = useState('')
  const [eventId, setEventId] = useState('')
  const [attendeeEmail, setAttendeeEmail] = useState('')
  const [timeZone, setTimeZone] = useState(defaultTimeZone)
  const [calendarResult, setCalendarResult] = useState('No calendar action yet.')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [sheetId, setSheetId] = useState('0')
  const [sheetRange, setSheetRange] = useState('Sheet1!A1:D10')
  const [sheetValues, setSheetValues] = useState(
    'Name,Email\nExample,client@example.com',
  )
  const [dimensionStart, setDimensionStart] = useState('0')
  const [dimensionEnd, setDimensionEnd] = useState('1')
  const [sheetResult, setSheetResult] = useState('No sheet action yet.')
  const [isWorking, setIsWorking] = useState(false)

  async function runAction(
    action: () => Promise<unknown>,
    setResult: (value: string) => void,
  ) {
    try {
      setIsWorking(true)
      const result = await action()
      setResult(formatResult(result ?? 'Done'))
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setIsWorking(false)
    }
  }

  function checkAvailability() {
    void runAction(
      () =>
        checkCalendarAvailability({
          accessToken,
          calendarId,
          timeMin: asGoogleDateTime(calendarStart),
          timeMax: asGoogleDateTime(calendarEnd),
          timeZone,
        }),
      setCalendarResult,
    )
  }

  function scheduleEvent() {
    void runAction(
      () =>
        scheduleCalendarEvent({
          accessToken,
          calendarId,
          summary: 'Solstice Pilates class',
          startDateTime: asGoogleDateTime(calendarStart),
          endDateTime: asGoogleDateTime(calendarEnd),
          timeZone,
          attendeeEmail,
          description: 'Booked by Solstice Pilates AI receptionist.',
        }),
      setCalendarResult,
    )
  }

  function cancelEvent() {
    void runAction(
      () => cancelCalendarEvent({ accessToken, calendarId, eventId }),
      setCalendarResult,
    )
  }

  function viewSheet() {
    void runAction(
      () => getSheetValues({ accessToken, spreadsheetId, range: sheetRange }),
      setSheetResult,
    )
  }

  function editSheet() {
    void runAction(
      () =>
        updateSheetValues({
          accessToken,
          spreadsheetId,
          range: sheetRange,
          values: parseSheetValues(sheetValues),
        }),
      setSheetResult,
    )
  }

  function clearCells() {
    void runAction(
      () => clearSheetValues({ accessToken, spreadsheetId, range: sheetRange }),
      setSheetResult,
    )
  }

  function deleteRows() {
    void runAction(
      () =>
        deleteSheetDimension({
          accessToken,
          spreadsheetId,
          sheetId: Number(sheetId),
          dimension: 'ROWS',
          startIndex: Number(dimensionStart),
          endIndex: Number(dimensionEnd),
        }),
      setSheetResult,
    )
  }

  function deleteColumns() {
    void runAction(
      () =>
        deleteSheetDimension({
          accessToken,
          spreadsheetId,
          sheetId: Number(sheetId),
          dimension: 'COLUMNS',
          startIndex: Number(dimensionStart),
          endIndex: Number(dimensionEnd),
        }),
      setSheetResult,
    )
  }

  return {
    accessToken,
    attendeeEmail,
    calendarEnd,
    calendarId,
    calendarResult,
    calendarStart,
    cancelEvent,
    checkAvailability,
    clearCells,
    deleteColumns,
    deleteRows,
    dimensionEnd,
    dimensionStart,
    editSheet,
    eventId,
    isWorking,
    scheduleEvent,
    setAccessToken,
    setAttendeeEmail,
    setCalendarEnd,
    setCalendarId,
    setCalendarStart,
    setDimensionEnd,
    setDimensionStart,
    setEventId,
    setSheetId,
    setSheetRange,
    setSheetValues,
    setSpreadsheetId,
    setTimeZone,
    sheetId,
    sheetRange,
    sheetResult,
    sheetValues,
    spreadsheetId,
    timeZone,
    viewSheet,
  }
}

export type WorkspaceTools = ReturnType<typeof useWorkspaceTools>
