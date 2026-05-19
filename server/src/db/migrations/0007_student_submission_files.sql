-- Add fields for student-uploaded submission files
ALTER TABLE submissions ADD COLUMN submission_file_id text;
ALTER TABLE submissions ADD COLUMN submission_file_name text;
ALTER TABLE submissions ADD COLUMN submission_file_type text;
ALTER TABLE submissions ADD COLUMN submission_file_size integer;
