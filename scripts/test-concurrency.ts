import { db } from "../src/db";
import { events, tickets, bookingIntents } from "../src/db/schema";
import { reserveTicket } from "../src/lib/booking";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting concurrency test...");

  // 1. Reset inventory to 10 tickets
  await db.delete(bookingIntents);
  await db.delete(tickets);
  await db.delete(events);

  const [event] = await db
    .insert(events)
    .values({
      name: "Concurrency Test Event",
      totalTickets: 10,
      startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning();

  const ticketValues = Array.from({ length: 10 }).map(() => ({
    eventId: event.id,
    status: "AVAILABLE" as const,
  }));
  await db.insert(tickets).values(ticketValues);

  console.log(`Initialized 10 tickets for event ${event.id}`);

  // 2. Spawn 50 concurrent promises
  console.log("Spawning 50 concurrent reservation requests...");
  const requests = Array.from({ length: 50 }).map(() => reserveTicket(event.id, 1));

  // 3. Await all results
  const results = await Promise.allSettled(requests);

  // 4. Count successes and failures
  const successes = results.filter((r) => r.status === "fulfilled").length;
  const failures = results.filter((r) => r.status === "rejected").length;

  console.log(`Successes: ${successes}`);
  console.log(`Failures: ${failures}`);

  // 5. Verify DB state
  const availableCount = await db.select().from(tickets).where(eq(tickets.status, "AVAILABLE"));

  const heldCount = await db.select().from(tickets).where(eq(tickets.status, "HELD"));

  console.log(`DB State - AVAILABLE: ${availableCount.length}, HELD: ${heldCount.length}`);

  // Verification checks
  const isCorrect =
    successes === 10 && failures === 40 && availableCount.length === 0 && heldCount.length === 10;

  if (isCorrect) {
    console.log("✅ CONCURRENCY TEST PASSED: Zero overselling confirmed.");
    process.exit(0);
  } else {
    console.error("❌ CONCURRENCY TEST FAILED: Results do not match expectations.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
