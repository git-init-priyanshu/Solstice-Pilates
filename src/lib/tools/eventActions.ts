import { useDatabase as sheetApi } from "@/lib/database";
import { getGoogleAccessToken } from "@/lib/googleApi";
import type { EventRecord } from "@/types/event.types";
import {
  cancelCalendarEvent,
  scheduleCalendarEvent,
  updateCalendarEvent,
} from "@/lib/calendarApi";
import { isPastEventStart } from "@/lib/tools/eventTime";

const {
  createEventRecord,
  deleteEventRecord,
  findEventById,
  listEventsInRange,
  updateEventRecord,
} = sheetApi();

type CreateEventInput = {
  name?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  pricingPerHour?: unknown;
  capacity?: unknown;
};

type UpdateEventInput = CreateEventInput & {
  eventId?: unknown;
};

type DeleteEventInput = {
  eventId?: unknown;
  confirmedByAdmin?: unknown;
};

export async function createEvent(input: CreateEventInput) {
  const name = input.name;
  const startTime = input.startTime;
  const endTime = input.endTime;
  const pricingPerHour = Number(input.pricingPerHour);
  const capacity = Number(input.capacity);

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("An event name is required.");
  }
  if (
    Number.isNaN(Date.parse(startTime as string)) ||
    Number.isNaN(Date.parse(endTime as string))
  ) {
    throw new Error("startTime and endTime must be valid date-times.");
  }
  if (Date.parse(endTime as string) <= Date.parse(startTime as string)) {
    throw new Error("endTime must be after startTime.");
  }
  if (isPastEventStart(startTime as string)) {
    throw new Error("startTime must be in the future.");
  }
  if (!Number.isFinite(pricingPerHour) || pricingPerHour < 0) {
    throw new Error("pricingPerHour must be a non-negative number.");
  }
  if (!Number.isFinite(capacity) || capacity < 1) {
    throw new Error("capacity must be a positive number.");
  }

  // Create event in calendar
  const accessToken = await getGoogleAccessToken();
  const calendarEvent = await scheduleCalendarEvent({
    accessToken,
    calendarId: "primary",
    summary: name,
    startDateTime: startTime as string,
    endDateTime: endTime as string,
    description: "Created by Solstice Pilates admin assistant.",
  });

  if (!calendarEvent.id) {
    throw new Error("Google Calendar did not return an event ID.");
  }

  // Append event data in sheet
  let eventRecord;
  try {
    eventRecord = await createEventRecord({
      eventId: calendarEvent.id,
      name,
      startTime: startTime as string,
      endTime: endTime as string,
      pricingPerHour,
      capacity,
    });
  } catch (error) {
    try {
      await cancelCalendarEvent({
        accessToken,
        calendarId: "primary",
        eventId: calendarEvent.id,
      });
    } catch {
      // Ignore cancellation errors; the database write failure is what matters.
    }
    throw error;
  }

  return {
    calendarEvent,
    eventRecord,
  };
}

