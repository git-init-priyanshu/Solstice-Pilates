import { isAdminUser } from "@/lib/adminAuth";
import {
  createEvent,
  deleteEvent,
  listEventsForRange,
  updateEvent,
} from "@/lib/tools/eventActions";

function errorStatus(message: string) {
  if (message.includes("could not be found")) {
    return 404;
  }
  if (message.includes("active bookings")) {
    return 409;
  }
  return 400;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminUserId = searchParams.get("adminUserId") || "";

    if (!(await isAdminUser(adminUserId))) {
      return Response.json(
        { message: "Admin access is required." },
        { status: 403 },
      );
    }

    const startTime = searchParams.get("startTime") || "2000-01-01T00:00:00Z";
    const endTime = searchParams.get("endTime") || "2100-01-01T00:00:00Z";

    const data = await listEventsForRange(startTime, endTime);

    return Response.json({ events: data.eventOptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load events.";
    return Response.json({ message }, { status: errorStatus(message) });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      adminUserId?: string;
      name?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      pricingPerHour?: unknown;
      capacity?: unknown;
    };

    if (!(await isAdminUser(body.adminUserId || ""))) {
      return Response.json(
        { message: "Admin access is required." },
        { status: 403 },
      );
    }

    const data = await createEvent(body);

    return Response.json({ event: data.eventRecord }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create the event.";
    return Response.json({ message }, { status: errorStatus(message) });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      adminUserId?: string;
      eventId?: unknown;
      name?: unknown;
      startTime?: unknown;
      endTime?: unknown;
      pricingPerHour?: unknown;
      capacity?: unknown;
    };

    if (!(await isAdminUser(body.adminUserId || ""))) {
      return Response.json(
        { message: "Admin access is required." },
        { status: 403 },
      );
    }

    const data = await updateEvent(body);

    return Response.json({ event: data.eventRecord });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update the event.";
    return Response.json({ message }, { status: errorStatus(message) });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      adminUserId?: string;
      eventId?: string;
    };

    if (!(await isAdminUser(body.adminUserId || ""))) {
      return Response.json(
        { message: "Admin access is required." },
        { status: 403 },
      );
    }

    const data = await deleteEvent({
      eventId: body.eventId,
      confirmedByAdmin: true,
    });

    return Response.json({ event: data.deletedEvent });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete the event.";
    return Response.json({ message }, { status: errorStatus(message) });
  }
}
