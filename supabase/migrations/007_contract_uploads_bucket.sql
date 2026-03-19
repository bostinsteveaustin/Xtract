-- Migration 007: Supabase Storage bucket for temporary contract file uploads
-- Files are uploaded from the browser, downloaded server-side for PDF parsing,
-- then immediately deleted after processing. Avoids the Vercel 4.5MB function
-- payload limit when uploading large PDFs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contract-uploads',
  'contract-uploads',
  false,       -- private: never publicly readable
  52428800,    -- 50 MB per file
  ARRAY['application/pdf', 'text/plain', 'text/markdown', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to the bucket
CREATE POLICY "Authenticated users can upload contract files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contract-uploads');

-- Authenticated users can read files (needed for signed URL generation)
CREATE POLICY "Authenticated users can read contract files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contract-uploads');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete contract files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contract-uploads');
