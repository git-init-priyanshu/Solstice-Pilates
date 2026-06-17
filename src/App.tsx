import { useState } from 'react'
import { CalendarDays, Paperclip, Phone, Send, Video } from 'lucide-react'

import './App.css'
import { Button } from '@/components/ui/button'
import {
  cancelCalendarEvent,
  checkCalendarAvailability,
  clearSheetValues,
  deleteSheetDimension,
  getSheetValues,
  scheduleCalendarEvent,
  updateSheetValues,
} from '@/lib/googleWorkspace'

const messages = [
  {
    sender: 'Solstice Pilates',
    text: 'Hi, I am the Solstice Pilates AI receptionist. How can I help today?',
    time: '10:36 AM',
    mine: false,
  },
  {
    sender: 'You',
    text: 'I would like to book a beginner reformer class.',
    time: '10:38 AM',
    mine: true,
  },
  {
    sender: 'Solstice Pilates',
    text: 'Of course. We have beginner-friendly openings this week. Would you prefer a morning or evening class?',
    time: '10:39 AM',
    mine: false,
  },
]

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

function App() {
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
  const [sheetValues, setSheetValues] = useState('Name,Email\nExample,client@example.com')
  const [dimensionStart, setDimensionStart] = useState('0')
  const [dimensionEnd, setDimensionEnd] = useState('1')
  const [sheetResult, setSheetResult] = useState('No sheet action yet.')
  const [isWorking, setIsWorking] = useState(false)

  async function runAction(action: () => Promise<unknown>, setResult: (value: string) => void) {
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

  return (
    <main className="min-h-svh bg-blue-50 p-4 text-slate-950 md:p-8">
      <section className="mx-auto grid min-h-[calc(100svh-2rem)] max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px] md:min-h-[calc(100svh-4rem)]">
        <section className="flex min-h-[640px] min-w-0 overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-blue-100 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <h1 className="m-0 text-lg font-semibold tracking-normal text-blue-700">
                    Solstice Pilates
                  </h1>
                  <p className="text-sm text-slate-500">
                    AI receptionist
                    <span className="mx-2 text-blue-200">/</span>
                    Online
                  </p>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <Button variant="outline">
                  <CalendarDays />
                  Book
                </Button>
                <Button size="icon" variant="outline" aria-label="Call studio">
                  <Phone />
                </Button>
                <Button size="icon" variant="outline" aria-label="Start video call">
                  <Video />
                </Button>
              </div>

              <div className="flex items-center gap-2 sm:hidden">
                <Button size="icon" variant="outline" aria-label="Call studio">
                  <Phone />
                </Button>
              </div>
            </header>

            <div className="border-b border-blue-100 bg-blue-50 px-4 py-3">
              <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-2 text-left text-sm text-blue-700">
                <span className="rounded-md border border-blue-100 bg-white px-2 py-1">
                  New client bookings
                </span>
                <span className="rounded-md border border-blue-100 bg-white px-2 py-1">
                  Class schedule
                </span>
                <span className="rounded-md border border-blue-100 bg-white px-2 py-1">
                  Membership questions
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-blue-50 px-4 py-5">
              <div className="mx-auto flex max-w-2xl flex-col gap-4">
                {messages.map((message) => (
                  <article
                    className={`flex ${message.mine ? 'justify-end' : 'justify-start'}`}
                    key={`${message.sender}-${message.time}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-lg px-4 py-3 text-left shadow-sm ${
                        message.mine
                          ? 'bg-blue-700 text-white'
                          : 'border border-blue-100 bg-white text-slate-950'
                      }`}
                    >
                      <p className="text-sm leading-6">{message.text}</p>
                      <time
                        className={`mt-2 block text-right text-xs ${
                          message.mine ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {message.time}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <form className="flex items-end gap-2 border-t border-blue-100 bg-white p-3">
              <Button size="icon" variant="ghost" type="button" aria-label="Attach file">
                <Paperclip />
              </Button>
              <textarea
                className="min-h-10 flex-1 resize-none rounded-md border border-blue-100 bg-white px-3 py-2 text-sm leading-5 text-slate-950 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Ask about classes, booking, pricing, or call the studio"
                rows={1}
              />
              <Button type="submit" aria-label="Send message">
                <Send />
                Send
              </Button>
            </form>
          </section>
        </section>

        <aside className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-100 p-4">
            <h2 className="m-0 text-base font-semibold text-blue-700">
              Workspace tools
            </h2>
            <label className="mt-3 block text-left text-sm font-medium text-slate-700">
              Access token
              <input
                className="mt-1 h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setAccessToken(event.target.value)}
                placeholder="OAuth bearer token"
                type="password"
                value={accessToken}
              />
            </label>
          </div>

          <div className="max-h-[calc(100svh-12rem)] overflow-y-auto p-4">
            <section className="space-y-3 border-b border-blue-100 pb-4">
              <h3 className="text-left text-sm font-semibold text-slate-950">
                Google Calendar
              </h3>
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setCalendarId(event.target.value)}
                placeholder="Calendar ID"
                value={calendarId}
              />
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setTimeZone(event.target.value)}
                placeholder="Time zone"
                value={timeZone}
              />
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setCalendarStart(event.target.value)}
                type="datetime-local"
                value={calendarStart}
              />
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setCalendarEnd(event.target.value)}
                type="datetime-local"
                value={calendarEnd}
              />
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setAttendeeEmail(event.target.value)}
                placeholder="Client email"
                type="email"
                value={attendeeEmail}
              />
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Event ID"
                value={eventId}
              />
              <div className="grid grid-cols-3 gap-2">
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
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
                  type="button"
                  variant="outline"
                >
                  Check
                </Button>
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
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
                  type="button"
                >
                  Schedule
                </Button>
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
                      () => cancelCalendarEvent({ accessToken, calendarId, eventId }),
                      setCalendarResult,
                    )
                  }
                  type="button"
                  variant="destructive"
                >
                  Cancel
                </Button>
              </div>
              <pre className="max-h-36 overflow-auto rounded-md bg-blue-50 p-3 text-left text-xs text-slate-700">
                {calendarResult}
              </pre>
            </section>

            <section className="mt-4 space-y-3">
              <h3 className="text-left text-sm font-semibold text-slate-950">
                Google Sheets
              </h3>
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setSpreadsheetId(event.target.value)}
                placeholder="Spreadsheet ID"
                value={spreadsheetId}
              />
              <input
                className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setSheetRange(event.target.value)}
                placeholder="Range"
                value={sheetRange}
              />
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-blue-100 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                onChange={(event) => setSheetValues(event.target.value)}
                value={sheetValues}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="h-9 rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setSheetId(event.target.value)}
                  placeholder="Sheet ID"
                  type="number"
                  value={sheetId}
                />
                <input
                  className="h-9 rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setDimensionStart(event.target.value)}
                  placeholder="Start"
                  type="number"
                  value={dimensionStart}
                />
                <input
                  className="h-9 rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  onChange={(event) => setDimensionEnd(event.target.value)}
                  placeholder="End"
                  type="number"
                  value={dimensionEnd}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
                      () => getSheetValues({ accessToken, spreadsheetId, range: sheetRange }),
                      setSheetResult,
                    )
                  }
                  type="button"
                  variant="outline"
                >
                  View
                </Button>
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
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
                  type="button"
                >
                  Edit
                </Button>
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
                      () =>
                        clearSheetValues({
                          accessToken,
                          spreadsheetId,
                          range: sheetRange,
                        }),
                      setSheetResult,
                    )
                  }
                  type="button"
                  variant="destructive"
                >
                  Clear cells
                </Button>
                <Button
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
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
                  type="button"
                  variant="destructive"
                >
                  Delete rows
                </Button>
                <Button
                  className="col-span-2"
                  disabled={isWorking}
                  onClick={() =>
                    runAction(
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
                  type="button"
                  variant="destructive"
                >
                  Delete columns
                </Button>
              </div>
              <pre className="max-h-44 overflow-auto rounded-md bg-blue-50 p-3 text-left text-xs text-slate-700">
                {sheetResult}
              </pre>
            </section>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
