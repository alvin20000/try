/*
  # Fix Product Variants and Image Management System

  1. Product Variants Table
    - Support for 10kg, 25kg, 60kg weight options
    - Individual pricing for each variant (larger amounts for higher weights)
    - Stock management per variant
    - Fix foreign key constraint type mismatch

  2. Enhanced Product Images
    - Support for 4 images per product (1 main + 3 variant-specific)
    - Main image + weight-specific images (10kg, 25kg, 60kg)
    - Image ordering and categorization

  3. Cart and Order Updates
    - Support for variant-specific orders
    - Weight selection in cart
    - Variant tracking in order items
    - Stock visibility for customers

  4. Pricing Structure
    - Base price for main product
    - Variant-specific pricing (higher amounts for larger weights)
    - Bulk pricing support
*/

-- First, ensure products table has UUID id type
ALTER TABLE public.products 
ALTER COLUMN id TYPE UUID USING id::UUID;

-- Drop existing product_variants table if it exists to recreate with correct types
DROP TABLE IF EXISTS public.product_variants CASCADE;

-- Create product_variants table with correct UUID types
CREATE TABLE public.product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  weight_kg INTEGER NOT NULL CHECK (weight_kg IN (10, 25, 60)),
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0), -- Increased precision for larger amounts
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, weight_kg)
);

-- Drop existing product_images table if it exists to recreate with enhanced structure
DROP TABLE IF EXISTS public.product_images CASCADE;

-- Create enhanced product_images table
CREATE TABLE public.product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  weight_kg INTEGER CHECK (weight_kg IN (10, 25, 60)), -- NULL for main image, specific weight for variant images
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, weight_kg) -- Ensures one image per weight variant
);

-- Add indexes for better performance
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_weight ON public.product_variants(weight_kg);
CREATE INDEX idx_product_variants_active ON public.product_variants(is_active);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_weight ON public.product_images(weight_kg);
CREATE INDEX idx_product_images_primary ON public.product_images(is_primary);
CREATE INDEX idx_product_images_display_order ON public.product_images(display_order);

-- Update order_items table to support variants with correct UUID types
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- Create RLS policies for product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active product variants (for stock visibility)
CREATE POLICY "Public can view active product variants"
ON public.product_variants
FOR SELECT
TO public
USING (is_active = true);

-- Policy: Authenticated users can view all product variants
CREATE POLICY "Authenticated users can view product variants"
ON public.product_variants
FOR SELECT
TO authenticated
USING (true);

-- Policy: Admin users can manage product variants
CREATE POLICY "Admin users can manage product variants"
ON public.product_variants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id::text = auth.uid()::text 
    AND admin_users.is_active = true
  )
);

-- Create RLS policies for product_images
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view product images
CREATE POLICY "Public can view product images"
ON public.product_images
FOR SELECT
TO public
USING (true);

-- Policy: Admin users can manage product images
CREATE POLICY "Admin users can manage product images"
ON public.product_images
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id::text = auth.uid()::text 
    AND admin_users.is_active = true
  )
);

