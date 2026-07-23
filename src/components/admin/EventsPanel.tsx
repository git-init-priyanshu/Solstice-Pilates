"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";

import ChatHeader from "@/components/chat/ChatHeader";
import { Button } from "@/components/ui/button";

type AdminEvent = {
  eventId: string;
  name: string;
  startTime: string;
  endTime: string;
  pricingPerHour: number;
  capacity: number;
  bookedCustomers: number;
  remainingSpots: number;
  availabilityStatus: string;
};

type EventForm = {
  name: string;
  startTime: string;
  endTime: string;
  pricingPerHour: string;
  capacity: string;
};

const emptyForm: EventForm = {
  name: "",
  startTime: "",
  endTime: "",
  pricingPerHour: "",
  capacity: "",
};

function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toRfc3339(localValue: string) {
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export function EventsPanel({ adminUserId }: { adminUserId: string }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    if (!adminUserId) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/events?adminUserId=${adminUserId}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load events.");
      }

      setEvents((payload.events ?? []) as AdminEvent[]);
      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load events.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [adminUserId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function startCreate() {
    setEditingId("");
    setForm(emptyForm);
  }

  function startEdit(event: AdminEvent) {
    setEditingId(event.eventId);
    setForm({
      name: event.name,
      startTime: toLocalInput(event.startTime),
      endTime: toLocalInput(event.endTime),
      pricingPerHour: String(event.pricingPerHour),
      capacity: String(event.capacity),
    });
  }

  async function submitForm(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    if (!adminUserId || isSaving) {
      return;
    }

    setIsSaving(true);

    const payloadBody = {
      adminUserId,
      name: form.name.trim(),
      startTime: toRfc3339(form.startTime),
      endTime: toRfc3339(form.endTime),
      pricingPerHour: Number(form.pricingPerHour),
      capacity: Number(form.capacity),
      ...(editingId ? { eventId: editingId } : {}),
    };

    try {
      const response = await fetch("/api/admin/events", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save the event.");
      }

      setForm(emptyForm);
      setEditingId("");
      setError("");
      await loadEvents();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save the event.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteEvent(event: AdminEvent) {
    if (!adminUserId || deletingId) {
      return;
    }

    if (!window.confirm(`Delete "${event.name}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(event.eventId);

    try {
      const response = await fetch("/api/admin/events", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ adminUserId, eventId: event.eventId }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to delete the event.");
      }

      setError("");
      await loadEvents();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete the event.",
      );
    } finally {
      setDeletingId("");
    }
  }

  const inputClassName =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader subtitle="Manage the studio schedule" title="Events" />

      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"}
        </span>
        <Button disabled={isLoading} onClick={loadEvents} type="button">
          {isLoading ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RefreshCcw />
          )}
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="border-b border-border bg-card px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-4 py-5">
        <form
          className="mb-6 rounded-lg border border-border bg-card p-4"
          onSubmit={submitForm}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {editingId ? "Edit event" : "Add event"}
            </h2>
            {editingId ? (
              <Button
                onClick={startCreate}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel edit
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs text-muted-foreground">Name</span>
              <input
                className={inputClassName}
                onChange={(changeEvent) =>
                  setForm((current) => ({
                    ...current,
                    name: changeEvent.target.value,
                  }))
                }
                placeholder="Reformer Flow"
                required
                type="text"
                value={form.name}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Start</span>
              <input
                className={inputClassName}
                onChange={(changeEvent) =>
                  setForm((current) => ({
                    ...current,
                    startTime: changeEvent.target.value,
                  }))
                }
                required
                type="datetime-local"
                value={form.startTime}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">End</span>
              <input
                className={inputClassName}
                onChange={(changeEvent) =>
                  setForm((current) => ({
                    ...current,
                    endTime: changeEvent.target.value,
                  }))
                }
                required
                type="datetime-local"
                value={form.endTime}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Price / hour</span>
              <input
                className={inputClassName}
                min="0"
                onChange={(changeEvent) =>
                  setForm((current) => ({
                    ...current,
                    pricingPerHour: changeEvent.target.value,
                  }))
                }
                required
                type="number"
                value={form.pricingPerHour}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Capacity</span>
              <input
                className={inputClassName}
                min="1"
                onChange={(changeEvent) =>
                  setForm((current) => ({
                    ...current,
                    capacity: changeEvent.target.value,
                  }))
                }
                required
                type="number"
                value={form.capacity}
              />
            </label>
          </div>

          <div className="mt-4">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <LoaderCircle className="animate-spin" /> : null}
              {editingId ? "Save changes" : "Add event"}
            </Button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">End</th>
                <th className="px-3 py-2 font-medium">Price/hr</th>
                <th className="px-3 py-2 font-medium">Capacity</th>
                <th className="px-3 py-2 font-medium">Booked</th>
                <th className="px-3 py-2 font-medium">Remaining</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  className="border-b border-border last:border-b-0"
                  key={event.eventId}
                >
                  <td className="px-3 py-2 font-medium text-foreground">
                    {event.name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateTime(event.startTime)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateTime(event.endTime)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.pricingPerHour}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.capacity}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.bookedCustomers}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.remainingSpots}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        event.availabilityStatus === "available"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {event.availabilityStatus === "available"
                        ? "Available"
                        : "Full"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        onClick={() => startEdit(event)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Edit
                      </Button>
                      <Button
                        disabled={
                          event.bookedCustomers > 0 ||
                          deletingId === event.eventId
                        }
                        onClick={() => deleteEvent(event)}
                        size="sm"
                        title={
                          event.bookedCustomers > 0
                            ? "Cannot delete an event that has active bookings."
                            : undefined
                        }
                        type="button"
                        variant="destructive"
                      >
                        {deletingId === event.eventId ? (
                          <LoaderCircle className="animate-spin" />
                        ) : null}
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !events.length ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    No events yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
