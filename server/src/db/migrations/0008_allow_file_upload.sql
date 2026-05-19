-- Add allow_file_upload flag to exams table
ALTER TABLE exams ADD COLUMN allow_file_upload boolean NOT NULL DEFAULT false;
