import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const events = [
  {
    id: "seed-morning-flow",
    name: "Morning Flow",
    startTime: "2026-07-13T08:00:00.000Z",
    endTime: "2026-07-13T09:00:00.000Z",
    pricingPerHour: 25,
    capacity: 12,
    bookedCustomers: 0,
  },
  {
    id: "seed-power-reformer",
    name: "Power Reformer",
    startTime: "2026-07-13T18:00:00.000Z",
    endTime: "2026-07-13T19:00:00.000Z",
    pricingPerHour: 35,
    capacity: 8,
    bookedCustomers: 0,
  },
  {
    id: "seed-restorative-pilates",
    name: "Restorative Pilates",
    startTime: "2026-07-14T10:00:00.000Z",
    endTime: "2026-07-14T11:00:00.000Z",
    pricingPerHour: 30,
    capacity: 10,
    bookedCustomers: 0,
  },
];

async function main() {
  for (const event of events) {
    await prisma.event.upsert({
      where: { id: event.id },
      update: event,
      create: event,
    });
  }

  console.log(`Seeded ${events.length} events.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
