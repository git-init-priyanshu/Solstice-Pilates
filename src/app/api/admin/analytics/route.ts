import { isAdminUser } from "@/lib/adminAuth";
import { summarizeEvents } from "@/lib/analytics";
import { listEventsForRange } from "@/lib/tools/eventActions";

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
    const analytics = summarizeEvents(data.eventOptions);

    return Response.json({ analytics });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load analytics.";
    return Response.json({ message }, { status: 400 });
  }
}
