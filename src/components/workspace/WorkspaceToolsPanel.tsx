import { Button } from '@/components/ui/button'
import type { WorkspaceTools } from '@/hooks/useWorkspaceTools'

type WorkspaceToolsPanelProps = {
  workspace: WorkspaceTools
}

export function WorkspaceToolsPanel({ workspace }: WorkspaceToolsPanelProps) {
  return (
    <aside className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 p-4">
        <h2 className="m-0 text-base font-semibold text-blue-700">
          Workspace tools
        </h2>
        <label className="mt-3 block text-left text-sm font-medium text-slate-700">
          Google access token
          <input
            className="mt-1 h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setAccessToken(event.target.value)}
            placeholder="OAuth bearer token"
            type="password"
            value={workspace.accessToken}
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
            onChange={(event) => workspace.setCalendarId(event.target.value)}
            placeholder="Calendar ID"
            value={workspace.calendarId}
          />
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setTimeZone(event.target.value)}
            placeholder="Time zone"
            value={workspace.timeZone}
          />
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setCalendarStart(event.target.value)}
            type="datetime-local"
            value={workspace.calendarStart}
          />
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setCalendarEnd(event.target.value)}
            type="datetime-local"
            value={workspace.calendarEnd}
          />
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setAttendeeEmail(event.target.value)}
            placeholder="Client email"
            type="email"
            value={workspace.attendeeEmail}
          />
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setEventId(event.target.value)}
            placeholder="Event ID"
            value={workspace.eventId}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.checkAvailability}
              type="button"
              variant="outline"
            >
              Check
            </Button>
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.scheduleEvent}
              type="button"
            >
              Schedule
            </Button>
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.cancelEvent}
              type="button"
              variant="destructive"
            >
              Cancel
            </Button>
          </div>
          <pre className="max-h-36 overflow-auto rounded-md bg-blue-50 p-3 text-left text-xs text-slate-700">
            {workspace.calendarResult}
          </pre>
        </section>

        <section className="mt-4 space-y-3">
          <h3 className="text-left text-sm font-semibold text-slate-950">
            Google Sheets
          </h3>
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setSpreadsheetId(event.target.value)}
            placeholder="Spreadsheet ID"
            value={workspace.spreadsheetId}
          />
          <input
            className="h-9 w-full rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setSheetRange(event.target.value)}
            placeholder="Range"
            value={workspace.sheetRange}
          />
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-blue-100 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => workspace.setSheetValues(event.target.value)}
            value={workspace.sheetValues}
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              className="h-9 rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => workspace.setSheetId(event.target.value)}
              placeholder="Sheet ID"
              type="number"
              value={workspace.sheetId}
            />
            <input
              className="h-9 rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => workspace.setDimensionStart(event.target.value)}
              placeholder="Start"
              type="number"
              value={workspace.dimensionStart}
            />
            <input
              className="h-9 rounded-md border border-blue-100 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              onChange={(event) => workspace.setDimensionEnd(event.target.value)}
              placeholder="End"
              type="number"
              value={workspace.dimensionEnd}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.viewSheet}
              type="button"
              variant="outline"
            >
              View
            </Button>
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.editSheet}
              type="button"
            >
              Edit
            </Button>
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.clearCells}
              type="button"
              variant="destructive"
            >
              Clear cells
            </Button>
            <Button
              disabled={workspace.isWorking}
              onClick={workspace.deleteRows}
              type="button"
              variant="destructive"
            >
              Delete rows
            </Button>
            <Button
              className="col-span-2"
              disabled={workspace.isWorking}
              onClick={workspace.deleteColumns}
              type="button"
              variant="destructive"
            >
              Delete columns
            </Button>
          </div>
          <pre className="max-h-44 overflow-auto rounded-md bg-blue-50 p-3 text-left text-xs text-slate-700">
            {workspace.sheetResult}
          </pre>
        </section>
      </div>
    </aside>
  )
}