-- Create function to get product with variants and images (enhanced for stock visibility)
CREATE OR REPLACE FUNCTION public.get_product_with_variants_and_stock(product_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'product', row_to_json(p),
    'variants', COALESCE(variants.variants_data, '[]'::json),
    'images', COALESCE(images.images_data, '[]'::json),
    'stock_info', COALESCE(stock.stock_data, '{}'::json)
  ) INTO result
  FROM public.products p
  LEFT JOIN (
    SELECT 
      pv.product_id,
      json_agg(
        json_build_object(
          'id', pv.id,
          'weight_kg', pv.weight_kg,
          'price', pv.price,
          'stock_quantity', pv.stock_quantity,
          'is_active', pv.is_active,
          'in_stock', (pv.stock_quantity > 0),
          'stock_status', CASE 
            WHEN pv.stock_quantity = 0 THEN 'out_of_stock'
            WHEN pv.stock_quantity <= 5 THEN 'low_stock'
            ELSE 'in_stock'
          END
        ) ORDER BY pv.weight_kg
      ) as variants_data
    FROM public.product_variants pv
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ) variants ON variants.product_id = p.id
  LEFT JOIN (
    SELECT 
      pi.product_id,
      json_agg(
        json_build_object(
          'id', pi.id,
          'image_url', pi.image_url,
          'alt_text', pi.alt_text,
          'display_order', pi.display_order,
          'is_primary', pi.is_primary,
          'weight_kg', pi.weight_kg,
          'image_type', CASE 
            WHEN pi.weight_kg IS NULL THEN 'main'
            ELSE CONCAT(pi.weight_kg::text, 'kg')
          END
        ) ORDER BY pi.is_primary DESC, pi.weight_kg NULLS FIRST, pi.display_order
      ) as images_data
    FROM public.product_images pi
    GROUP BY pi.product_id
  ) images ON images.product_id = p.id
  LEFT JOIN (
    SELECT 
      pv.product_id,
      json_build_object(
        'total_stock', SUM(pv.stock_quantity),
        'variants_in_stock', COUNT(*) FILTER (WHERE pv.stock_quantity > 0),
        'total_variants', COUNT(*),
        'lowest_price', MIN(pv.price),
        'highest_price', MAX(pv.price)
      ) as stock_data
    FROM public.product_variants pv
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ) stock ON stock.product_id = p.id
  WHERE p.id = product_uuid;
  
  RETURN result;
END;
$$;

