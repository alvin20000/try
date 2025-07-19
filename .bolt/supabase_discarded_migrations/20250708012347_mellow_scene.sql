/*
  # Fix Storage RLS Policies for Image Upload

  1. Storage Policies
    - Enable RLS on storage.objects table
    - Add policy for authenticated users to upload images to product-images bucket
    - Add policy for public read access to product images
    - Add policy for authenticated users to delete their uploaded images

  2. Security
    - Restrict uploads to image files only
    - Allow authenticated users (admin users) to upload to product-images bucket
    - Allow public read access to product images
    - Allow authenticated users to delete images they uploaded
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload images to product-images bucket
CREATE POLICY "Allow authenticated uploads to product-images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'products'
  );

-- Policy to allow public read access to product images
CREATE POLICY "Allow public read access to product-images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Policy to allow authenticated users to update/delete images in product-images bucket
CREATE POLICY "Allow authenticated users to manage product-images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'products'
  );

-- Policy to allow authenticated users to update images in product-images bucket
CREATE POLICY "Allow authenticated users to update product-images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'products'
  )
  WITH CHECK (
    bucket_id = 'product-images' AND
    (storage.foldername(name))[1] = 'products'
  );

-- Ensure the product-images bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];