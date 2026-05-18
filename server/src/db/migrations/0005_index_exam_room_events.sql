CREATE INDEX IF NOT EXISTS idx_exam_room_events_exam_created_at ON "exam_room_events" ("exam_id", "created_at" DESC);--> statement-breakpoint
