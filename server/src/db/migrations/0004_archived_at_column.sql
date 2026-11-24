ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "erp_course_code" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "assessment_type" varchar(50) DEFAULT 'final_exam' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "weight_percentage" numeric(5, 2) DEFAULT '60.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "seb_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;