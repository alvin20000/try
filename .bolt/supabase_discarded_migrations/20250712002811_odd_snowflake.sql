/*
  # Enhanced Order Management Functions

  1. Functions
    - `create_complete_order_with_user` - Create order with authenticated user context
    - Enhanced order tracking and user association

  2. Security
    - Maintains existing RLS policies
    - Adds user context for better order management
*/

-- Function to create order with authenticated user context
CREATE OR REPLACE FUNCTION create_complete_order_with_user(
  p_user_id uuid,
  p_customer_phone text,
  p_customer_address text,
  p_order_items jsonb,
  p_total_amount numeric,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_result jsonb;
BEGIN
  -- Generate order ID and number
  v_order_id := gen_random_uuid();
  v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::text, 10, '0');
  
  -- Get user details for the order
  DECLARE
    v_user_name text;
    v_user_email text;
  BEGIN
    SELECT full_name, email INTO v_user_name, v_user_email
    FROM app_users 
    WHERE id = p_user_id AND is_active = true;
    
    IF v_user_name IS NULL THEN
      RAISE EXCEPTION 'User not found or inactive';
    END IF;
  END;
  
  -- Insert the order with user context
  INSERT INTO orders (
    id,
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    customer_address,
    total_amount,
    status,
    payment_status,
    notes,
    user_id,
    created_at,
    updated_at
  ) VALUES (
    v_order_id,
    v_order_number,
    v_user_name,
    v_user_email,
    p_customer_phone,
    p_customer_address,
    p_total_amount,
    'pending',
    'pending',
    p_notes,
    p_user_id,
    NOW(),
    NOW()
  );
  
  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    INSERT INTO order_items (
      id,
      order_id,
      product_id,
      quantity,
      unit_price,
      total_price,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_order_id,
      (v_item->>'product_id')::text,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price')::numeric,
      (v_item->>'total_price')::numeric,
      NOW()
    );
  END LOOP;
  
  -- Return order details
  v_result := jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'customer_name', v_user_name,
    'customer_email', v_user_email,
    'customer_phone', p_customer_phone,
    'customer_address', p_customer_address,
    'total_amount', p_total_amount,
    'status', 'pending',
    'payment_status', 'pending',
    'notes', p_notes,
    'user_id', p_user_id,
    'created_at', NOW()
  );
  
  RETURN v_result;
END;
$$;