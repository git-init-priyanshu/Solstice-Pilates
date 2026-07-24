"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, RefreshCcw } from "lucide-react";

import ChatHeader from "@/components/chat/ChatHeader";
import { Button } from "@/components/ui/button";
import type { AnalyticsSummary } from "@/lib/analytics";

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export function AnalyticsPanel({ adminUserId }: { adminUserId: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    if (!adminUserId) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/admin/analytics?adminUserId=${adminUserId}`,
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Unable to load analytics.");
      }

      setAnalytics((payload.analytics ?? null) as AnalyticsSummary | null);
      setError("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load analytics.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [adminUserId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const tiles = analytics
    ? [
        { label: "Utilization", value: `${analytics.utilization}%` },
        {
          label: "Booked / Capacity",
          value: `${analytics.totalBooked} / ${analytics.totalCapacity}`,
        },
        {
          label: "Projected revenue",
          value: `$${analytics.projectedRevenue.toLocaleString()}`,
        },
        { label: "Full events", value: String(analytics.fullEvents) },
      ]
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader subtitle="Studio occupancy and demand" title="Analytics" />

      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <span className="text-sm text-muted-foreground">
          {analytics
            ? `${analytics.totalEvents} event${analytics.totalEvents === 1 ? "" : "s"} · ${analytics.upcomingEvents} upcoming`
            : "Loading..."}
        </span>
        <Button disabled={isLoading} onClick={loadAnalytics} type="button">
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
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div
              className="rounded-lg border border-border bg-card p-4"
              key={tile.label}
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {tile.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {tile.value}
              </p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">Booked</th>
                <th className="px-3 py-2 font-medium">Remaining</th>
                <th className="px-3 py-2 font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.events.map((event) => (
                <tr
                  className="border-b border-border last:border-b-0"
                  key={`${event.name}-${event.startTime}`}
                >
                  <td className="px-3 py-2 font-medium text-foreground">
                    {event.name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDateTime(event.startTime)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.bookedCustomers} / {event.capacity}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {event.remainingSpots}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${
                            event.utilization >= 100
                              ? "bg-destructive"
                              : "bg-primary"
                          }`}
                          style={{
                            width: `${Math.min(event.utilization, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {event.utilization}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !analytics?.events.length ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-muted-foreground"
                    colSpan={5}
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
