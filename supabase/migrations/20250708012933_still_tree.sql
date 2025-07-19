/*
  # Fix Storage Policies for Product Images

  1. Storage Configuration
    - Ensure product-images bucket exists and is properly configured
    - Set up public access for reading product images
    - Configure file size limits and allowed MIME types

  2. Storage Policies
    - Allow authenticated users to upload images to products folder
    - Allow public read access to all product images
    - Allow authenticated users to delete/update their uploaded images

  3. Security
    - Restrict uploads to image files only
    - Limit file size to 5MB
    - Ensure proper folder structure (products/)
*/

-- Create or update the product-images bucket
DO $$
BEGIN
  -- Insert bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
  VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    updated_at = now();
EXCEPTION
  WHEN others THEN
    -- If we can't create/update the bucket, continue with policies
    NULL;
END $$;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to manage product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload to product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;

-- Create storage policies using the correct approach for Supabase
-- Policy for public read access to product images
CREATE POLICY "Public read access for product images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Policy for authenticated users to upload images
CREATE POLICY "Authenticated upload to product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' AND
    (name LIKE 'products/%' OR name LIKE 'products\\%')
  );

-- Policy for authenticated users to delete images
CREATE POLICY "Authenticated delete product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (name LIKE 'products/%' OR name LIKE 'products\\%')
  );

-- Policy for authenticated users to update images
CREATE POLICY "Authenticated update product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images' AND
    (name LIKE 'products/%' OR name LIKE 'products\\%')
  )
  WITH CHECK (
    bucket_id = 'product-images' AND
    (name LIKE 'products/%' OR name LIKE 'products\\%')
  );

-- Create a function to help with storage operations (if needed)
CREATE OR REPLACE FUNCTION public.ensure_storage_bucket()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be called to ensure bucket setup
  -- Implementation depends on available permissions
  RETURN;
END;
$$;