-- Run this in the Supabase SQL Editor
-- Adds: per-project free-form 'brain dump' field below Kernidee.
--       Used for quick capturing of fleeting thoughts that aren't worth a proper note yet.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS brain_dump TEXT;
