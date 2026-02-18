-- ANIMA Supabase Setup SQL
-- Run this in Supabase SQL Editor after creating your project

-- Create the main database table for storing all ANIMA data
CREATE TABLE IF NOT EXISTS anima_db (
  id TEXT PRIMARY KEY DEFAULT 'main',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create storage bucket for audio files (WAV, MIDI, ZIP, JSON)
INSERT INTO storage.buckets (id, name, public)
VALUES ('anima-assets', 'anima-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to assets
CREATE POLICY IF NOT EXISTS "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'anima-assets');

-- Allow public upload access (for ANIMA to save files)
CREATE POLICY IF NOT EXISTS "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'anima-assets');

-- Allow updates (for overwriting files)
CREATE POLICY IF NOT EXISTS "Public Update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'anima-assets');

-- Allow deletes (for cleanup)
CREATE POLICY IF NOT EXISTS "Public Delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'anima-assets');
