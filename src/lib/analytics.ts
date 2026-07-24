export type AnalyticsEvent = {
  name: string;
  startTime: string;
  endTime: string;
  pricingPerHour: number;
  capacity: number;
  bookedCustomers: number;
};

export type EventBreakdown = {
  name: string;
  startTime: string;
  capacity: number;
  bookedCustomers: number;
  remainingSpots: number;
  utilization: number;
};

export type AnalyticsSummary = {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalCapacity: number;
  totalBooked: number;
  utilization: number;
  fullEvents: number;
  openEvents: number;
  remainingSpots: number;
  projectedRevenue: number;
  events: EventBreakdown[];
};

function percentage(part: number, whole: number): number {
  if (whole <= 0) {
    return 0;
  }
  return Math.round((part / whole) * 100);
}

export function summarizeEvents(
  events: AnalyticsEvent[],
  now: Date = new Date(),
): AnalyticsSummary {
  const nowTime = now.getTime();

  let upcomingEvents = 0;
  let pastEvents = 0;
  let totalCapacity = 0;
  let totalBooked = 0;
  let fullEvents = 0;
  let openEvents = 0;
  let remainingSpots = 0;
  let projectedRevenue = 0;

  const breakdown: EventBreakdown[] = events.map((event) => {
    const capacity = Number(event.capacity) || 0;
    const bookedCustomers = Number(event.bookedCustomers) || 0;
    const eventRemaining = Math.max(capacity - bookedCustomers, 0);

    totalCapacity += capacity;
    totalBooked += bookedCustomers;
    remainingSpots += eventRemaining;

    if (bookedCustomers < capacity) {
      openEvents += 1;
    } else {
      fullEvents += 1;
    }

    const startMs = Date.parse(event.startTime);
    if (!Number.isNaN(startMs) && startMs < nowTime) {
      pastEvents += 1;
    } else {
      upcomingEvents += 1;
    }

    const endMs = Date.parse(event.endTime);
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      const hours = (endMs - startMs) / 3600000;
      const pricingPerHour = Number(event.pricingPerHour) || 0;
      projectedRevenue += pricingPerHour * hours * bookedCustomers;
    }

    return {
      name: event.name,
      startTime: event.startTime,
      capacity,
      bookedCustomers,
      remainingSpots: eventRemaining,
      utilization: percentage(bookedCustomers, capacity),
    };
  });

  return {
    totalEvents: events.length,
    upcomingEvents,
    pastEvents,
    totalCapacity,
    totalBooked,
    utilization: percentage(totalBooked, totalCapacity),
    fullEvents,
    openEvents,
    remainingSpots,
    projectedRevenue: Math.round(projectedRevenue * 100) / 100,
    events: breakdown,
  };
}
