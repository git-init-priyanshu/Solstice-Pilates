# procindex-assignment

Next.js app for the Solstice Pilates AI receptionist.

## Run Locally

```sh
npm install
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Environment

Create `.env` from `.env.example` and fill in the server-side values:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary
GOOGLE_SPREADSHEET_ID=
GOOGLE_USER_SHEET_RANGE=User!A:H
GOOGLE_CHAT_SHEET_RANGE=Chat!A:H
GOOGLE_EVENT_SHEET_RANGE=Event!A:I
GOOGLE_TIME_ZONE=Asia/Kolkata

APP_URL=http://localhost:3000

NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=
VAPI_WEBHOOK_SECRET=
```

Google credentials are used only from the Next.js API route. The browser calls
`/api/chat`, and the server refreshes Google access tokens with
`GOOGLE_REFRESH_TOKEN` when Calendar or Sheets tools are needed.

## Vapi Voice Calls

The UI includes a Vapi web-call integration with start/end controls.

1. Create a Vapi assistant in the dashboard.
2. Set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.
3. Configure the assistant Server URL to `https://your-app-url/api/vapi`.
4. If you want webhook authentication, configure the same token in Vapi and
   `VAPI_WEBHOOK_SECRET`.

The webhook executes event and booking tools, returns their results to Vapi,
and persists voice conversation updates in Sheets.

## Scripts

```sh
npm run dev
npm run build
npm run start
npm run lint
```
