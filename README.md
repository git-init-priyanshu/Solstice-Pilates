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
GOOGLE_SHEET_ID=0
GOOGLE_SHEET_LOG_RANGE=Sheet1!A:L
GOOGLE_TIME_ZONE=Asia/Kolkata

APP_URL=http://localhost:3000
```

Google credentials are used only from the Next.js API route. The browser calls
`/api/chat`, and the server refreshes Google access tokens with
`GOOGLE_REFRESH_TOKEN` when Calendar or Sheets tools are needed.

## Scripts

```sh
npm run dev
npm run build
npm run start
npm run lint
```
