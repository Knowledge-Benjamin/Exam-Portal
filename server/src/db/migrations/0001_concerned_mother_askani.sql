ALTER TABLE "exam_enrollments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "exam_enrollments" CASCADE;--> statement-breakpoint
ALTER TABLE "submissions" DROP CONSTRAINT "submissions_student_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "student_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "student_reg_number" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_service_account_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_private_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_drive_folder_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seb_config_key" text;--> statement-breakpoint
ALTER TABLE "submissions" DROP COLUMN "student_id";