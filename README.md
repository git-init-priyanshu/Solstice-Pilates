# procindex-assignment

Next.js app for the Solstice Pilates AI receptionist.

## Run Locally

```sh
npm install
npm run db:migrate   # create the schema on your database
npm run db:seed      # optional: load sample events
npm run dev
```

The app runs at `http://localhost:3000` by default.

## Environment

Create `.env` from `.env.example` and fill in the server-side values:

```env
DATABASE_URL=postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require

OPENROUTER_API_KEY=
OPENROUTER_MODEL=openai/gpt-4o-mini

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary
GOOGLE_TIME_ZONE=Asia/Kolkata

APP_URL=http://localhost:3000

NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=
VAPI_WEBHOOK_SECRET=
```

Google credentials are used only from the Next.js API route. The browser calls
`/api/chat`, and the server refreshes Google access tokens with
`GOOGLE_REFRESH_TOKEN` when the Calendar tool is needed.

## Database

Application data (users, chat sessions, events) is stored in PostgreSQL via
[Prisma](https://www.prisma.io/), using [Neon](https://neon.tech/) as the
provider. Grab the **pooled** connection string from the Neon dashboard and set
it as `DATABASE_URL`.

The schema lives in `prisma/schema.prisma`. The data-access layer is
`src/lib/database.ts` (`useDatabase()`), backed by the Prisma client singleton
in `src/lib/prisma.ts`.

```sh
npm run db:migrate   # apply migrations in development
npm run db:deploy    # apply migrations in production/CI
npm run db:seed      # load sample events
npm run db:studio    # browse data in Prisma Studio
```

## Vapi Voice Calls

The UI includes a Vapi web-call integration with start/end controls.

1. Create a Vapi assistant in the dashboard.
2. Set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.
3. Configure the assistant Server URL to `https://your-app-url/api/vapi`.
4. Configure the same token in Vapi and `VAPI_WEBHOOK_SECRET`.
   `VAPI_WEBHOOK_SECRET` is required: the webhook rejects all requests
   (503) until it is set.

The webhook executes event and booking tools, returns their results to Vapi,
and persists voice conversation updates in the database.

## Scripts

```sh
npm run dev
npm run build
npm run start
npm run lint
npm run db:migrate
npm run db:seed
npm run db:studio
```
