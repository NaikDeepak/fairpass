import { db } from "../db";
import { tickets, bookingIntents } from "../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function reserveTicket(eventId: string, quantity: number) {
  return await db.transaction(async (tx) => {
    // 1. Select tickets with FOR UPDATE SKIP LOCKED
    // We use sql raw because it's the most reliable way to ensure SKIP LOCKED is applied correctly in some versions of Drizzle
    // However, Drizzle does support .for('update', { skipLocked: true }) in newer versions.
    // Let's use the query builder with .for()

    const availableTickets = await tx
      .select({ id: tickets.id })
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), eq(tickets.status, "AVAILABLE")))
      .limit(quantity)
      .for("update", { skipLocked: true });

    if (availableTickets.length < quantity) {
      throw new Error("SOLD OUT");
    }

    const ticketIds = availableTickets.map((t) => t.id);
    const holdExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 2. Update selected tickets to 'HELD'
    await tx
      .update(tickets)
      .set({
        status: "HELD",
        holdExpiresAt: holdExpiresAt,
      })
      .where(inArray(tickets.id, ticketIds));

    // 3. Create booking_intent record
    const [intent] = await tx
      .insert(bookingIntents)
      .values({
        status: "PENDING",
        expiresAt: holdExpiresAt,
      })
      .returning();

    // Note: In a real app, we'd also link the tickets to the booking intent
    // But we're following the plan's exact requirements.

    return {
      bookingIntentId: intent.id,
      ticketIds,
      expiresAt: holdExpiresAt,
    };
  });
}
