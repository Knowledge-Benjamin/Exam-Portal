-- Migration 0009: Add SEB settings JSONB column to exams table
-- Stores per-exam Safe Exam Browser configuration: allowed processes,
-- display policy, spell-check, etc.
ALTER TABLE exams ADD COLUMN seb_settings jsonb NOT NULL DEFAULT '{}';
