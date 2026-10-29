ALTER TABLE "exams" ADD COLUMN "erp_course_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "assessment_type" varchar(50) DEFAULT 'final_exam' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "weight_percentage" numeric(5, 2) DEFAULT '60.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "seb_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "exams" ADD COLUMN "archived_at" timestamp with time zone;