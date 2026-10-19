-- Migration 0010: Add assessment type and weight percentage to exams table
-- Allows distinguishing between Coursework / Continuous Assessment (e.g. 40%)
-- and Final Examinations (e.g. 60%) in a non-rigid, configurable manner.
ALTER TABLE exams ADD COLUMN IF NOT EXISTS assessment_type varchar(50) NOT NULL DEFAULT 'final_exam';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS weight_percentage numeric(5,2) NOT NULL DEFAULT 60.00;
