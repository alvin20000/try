import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Database } from '../lib/supabase'

type Tables = Database['public']['Tables']
type Product = Tables['products']['Row']
type Category = Tables['categories']['Row']
type ProductImage = Tables['product_images']['Row']
type Inventory = Tables['inventory']['Row']
type AdminUser = Tables['admin_users']['Row']
type Order = Tables['orders']['Row']
type OrderItem = Tables['order_items']['Row']
type BusinessAnalytics = Tables['business_analytics']['Row']

// Helper function to get current admin ID from localStorage
const getCurrentAdminId = (): string | null => {
  try {
    const adminUser = localStorage.getItem('admin_user')
    if (adminUser) {
      const admin = JSON.parse(adminUser)
      return admin.id || null
    }
  } catch (error) {
    console.error('Error getting admin ID from localStorage:', error)
  }
  return null
}

// Enhanced event dispatching for real-time sync
const dispatchProductEvent = (eventType: string, data: any) => {
  console.log(`🔄 Dispatching ${eventType} event:`, data)
  
  // Dispatch multiple events to ensure all listeners catch the change
  window.dispatchEvent(new CustomEvent(eventType, { detail: data }))
  window.dispatchEvent(new CustomEvent('productChanged', { detail: { type: eventType, data } }))
  window.dispatchEvent(new CustomEvent('forceProductRefresh'))
  
  // Also trigger a general refresh event
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('refreshProducts'))
  }, 100)
}

// Admin Authentication with enhanced error handling and debugging
export const adminAuthService = {
  async signIn(username: string, password: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      console.log('🔐 Attempting admin authentication for username:', username)
      
      // Try the main authentication function
      const { data, error } = await supabase
        .rpc('authenticate_admin_enhanced', { 
          p_username: username, 
          p_password: password 
        })

      if (error) {
        console.error('❌ Authentication RPC error:', error)
        
        // Try alternative function names
        console.log('🔄 Trying alternative authentication function...')
        const { data: altData, error: altError } = await supabase
          .rpc('authenticate_admin', { 
            p_username: username, 
            p_password: password 
          })
        
        if (altError) {
          console.error('❌ Alternative authentication error:', altError)
          throw new Error(`Authentication failed: ${error.message || 'Invalid credentials'}`)
        }
        
        if (!altData) {
          throw new Error('Authentication failed: No data returned')
        }
        
        console.log('✅ Alternative authentication successful')
        const admin = typeof altData === 'string' ? JSON.parse(altData) : altData
        
        // Establish Supabase auth session for storage operations
        await this.establishSupabaseSession(admin)
        
        return { user: null, admin }
      }

      if (!data) {
        throw new Error('Authentication failed: No data returned')
      }

      // Parse the JSON response if it's a string
      const admin = typeof data === 'string' ? JSON.parse(data) : data
      console.log('✅ Admin authenticated successfully:', admin.username)

      // Establish Supabase auth session for storage operations
      await this.establishSupabaseSession(admin)
      return { user: null, admin }
    } catch (error) {
      console.error('❌ Sign in error:', error)
      throw error
    }
  },

  async establishSupabaseSession(admin: any) {
    try {
      // Create a temporary auth session using the admin's email
      // This is needed for storage operations that require authenticated users
      const tempPassword = `temp_${admin.id}_${Date.now()}`
      
      // First, try to sign up the admin user in Supabase auth if they don't exist
      const { error: signUpError } = await supabase.auth.signUp({
        email: admin.email,
        password: tempPassword,
        options: {
          data: {
            admin_id: admin.id,
            username: admin.username,
            full_name: admin.full_name,
            role: admin.role
          }
        }
      })
      
      // If signup fails because user exists, that's fine
      if (signUpError && !signUpError.message.includes('already registered')) {
        console.warn('Admin signup warning:', signUpError.message)
      }
      
      // Now sign in with the admin's email and temp password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: admin.email,
        password: tempPassword
      })
      
      if (signInError) {
        // If sign in fails, try to update the password and sign in again
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(admin.email)
        if (!resetError) {
          console.log('Password reset sent for admin auth session')
        }
        
        // For now, we'll continue without the auth session
        // Storage operations will need to be handled differently
        console.warn('Could not establish Supabase auth session:', signInError.message)
      } else {
        console.log('✅ Supabase auth session established for admin')
      }
    } catch (error) {
      console.warn('Warning: Could not establish Supabase auth session:', error)
      // Continue without auth session - storage operations may fail
    }
  },
  async signOut() {
    try {
      // Clear localStorage
      localStorage.removeItem('admin_user')
      localStorage.removeItem('admin_authenticated')
      localStorage.removeItem('admin_session_id')
      
      // Sign out from Supabase auth
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('Supabase signout error:', error)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  },

  async getCurrentAdmin() {
    try {
      // Check localStorage first
      const savedAdmin = localStorage.getItem('admin_user')
      const isAuthenticated = localStorage.getItem('admin_authenticated')
      const sessionId = localStorage.getItem('admin_session_id')
      
      if (savedAdmin && isAuthenticated === 'true' && sessionId) {
        const admin = JSON.parse(savedAdmin)
        
        // Verify session is still valid (optional - could add server-side verification)
        const sessionAge = Date.now() - parseInt(sessionId)
        const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
        
        if (sessionAge < maxSessionAge) {
          return admin
        } else {
          // Session expired, clear it
          this.signOut()
        }
      }
      return null
    } catch (error) {
      console.error('Get current admin error:', error)
      return null
    }
  }
}

