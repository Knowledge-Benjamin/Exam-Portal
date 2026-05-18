-- Add forced_submit column to track submissions forced by timer expiry
ALTER TABLE submissions ADD COLUMN forced_submit boolean NOT NULL DEFAULT false;

-- Index on exam_id and forced_submit for quick stats queries
CREATE INDEX idx_submissions_exam_forced ON submissions("exam_id", forced_submit);
