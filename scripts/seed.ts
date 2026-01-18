import { db } from "../src/db";
import { events, tickets } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Seeding test data...");

  // Clean up existing data
  await db.delete(tickets);
  await db.delete(events);

  // Create test event
  const [event] = await db.insert(events).values({
    name: "Test Concurrency Event",
    totalTickets: 100,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
  }).returning();

  console.log(`Created event: ${event.id}`);

  // Create 100 available tickets
  const ticketValues = Array.from({ length: 100 }).map(() => ({
    eventId: event.id,
    status: "AVAILABLE" as const,
  }));

  // Insert in chunks if needed, but 100 is fine for a single insert
  await db.insert(tickets).values(ticketValues);

  const ticketCount = await db.select().from(tickets).where(eq(tickets.eventId, event.id));
  console.log(`Seeded ${ticketCount.length} tickets for event ${event.id}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