-- Create function to create product with variants and images (enhanced for 4-image system)
CREATE OR REPLACE FUNCTION public.create_product_with_variants_and_images(
  p_product_data JSONB,
  p_variants_data JSONB DEFAULT '[]'::jsonb,
  p_images_data JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_product_id UUID;
  variant JSONB;
  image JSONB;
  result JSON;
  main_image_url TEXT;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id::text = auth.uid()::text 
    AND admin_users.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Extract main image URL from images data
  SELECT image->>'image_url' INTO main_image_url
  FROM jsonb_array_elements(p_images_data) AS image
  WHERE (image->>'is_primary')::boolean = true
  LIMIT 1;

  -- If no primary image found, use the first image
  IF main_image_url IS NULL THEN
    SELECT image->>'image_url' INTO main_image_url
    FROM jsonb_array_elements(p_images_data) AS image
    LIMIT 1;
  END IF;

  -- Create product
  INSERT INTO public.products (
    name, description, price, category_id, tags, unit, 
    available, featured, image, bulk_pricing
  )
  VALUES (
    p_product_data->>'name',
    p_product_data->>'description',
    (p_product_data->>'price')::DECIMAL,
    (p_product_data->>'category_id')::UUID,
    COALESCE(p_product_data->'tags', '[]'::jsonb),
    COALESCE(p_product_data->>'unit', 'kg'),
    COALESCE((p_product_data->>'available')::BOOLEAN, true),
    COALESCE((p_product_data->>'featured')::BOOLEAN, false),
    COALESCE(main_image_url, p_product_data->>'image'),
    COALESCE(p_product_data->'bulk_pricing', '[]'::jsonb)
  )
  RETURNING id INTO new_product_id;

  -- Create variants (10kg, 25kg, 60kg with progressive pricing)
  FOR variant IN SELECT * FROM jsonb_array_elements(p_variants_data)
  LOOP
    INSERT INTO public.product_variants (
      product_id, weight_kg, price, stock_quantity, is_active
    )
    VALUES (
      new_product_id,
      (variant->>'weight_kg')::INTEGER,
      (variant->>'price')::DECIMAL,
      COALESCE((variant->>'stock_quantity')::INTEGER, 0),
      COALESCE((variant->>'is_active')::BOOLEAN, true)
    );
  END LOOP;

  -- Create images (1 main + 3 variant-specific)
  FOR image IN SELECT * FROM jsonb_array_elements(p_images_data)
  LOOP
    INSERT INTO public.product_images (
      product_id, image_url, alt_text, display_order, is_primary, weight_kg
    )
    VALUES (
      new_product_id,
      image->>'image_url',
      image->>'alt_text',
      COALESCE((image->>'display_order')::INTEGER, 0),
      COALESCE((image->>'is_primary')::BOOLEAN, false),
      CASE 
        WHEN image->>'weight_kg' IS NOT NULL AND image->>'weight_kg' != 'null' 
        THEN (image->>'weight_kg')::INTEGER
        ELSE NULL
      END
    );
  END LOOP;

  -- Return the created product with variants and images
  SELECT public.get_product_with_variants_and_stock(new_product_id) INTO result;
  RETURN result;
END;
$$;

-- Create function to update product with variants and images
CREATE OR REPLACE FUNCTION public.update_product_with_variants_and_images(
  p_product_id UUID,
  p_product_data JSONB,
  p_variants_data JSONB DEFAULT '[]'::jsonb,
  p_images_data JSONB DEFAULT '[]'::jsonb
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  variant JSONB;
  image JSONB;
  result JSON;
  main_image_url TEXT;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id::text = auth.uid()::text 
    AND admin_users.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Extract main image URL from images data
  SELECT image->>'image_url' INTO main_image_url
  FROM jsonb_array_elements(p_images_data) AS image
  WHERE (image->>'is_primary')::boolean = true
  LIMIT 1;

  -- Update product
  UPDATE public.products
  SET 
    name = COALESCE(p_product_data->>'name', name),
    description = COALESCE(p_product_data->>'description', description),
    price = COALESCE((p_product_data->>'price')::DECIMAL, price),
    category_id = COALESCE((p_product_data->>'category_id')::UUID, category_id),
    tags = COALESCE(p_product_data->'tags', tags),
    unit = COALESCE(p_product_data->>'unit', unit),
    available = COALESCE((p_product_data->>'available')::BOOLEAN, available),
    featured = COALESCE((p_product_data->>'featured')::BOOLEAN, featured),
    image = COALESCE(main_image_url, p_product_data->>'image', image),
    bulk_pricing = COALESCE(p_product_data->'bulk_pricing', bulk_pricing),
    updated_at = now()
  WHERE id = p_product_id;

  -- Delete existing variants and images if new data is provided
  IF p_variants_data != '[]'::jsonb THEN
    DELETE FROM public.product_variants WHERE product_id = p_product_id;
  END IF;

  IF p_images_data != '[]'::jsonb THEN
    DELETE FROM public.product_images WHERE product_id = p_product_id;
  END IF;

  -- Create new variants
  FOR variant IN SELECT * FROM jsonb_array_elements(p_variants_data)
  LOOP
    INSERT INTO public.product_variants (
      product_id, weight_kg, price, stock_quantity, is_active
    )
    VALUES (
      p_product_id,
      (variant->>'weight_kg')::INTEGER,
      (variant->>'price')::DECIMAL,
      COALESCE((variant->>'stock_quantity')::INTEGER, 0),
      COALESCE((variant->>'is_active')::BOOLEAN, true)
    );
  END LOOP;

  -- Create new images
  FOR image IN SELECT * FROM jsonb_array_elements(p_images_data)
  LOOP
    INSERT INTO public.product_images (
      product_id, image_url, alt_text, display_order, is_primary, weight_kg
    )
    VALUES (
      p_product_id,
      image->>'image_url',
      image->>'alt_text',
      COALESCE((image->>'display_order')::INTEGER, 0),
      COALESCE((image->>'is_primary')::BOOLEAN, false),
      CASE 
        WHEN image->>'weight_kg' IS NOT NULL AND image->>'weight_kg' != 'null' 
        THEN (image->>'weight_kg')::INTEGER
        ELSE NULL
      END
    );
  END LOOP;

  -- Return the updated product with variants and images
  SELECT public.get_product_with_variants_and_stock(p_product_id) INTO result;
  RETURN result;
END;
$$;

-- Create function to get all products with variants and stock for public view
CREATE OR REPLACE FUNCTION public.get_all_products_with_stock()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'description', p.description,
      'price', p.price,
      'image', p.image,
      'category_id', p.category_id,
      'tags', p.tags,
      'available', p.available,
      'featured', p.featured,
      'unit', p.unit,
      'variants', COALESCE(variants.variants_data, '[]'::json),
      'images', COALESCE(images.images_data, '[]'::json),
      'stock_summary', COALESCE(stock.stock_data, '{}'::json)
    )
  ) INTO result
  FROM public.products p
  LEFT JOIN (
    SELECT 
      pv.product_id,
      json_agg(
        json_build_object(
          'id', pv.id,
          'weight_kg', pv.weight_kg,
          'price', pv.price,
          'stock_quantity', pv.stock_quantity,
          'is_active', pv.is_active,
          'in_stock', (pv.stock_quantity > 0)
        ) ORDER BY pv.weight_kg
      ) as variants_data
    FROM public.product_variants pv
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ) variants ON variants.product_id = p.id
  LEFT JOIN (
    SELECT 
      pi.product_id,
      json_agg(
        json_build_object(
          'id', pi.id,
          'image_url', pi.image_url,
          'alt_text', pi.alt_text,
          'is_primary', pi.is_primary,
          'weight_kg', pi.weight_kg
        ) ORDER BY pi.is_primary DESC, pi.weight_kg NULLS FIRST
      ) as images_data
    FROM public.product_images pi
    GROUP BY pi.product_id
  ) images ON images.product_id = p.id
  LEFT JOIN (
    SELECT 
      pv.product_id,
      json_build_object(
        'total_stock', SUM(pv.stock_quantity),
        'has_stock', (SUM(pv.stock_quantity) > 0),
        'price_range', json_build_object(
          'min', MIN(pv.price),
          'max', MAX(pv.price)
        )
      ) as stock_data
    FROM public.product_variants pv
    WHERE pv.is_active = true
    GROUP BY pv.product_id
  ) stock ON stock.product_id = p.id
  WHERE p.available = true
  ORDER BY p.featured DESC, p.created_at DESC;
  
  RETURN result;
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER update_product_variants_updated_at 
  BEFORE UPDATE ON public.product_variants 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create sample data function for testing (optional)
