import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const ticketStatusEnum = pgEnum("ticket_status", [
  "AVAILABLE",
  "HELD",
  "SOLD",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING",
  "COMPLETED",
  "EXPIRED",
  "CANCELLED",
]);

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  totalTickets: integer("total_tickets").notNull(),
  startDate: timestamp("start_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .references(() => events.id)
    .notNull(),
  status: ticketStatusEnum("status").default("AVAILABLE").notNull(),
  holdExpiresAt: timestamp("hold_expires_at"),
  version: integer("version").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingIntents = pgTable("booking_intents", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: bookingStatusEnum("status").default("PENDING").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations for convenience
export const eventsRelations = relations(events, ({ many }) => ({
  tickets: many(tickets),
}));

export const ticketsRelations = relations(tickets, ({ one }) => ({
  event: one(events, {
    fields: [tickets.eventId],
    references: [events.id],
  }),
}));
