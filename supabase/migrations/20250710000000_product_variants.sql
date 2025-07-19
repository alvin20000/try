/*
  # Product Variants and Multiple Images Support

  1. Product Variants Table
    - Support for different weight options (10kg, 25kg, 50kg)
    - Individual pricing for each variant
    - Stock management per variant

  2. Enhanced Product Images
    - Support for multiple images per product
    - Main image + weight-specific images
    - Image ordering and categorization

  3. Cart and Order Updates
    - Support for variant-specific orders
    - Weight selection in cart
    - Variant tracking in order items
*/

-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  weight_kg INTEGER NOT NULL CHECK (weight_kg > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, weight_kg)
);

-- Create product_images table (if not exists)
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  weight_kg INTEGER, -- NULL for main product image, specific weight for variant images
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, weight_kg, display_order)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_weight ON public.product_variants(weight_kg);
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_weight ON public.product_images(weight_kg);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON public.product_images(display_order);

-- Update order_items table to support variants
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- Create RLS policies for product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active product variants
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
    WHERE admin_users.id = auth.uid() 
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
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  )
);

-- Create function to get product with variants and images
CREATE OR REPLACE FUNCTION public.get_product_with_variants(product_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'product', p,
    'variants', COALESCE(variants.variants_data, '[]'::json),
    'images', COALESCE(images.images_data, '[]'::json)
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
          'is_active', pv.is_active
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
          'weight_kg', pi.weight_kg
        ) ORDER BY pi.display_order, pi.weight_kg NULLS FIRST
      ) as images_data
    FROM public.product_images pi
    GROUP BY pi.product_id
  ) images ON images.product_id = p.id
  WHERE p.id = product_uuid;
  
  RETURN result;
END;
$$;

-- Create function to create product with variants and images
CREATE OR REPLACE FUNCTION public.create_product_with_variants(
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
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
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
    p_product_data->>'category_id',
    COALESCE(p_product_data->'tags', '[]'::jsonb),
    COALESCE(p_product_data->>'unit', 'kg'),
    COALESCE((p_product_data->>'available')::BOOLEAN, true),
    COALESCE((p_product_data->>'featured')::BOOLEAN, false),
    p_product_data->>'image',
    COALESCE(p_product_data->'bulk_pricing', '[]'::jsonb)
  )
  RETURNING id INTO new_product_id;

  -- Create variants
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

  -- Create images
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
        WHEN image->>'weight_kg' IS NOT NULL THEN (image->>'weight_kg')::INTEGER
        ELSE NULL
      END
    );
  END LOOP;

  -- Return the created product with variants and images
  SELECT public.get_product_with_variants(new_product_id) INTO result;
  RETURN result;
END;
$$;

-- Create function to update product with variants and images
CREATE OR REPLACE FUNCTION public.update_product_with_variants(
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
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.id = auth.uid() 
    AND admin_users.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update product
  UPDATE public.products
  SET 
    name = COALESCE(p_product_data->>'name', name),
    description = COALESCE(p_product_data->>'description', description),
    price = COALESCE((p_product_data->>'price')::DECIMAL, price),
    category_id = COALESCE(p_product_data->>'category_id', category_id),
    tags = COALESCE(p_product_data->'tags', tags),
    unit = COALESCE(p_product_data->>'unit', unit),
    available = COALESCE((p_product_data->>'available')::BOOLEAN, available),
    featured = COALESCE((p_product_data->>'featured')::BOOLEAN, featured),
    image = COALESCE(p_product_data->>'image', image),
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
        WHEN image->>'weight_kg' IS NOT NULL THEN (image->>'weight_kg')::INTEGER
        ELSE NULL
      END
    );
  END LOOP;

  -- Return the updated product with variants and images
  SELECT public.get_product_with_variants(p_product_id) INTO result;
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

CREATE TRIGGER update_product_variants_updated_at 
  BEFORE UPDATE ON public.product_variants 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 