CREATE OR REPLACE FUNCTION public.create_sample_product_with_variants()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sample_category_id UUID;
  result JSON;
BEGIN
  -- Get a category ID (create one if none exists)
  SELECT id INTO sample_category_id FROM public.categories LIMIT 1;
  
  IF sample_category_id IS NULL THEN
    INSERT INTO public.categories (id, name, description, is_active)
    VALUES (gen_random_uuid(), 'Sample Category', 'Sample category for testing', true)
    RETURNING id INTO sample_category_id;
  END IF;

  -- Create sample product with variants
  SELECT public.create_product_with_variants_and_images(
    jsonb_build_object(
      'name', 'Premium Rice',
      'description', 'High-quality rice available in multiple sizes',
      'price', 15000,
      'category_id', sample_category_id,
      'tags', '["premium", "rice", "bulk"]',
      'unit', 'kg',
      'available', true,
      'featured', true
    ),
    jsonb_build_array(
      jsonb_build_object('weight_kg', 10, 'price', 15000, 'stock_quantity', 50),
      jsonb_build_object('weight_kg', 25, 'price', 35000, 'stock_quantity', 30),
      jsonb_build_object('weight_kg', 60, 'price', 80000, 'stock_quantity', 20)
    ),
    jsonb_build_array(
      jsonb_build_object('image_url', '/images/rice-main.jpg', 'is_primary', true, 'alt_text', 'Premium Rice Main'),
      jsonb_build_object('image_url', '/images/rice-10kg.jpg', 'weight_kg', 10, 'alt_text', 'Premium Rice 10kg'),
      jsonb_build_object('image_url', '/images/rice-25kg.jpg', 'weight_kg', 25, 'alt_text', 'Premium Rice 25kg'),
      jsonb_build_object('image_url', '/images/rice-60kg.jpg', 'weight_kg', 60, 'alt_text', 'Premium Rice 60kg')
    )
  ) INTO result;
  
  RETURN result;
END;
$$;