// Enhanced Supabase client with admin context
const getAuthenticatedClient = async () => {
  // For admin operations, we need to ensure proper authentication
  const adminUser = localStorage.getItem('admin_user')
  const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true'
  
  if (isAdminAuthenticated) {
    // For admin operations, we can use the existing client
    // The storage policies should allow authenticated users to upload
    try {
      // Check if we have a session, if not, create one for admin operations
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && adminUser) {
        // For admin operations without auth session, we'll rely on the RLS policies
        console.log('Admin user authenticated via localStorage, proceeding with storage operations')
      }
    } catch (error) {
      console.warn('Session check failed:', error)
    }
  }
  
  return supabase
}

// Product services with enhanced error handling and validation
export const productService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          )
        `)
        .eq('available', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
        throw new Error(`Failed to fetch products: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching products:', error)
      throw error
    }
  },

  async getAllForAdmin() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching admin products:', error)
        throw new Error(`Failed to fetch products: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching admin products:', error)
      throw error
    }
  },

  async getById(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const { data, error } = await supabase.rpc('get_product_with_variants', {
        product_uuid: id
      })

      if (error) {
        console.error('Error fetching product:', error)
        throw new Error(`Failed to fetch product: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Error fetching product:', error)
      throw error
    }
  },

  async create(product: Tables['products']['Insert'], variants: any[] = [], images: any[] = []) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const adminId = getCurrentAdminId()
      if (!adminId) {
        throw new Error('Admin authentication required - please log in again')
      }

      const client = await getAuthenticatedClient()
      console.log('🚀 Creating product with variants and images:', product, variants, images)
      console.log('Using admin ID:', adminId)
      if (!product.name || !product.description || !product.price || !product.category_id) {
        throw new Error('Missing required fields: name, description, price, and category are required')
      }
      
      // Use the new function for product creation with variants and images
      const { data, error } = await client.rpc('create_product_with_variants', {
        p_product_data: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category_id: product.category_id,
          tags: product.tags || [],
          unit: product.unit || 'kg',
          available: product.available !== false,
          featured: product.featured === true,
          image: product.image || (images.length > 0 ? images.find(img => img.is_primary)?.image_url || images[0].image_url : '/images/placeholder.jpg')
        },
        p_variants_data: variants,
        p_images_data: images
      })
      if (error) {
        console.error('Product creation error:', error)
        throw new Error(`Failed to create product: ${error.message}`)
      }
      console.log('✅ Product created successfully:', data)
      dispatchProductEvent('productCreated', { 
        id: data.product.id, 
        product: data,
        timestamp: new Date().toISOString()
      })
      return data
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  },

  async update(id: string, updates: Tables['products']['Update'], images: string[] = []) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }
    try {
      const adminId = getCurrentAdminId()
      if (!adminId) {
        throw new Error('Admin authentication required - please log in again')
      }
      const client = await getAuthenticatedClient()
      console.log('📝 Updating product with images:', id, updates, images)
      console.log('Using admin ID:', adminId)
      // Use the correct function for product update with images
      const { data, error } = await client.rpc('update_product_with_images', {
        p_product_id: id,
        p_product_data: {
          name: updates.name,
          description: updates.description,
          price: updates.price,
          category_id: updates.category_id,
          tags: Array.isArray(updates.tags)
            ? updates.tags
            : (typeof updates.tags === 'string' && updates.tags.trim() !== ''
                ? updates.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : []),
          unit: updates.unit,
          available: updates.available,
          featured: updates.featured,
          image: (updates as any).image
        },
        p_images: images
      })
      if (error) {
        console.error('Product update error:', error)
        throw new Error(`Failed to update product: ${error.message}`)
      }
      console.log('✅ Product updated successfully:', data)
      dispatchProductEvent('productUpdated', { 
        id, 
        updates, 
        data,
        timestamp: new Date().toISOString()
      })
      return data
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  },

  async delete(id: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      const { error } = await client
        .from('products')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Product deletion error:', error)
        throw new Error(`Failed to delete product: ${error.message}`)
      }
      
      // Enhanced event dispatching for real-time sync
      dispatchProductEvent('productDeleted', { 
        id,
        timestamp: new Date().toISOString()
      })
      
      return true
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  }
}