export async function updateEvent(input: UpdateEventInput) {
  const eventId = input.eventId;
  if (typeof eventId !== "string" || eventId.trim() === "") {
    throw new Error("An eventId is required.");
  }

  const existingEvent = await findEventById(eventId);
  if (!existingEvent) {
    throw new Error("The selected event could not be found.");
  }

  const name = input.name;
  const startTime = input.startTime;
  const endTime = input.endTime;

  const updatedEvent: EventRecord = {
    ...existingEvent,
    name:
      typeof name === "string" && name.trim() !== "" ? name : existingEvent.name,
    startTime:
      typeof startTime === "string" && startTime.trim() !== ""
        ? startTime
        : existingEvent.startTime,
    endTime:
      typeof endTime === "string" && endTime.trim() !== ""
        ? endTime
        : existingEvent.endTime,
    pricingPerHour: Number(input.pricingPerHour ?? existingEvent.pricingPerHour),
    capacity: Number(input.capacity ?? existingEvent.capacity),
  };

  if (
    !Number.isFinite(updatedEvent.pricingPerHour) ||
    updatedEvent.pricingPerHour < 0
  ) {
    throw new Error("pricingPerHour must be a non-negative number.");
  }
  if (!Number.isFinite(updatedEvent.capacity) || updatedEvent.capacity < 1) {
    throw new Error("capacity must be a positive number.");
  }
  if (
    updatedEvent.startTime !== existingEvent.startTime ||
    updatedEvent.endTime !== existingEvent.endTime
  ) {
    if (
      Number.isNaN(Date.parse(updatedEvent.startTime)) ||
      Number.isNaN(Date.parse(updatedEvent.endTime))
    ) {
      throw new Error("startTime and endTime must be valid date-times.");
    }
    if (Date.parse(updatedEvent.endTime) <= Date.parse(updatedEvent.startTime)) {
      throw new Error("endTime must be after startTime.");
    }
  }

  if (updatedEvent.capacity < existingEvent.bookedCustomers) {
    throw new Error(
      "capacity cannot be lower than the current number of booked customers.",
    );
  }

  const shouldUpdateCalendar =
    updatedEvent.name !== existingEvent.name ||
    updatedEvent.startTime !== existingEvent.startTime ||
    updatedEvent.endTime !== existingEvent.endTime;

  let updatedCalendarEvent = null;
  if (shouldUpdateCalendar) {
    const accessToken = await getGoogleAccessToken();
    updatedCalendarEvent = await updateCalendarEvent({
      accessToken,
      calendarId: "primary",
      eventId,
      summary: updatedEvent.name,
      startDateTime: updatedEvent.startTime,
      endDateTime: updatedEvent.endTime,
    });
  }

  // Update event in sheet
  let eventRecord;
  try {
    eventRecord = await updateEventRecord(updatedEvent);
  } catch (error) {
    if (shouldUpdateCalendar) {
      try {
        const accessToken = await getGoogleAccessToken();
        await updateCalendarEvent({
          accessToken,
          calendarId: "primary",
          eventId,
          summary: existingEvent.name,
          startDateTime: existingEvent.startTime,
          endDateTime: existingEvent.endTime,
        });
      } catch {
        // Ignore rollback errors; the database write failure is what matters.
      }
    }
    throw error;
  }

  return {
    updatedCalendarEvent,
    eventRecord,
    previousEvent: existingEvent,
  };
}

export async function deleteEvent(input: DeleteEventInput) {
  if (input.confirmedByAdmin !== true) {
    throw new Error("Admin must explicitly confirm before deleting the event.");
  }

  const eventId = input.eventId;
  if (typeof eventId !== "string" || eventId.trim() === "") {
    throw new Error("An eventId is required.");
  }

  const existingEvent = await findEventById(eventId);
  if (!existingEvent) {
    throw new Error("The selected event could not be found.");
  }

  if (existingEvent.bookedCustomers > 0) {
    throw new Error("Cannot delete an event that has active bookings.");
  }

  // Cancel event in calendar, tolerating an already-removed event.
  try {
    const accessToken = await getGoogleAccessToken();
    await cancelCalendarEvent({
      accessToken,
      calendarId: "primary",
      eventId,
    });
  } catch {
    // The calendar event may already be gone; continue with deletion.
  }

  // Delete event from sheet
  const deletedEvent = await deleteEventRecord(eventId);

  return {
    deletedEvent,
  };
}

export async function listEventsForRange(startTime: string, endTime: string) {
  // Get all event in specified range sorted.
  const data = await listEventsInRange({
    startTime,
    endTime,
  });
  const eventOptions = data.map((event) => {
    const isPast = isPastEventStart(event.startTime);
    return {
      eventId: event.eventId,
      name: event.name,
      startTime: event.startTime,
      endTime: event.endTime,
      pricingPerHour: event.pricingPerHour,
      capacity: event.capacity,
      bookedCustomers: event.bookedCustomers,
      remainingSpots: Math.max(event.capacity - event.bookedCustomers, 0),
      isPast,
      availabilityStatus: isPast
        ? "past"
        : event.bookedCustomers < event.capacity
          ? "available"
          : "full",
    };
  });
  const summary = eventOptions.length
    ? `Found ${eventOptions.length} event${eventOptions.length === 1 ? "" : "s"}: ${eventOptions
        .map(
          (event) =>
            `${event.name}, ${event.startTime} to ${event.endTime}, ${event.isPast ? "past" : `${event.availabilityStatus}, ${event.remainingSpots} spots remaining`}, price ${event.pricingPerHour}`,
        )
        .join("; ")}.`
    : `No events found between ${startTime} and ${endTime}.`;

  return {
    summary,
    eventOptions,
    count: data.length,
    selectionRule:
      "Use the exact event name from one matching event option when booking or changing an event. Do not invent IDs.",
  };
}
