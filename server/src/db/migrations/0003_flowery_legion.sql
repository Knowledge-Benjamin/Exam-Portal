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
--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "allow_file_upload" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "forced_submit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "submission_file_id" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "submission_file_name" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "submission_file_type" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "submission_file_size" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_oauth_refresh_token" text;--> statement-breakpoint
ALTER TABLE "exam_room_events" ADD CONSTRAINT "exam_room_events_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_room_events" ADD CONSTRAINT "exam_room_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_room_events_exam_id_idx" ON "exam_room_events" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "exam_room_events_submission_id_idx" ON "exam_room_events" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "exams_teacher_id_idx" ON "exams" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "exams_status_idx" ON "exams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "questions_exam_id_idx" ON "questions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "submissions_exam_id_idx" ON "submissions" USING btree ("exam_id");--> statement-breakpoint
CREATE INDEX "submissions_student_reg_number_idx" ON "submissions" USING btree ("student_reg_number");