// Category services
export const categoryService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching categories:', error)
      throw error
    }
  },

  async getAllForAdmin() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) {
        console.error('Error fetching admin categories:', error)
        throw new Error(`Failed to fetch categories: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching admin categories:', error)
      throw error
    }
  }
}

// Product Images services
export const productImageService = {
  async add(productId: string, imageUrl: string, altText?: string, isPrimary = false) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      // If this is primary, unset other primary images
      if (isPrimary) {
        await client
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId)
      }

      const { data, error } = await client
        .from('product_images')
        .insert({
          product_id: productId,
          image_url: imageUrl,
          alt_text: altText,
          is_primary: isPrimary
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding product image:', error)
        throw new Error(`Failed to add product image: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Error adding product image:', error)
      throw error
    }
  }
}

// Inventory services
export const inventoryService = {
  async getByProductId(productId: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('inventory')
        .select('*')
        .eq('product_id', productId)
        .single()

      if (error) {
        console.error('Error fetching inventory:', error)
        throw new Error(`Failed to fetch inventory: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Error fetching inventory:', error)
      throw error
    }
  },

  async update(productId: string, updates: Tables['inventory']['Update']) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('inventory')
        .update(updates)
        .eq('product_id', productId)
        .select()
        .single()

      if (error) {
        console.error('Error updating inventory:', error)
        throw new Error(`Failed to update inventory: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Error updating inventory:', error)
      throw error
    }
  },

  async getLowStock(threshold?: number) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      let query = client
        .from('inventory')
        .select(`
          *,
          products (
            id,
            name
          )
        `)

      if (threshold) {
        query = query.lt('quantity', threshold)
      } else {
        query = query.lt('quantity', 10) // Default threshold
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching low stock items:', error)
        throw new Error(`Failed to fetch low stock items: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching low stock items:', error)
      return []
    }
  }
}

// Order services
export const orderService = {
  async getAll() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products (
              id,
              name,
              image
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        throw new Error(`Failed to fetch orders: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  },

  async getRecent(limit = 10) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent orders:', error)
        throw new Error(`Failed to fetch recent orders: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching recent orders:', error)
      return []
    }
  },

  async updateStatus(orderId: string, status: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      const { data, error } = await client
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()

      if (error) {
        console.error('Error updating order status:', error)
        throw new Error(`Failed to update order status: ${error.message}`)
      }
      
      return data
    } catch (error) {
      console.error('Error updating order status:', error)
      throw error
    }
  }
}

// Analytics services
export const analyticsService = {
  async getDashboardStats() {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      
      // Get basic stats
      const { count: totalProducts } = await client
        .from('products')
        .select('*', { count: 'exact', head: true })

      const { count: activeProducts } = await client
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('available', true)

      // Get low stock items
      const lowStockItems = await inventoryService.getLowStock(10)

      // Get recent orders
      const recentOrders = await orderService.getRecent(5)

      // Get order analytics
      const { data: orderAnalytics } = await client.rpc('get_order_analytics')

      return {
        today: orderAnalytics || { total_revenue: 0, total_orders: 0, total_customers: 0 },
        monthly: [],
        totalProducts: totalProducts || 0,
        activeProducts: activeProducts || 0,
        lowStockItems,
        recentOrders
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      return {
        today: { total_revenue: 0, total_orders: 0, total_customers: 0 },
        monthly: [],
        totalProducts: 0,
        activeProducts: 0,
        lowStockItems: [],
        recentOrders: []
      }
    }
  },

  async getBusinessAnalytics(startDate?: string, endDate?: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please connect to Supabase first.')
    }

    try {
      const client = await getAuthenticatedClient()
      let query = client
        .from('business_analytics')
        .select('*')
        .order('date', { ascending: false })

      if (startDate) {
        query = query.gte('date', startDate)
      }
      if (endDate) {
        query = query.lte('date', endDate)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching business analytics:', error)
        throw new Error(`Failed to fetch business analytics: ${error.message}`)
      }
      
      return data || []
    } catch (error) {
      console.error('Error fetching business analytics:', error)
      return []
    }
  }
}

// Enhanced real-time sync utilities
export const syncService = {
  // Subscribe to product changes for real-time updates
  subscribeToProductChanges(callback: (payload: any) => void) {
    if (!isSupabaseConfigured()) {
      console.warn('Real-time sync not available without Supabase configuration')
      return () => {}
    }

    const subscription = supabase
      .channel('products_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'products' }, 
        callback
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  },

  // Enhanced manual refresh across all components
  triggerProductRefresh() {
    console.log('🔄 Triggering manual product refresh across all components')
    
    // Dispatch multiple events to ensure all listeners catch the change
    dispatchProductEvent('refreshProducts', { timestamp: new Date().toISOString() })
    dispatchProductEvent('forceProductRefresh', { timestamp: new Date().toISOString() })
    
    // Also trigger a delayed refresh to ensure all components have time to update
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('delayedProductRefresh'))
    }, 500)
  }
}

export const ensureAllProductsHaveInventory = async () => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please connect to Supabase first.')
  }
  const client = await getAuthenticatedClient();
  // Get all products
  const { data: products, error: prodError } = await client
    .from('products')
    .select('id');
  if (prodError) throw new Error('Failed to fetch products: ' + prodError.message);
  // Get all inventory records
  const { data: inventory, error: invError } = await client
    .from('inventory')
    .select('product_id');
  if (invError) throw new Error('Failed to fetch inventory: ' + invError.message);
  const inventoryProductIds = new Set((inventory || []).map((inv: any) => inv.product_id));
  const missing = (products || []).filter((p: any) => !inventoryProductIds.has(p.id));
  if (missing.length === 0) return 0;
  // Insert missing inventory records with quantity 0
  const { error: insertError } = await client
    .from('inventory')
    .insert(missing.map((p: any) => ({ product_id: p.id, quantity: 0 })));
  if (insertError) throw new Error('Failed to create missing inventory records: ' + insertError.message);
  return missing.length;
}

// Export configuration status
export const getSupabaseStatus = () => ({
  configured: isSupabaseConfigured(),
  url: import.meta.env.VITE_SUPABASE_URL,
  hasKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
})