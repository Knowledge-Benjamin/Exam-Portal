CREATE TYPE "public"."exam_room_event_type" AS ENUM('joined', 'left', 'reconnected');--> statement-breakpoint

CREATE TABLE "exam_room_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"student_name" text NOT NULL,
	"student_reg_number" text NOT NULL,
	"type" "exam_room_event_type" NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "exam_room_events" ADD CONSTRAINT "exam_room_events_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_room_events" ADD CONSTRAINT "exam_room_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
