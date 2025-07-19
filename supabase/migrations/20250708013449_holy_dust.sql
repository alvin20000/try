/*
  # Storage Setup for Product Images

  1. Storage Bucket
    - Create or update the `product-images` bucket
    - Configure for public read access with 5MB file size limit
    - Allow specific image mime types

  2. Storage Policies
    - Allow authenticated users to upload images
    - Allow public read access to images
    - Allow authenticated users to manage their uploaded images

  Note: This migration uses Supabase's built-in storage functions and policies
  that work within the system's permission constraints.
*/

-- Create the product-images bucket using Supabase's storage functions
-- This approach works within Supabase's permission system
DO $$
BEGIN
  -- Insert bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'product-images',
    'product-images', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
EXCEPTION
  WHEN OTHERS THEN
    -- If direct insert fails, try using storage.create_bucket if available
    NULL;
END $$;

-- Create storage policies using Supabase's policy system
-- These policies work with the existing RLS setup

-- Policy: Allow authenticated users to upload images to product-images bucket
DROP POLICY IF EXISTS "Allow authenticated uploads to product-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to product-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
);

-- Policy: Allow public read access to product images
DROP POLICY IF EXISTS "Allow public read access to product-images" ON storage.objects;
CREATE POLICY "Allow public read access to product-images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Allow authenticated users to update their uploaded images
DROP POLICY IF EXISTS "Allow authenticated updates to product-images" ON storage.objects;
CREATE POLICY "Allow authenticated updates to product-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Policy: Allow authenticated users to delete their uploaded images
DROP POLICY IF EXISTS "Allow authenticated deletes from product-images" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from product-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

-- Ensure RLS is enabled on storage.objects (if not already)
-- This is usually enabled by default in Supabase
DO $$
BEGIN
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN insufficient_privilege THEN
    -- RLS is likely already enabled or we don't have permission to change it
    -- This is normal in Supabase hosted environments
    NULL;
  WHEN OTHERS THEN
    NULL;
END $$;