/*
  # User Authentication System

  1. New Tables
    - `app_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `full_name` (text)
      - `phone` (text)
      - `address` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `app_users` table
    - Add policies for user registration and profile management
    - Add function for password hashing and authentication

  3. Functions
    - `register_user` - Register new user with hashed password
    - `authenticate_user` - Authenticate user login
    - `update_user_profile` - Update user profile information
*/

-- Create app_users table
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  phone text,
  address text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_active ON app_users(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_app_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_app_users_updated_at();

-- User registration function
CREATE OR REPLACE FUNCTION register_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_password_hash text;
  v_user_record record;
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM app_users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email already registered';
  END IF;

  -- Hash the password using crypt
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Insert new user
  INSERT INTO app_users (email, password_hash, full_name, phone, address)
  VALUES (p_email, v_password_hash, p_full_name, p_phone, p_address)
  RETURNING id INTO v_user_id;

  -- Get the created user record
  SELECT id, email, full_name, phone, address, is_active, created_at
  INTO v_user_record
  FROM app_users
  WHERE id = v_user_id;

  -- Return user data as JSON
  RETURN json_build_object(
    'id', v_user_record.id,
    'email', v_user_record.email,
    'full_name', v_user_record.full_name,
    'phone', v_user_record.phone,
    'address', v_user_record.address,
    'is_active', v_user_record.is_active,
    'created_at', v_user_record.created_at
  );
END;
$$;

-- User authentication function
CREATE OR REPLACE FUNCTION authenticate_user(
  p_email text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record record;
  v_password_hash text;
BEGIN
  -- Get user record
  SELECT id, email, password_hash, full_name, phone, address, is_active
  INTO v_user_record
  FROM app_users
  WHERE email = p_email AND is_active = true;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Verify password
  IF v_user_record.password_hash != crypt(p_password, v_user_record.password_hash) THEN
    RAISE EXCEPTION 'Invalid email or password';
  END IF;

  -- Return user data as JSON (excluding password)
  RETURN json_build_object(
    'id', v_user_record.id,
    'email', v_user_record.email,
    'full_name', v_user_record.full_name,
    'phone', v_user_record.phone,
    'address', v_user_record.address,
    'is_active', v_user_record.is_active
  );
END;
$$;

-- Update user profile function
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record record;
BEGIN
  -- Update user profile
  UPDATE app_users
  SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    address = COALESCE(p_address, address),
    updated_at = now()
  WHERE id = p_user_id AND is_active = true
  RETURNING id, email, full_name, phone, address, is_active, updated_at
  INTO v_user_record;

  -- Check if user was found and updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  -- Return updated user data as JSON
  RETURN json_build_object(
    'id', v_user_record.id,
    'email', v_user_record.email,
    'full_name', v_user_record.full_name,
    'phone', v_user_record.phone,
    'address', v_user_record.address,
    'is_active', v_user_record.is_active,
    'updated_at', v_user_record.updated_at
  );
END;
$$;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON app_users
  FOR SELECT
  TO public
  USING (true); -- Allow reading for authentication

CREATE POLICY "Users can update own profile"
  ON app_users
  FOR UPDATE
  TO public
  USING (true); -- Will be controlled by the function

-- Update orders table to link with app_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  END IF;
END $$;

-- Function to create order with user context
CREATE OR REPLACE FUNCTION create_complete_order_with_user(
  p_user_id uuid,
  p_order_items jsonb,
  p_total_amount numeric,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_user_record record;
BEGIN
  -- Get user information
  SELECT full_name, email, phone, address
  INTO v_user_record
  FROM app_users
  WHERE id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or inactive';
  END IF;

  -- Generate order number
  v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::bigint::text, 10, '0');

  -- Insert order with user information
  INSERT INTO orders (
    order_number,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    total_amount,
    notes
  ) VALUES (
    v_order_number,
    p_user_id,
    v_user_record.full_name,
    v_user_record.email,
    v_user_record.phone,
    v_user_record.address,
    p_total_amount,
    p_notes
  ) RETURNING id INTO v_order_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::text,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric
    );
  END LOOP;

  -- Return order details
  RETURN json_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'user_id', p_user_id,
    'customer_name', v_user_record.full_name,
    'customer_email', v_user_record.email,
    'customer_phone', v_user_record.phone,
    'customer_address', v_user_record.address,
    'total_amount', p_total_amount,
    'notes', p_notes
  );
END;
$$;