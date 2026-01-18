CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('AVAILABLE', 'HELD', 'SOLD');--> statement-breakpoint
CREATE TABLE "booking_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"total_tickets" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "ticket_status" DEFAULT 'AVAILABLE' NOT NULL,
	"hold_expires_at" timestamp,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;