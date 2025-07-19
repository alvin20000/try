import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are properly configured
const isConfigured = supabaseUrl && supabaseAnonKey && 
  !supabaseUrl.includes('your-project-ref') && 
  !supabaseAnonKey.includes('your-anon-key')

if (!isConfigured) {
  console.warn('Supabase environment variables are not properly configured. Using placeholder client.')
  console.warn('Please click "Connect to Supabase" button to set up your project.')
}

// Create client with fallback values to prevent errors
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
)

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => isConfigured

// Database types
export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          username: string
          email: string
          password_hash: string
          full_name: string
          role: 'admin' | 'super_admin' | 'manager'
          avatar_url: string | null
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          password_hash: string
          full_name: string
          role?: 'admin' | 'super_admin' | 'manager'
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          password_hash?: string
          full_name?: string
          role?: 'admin' | 'super_admin' | 'manager'
          avatar_url?: string | null
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          image: string
          category_id: string
          tags: string[]
          available: boolean
          featured: boolean
          rating: number | null
          unit: string
          bulk_pricing: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description: string
          price: number
          image: string
          category_id: string
          tags?: string[]
          available?: boolean
          featured?: boolean
          rating?: number | null
          unit?: string
          bulk_pricing?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          image?: string
          category_id?: string
          tags?: string[]
          available?: boolean
          featured?: boolean
          rating?: number | null
          unit?: string
          bulk_pricing?: any
          created_at?: string
          updated_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          alt_text: string | null
          display_order: number
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          alt_text?: string | null
          display_order?: number
          is_primary?: boolean
          created_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          product_id: string
          quantity: number
          reserved_quantity: number
          reorder_level: number
          max_stock_level: number | null
          location: string | null
          last_updated: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          reserved_quantity?: number
          reorder_level?: number
          max_stock_level?: number | null
          location?: string | null
          last_updated?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          reorder_level?: number
          max_stock_level?: number | null
          location?: string | null
          last_updated?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          customer_address: string | null
          total_amount: number
          status: string
          payment_status: string
          payment_method: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          total_amount: number
          status?: string
          payment_status?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          customer_address?: string | null
          total_amount?: number
          status?: string
          payment_status?: string
          payment_method?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string
        }
      }
      business_analytics: {
        Row: {
          id: string
          date: string
          total_revenue: number
          total_orders: number
          total_customers: number
          top_selling_products: any
          category_performance: any
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          total_revenue?: number
          total_orders?: number
          total_customers?: number
          top_selling_products?: any
          category_performance?: any
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          total_revenue?: number
          total_orders?: number
          total_customers?: number
          top_selling_products?: any
          category_performance?: any
          created_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: any
          description: string | null
          category: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: any
          description?: string | null
          category?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: any
          description?: string | null
          category?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Enhanced image upload helper with proper error handling and validation
export const uploadImage = async (file: File, bucket: string = 'product-images'): Promise<string> => {
  if (!isConfigured) {
    throw new Error('Supabase is not configured. Please connect to Supabase first.')
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a valid image file (JPEG, PNG, WebP, or GIF).')
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload an image smaller than 5MB.')
  }

  try {
    console.log('Uploading image:', file.name, 'Size:', file.size, 'Type:', file.type)

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `products/${fileName}`

    // Check for admin authentication and Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    const isAdminAuthenticated = localStorage.getItem('admin_authenticated') === 'true'
    
    if (!session && isAdminAuthenticated) {
      console.log('No Supabase session found for admin user, attempting upload anyway')
      // For admin users, we'll try the upload even without a session
      // The storage policies should be configured to allow this
    } else if (!session && !isAdminAuthenticated) {
      throw new Error('Authentication required for image upload. Please log in.')
    }

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      // If it's a policy violation and user is admin, try alternative approaches
      if ((uploadError.message.includes('policy') || uploadError.message.includes('Unauthorized')) && isAdminAuthenticated) {
        console.log('Retrying upload with upsert enabled...')
        const { error: retryError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          })
        
        if (retryError) {
          // If still failing, provide admin-specific error message
          throw new Error(`Storage upload failed. Please ensure the 'product-images' bucket exists and has proper RLS policies configured for authenticated users. Error: ${retryError.message}`)
        }
      } else {
        if (uploadError.message.includes('policy') || uploadError.message.includes('Unauthorized')) {
          throw new Error(`Storage access denied. Please ensure you are properly authenticated and the storage bucket has correct RLS policies. Error: ${uploadError.message}`)
        } else {
          throw new Error(`Failed to upload image: ${uploadError.message}`)
        }
      }
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    console.log('Image uploaded successfully:', data.publicUrl)
    return data.publicUrl
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
}

// Delete image helper
export const deleteImage = async (url: string, bucket: string = 'product-images'): Promise<void> => {
  if (!isConfigured) {
    throw new Error('Supabase is not configured. Please connect to Supabase first.')
  }

  try {
    // Extract file path from URL
    const urlParts = url.split('/')
    const bucketIndex = urlParts.findIndex(part => part === 'object')
    if (bucketIndex === -1) return

    // Extract the path after /object/bucket-name/
    const pathStartIndex = bucketIndex + 2 // Skip 'object' and bucket name
    const filePath = urlParts.slice(pathStartIndex).join('/')
    if (!filePath) return

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      throw error
    }

    console.log('Image deleted successfully:', filePath)
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (url: string, width?: number, height?: number, quality?: number): string => {
  if (!url || !isConfigured) return url

  try {
    const urlObj = new URL(url)
    const params = new URLSearchParams()
    
    if (width) params.set('width', width.toString())
    if (height) params.set('height', height.toString())
    if (quality) params.set('quality', quality.toString())
    
    if (params.toString()) {
      urlObj.search = params.toString()
    }
    
    return urlObj.toString()
  } catch {
    return url
  }
}

// Helper function to construct product image URL from the new bucket structure
export const getProductImageUrl = (imagePath: string): string => {
  if (!imagePath || !isConfigured) return '/images/placeholder.jpg'
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) {
    return imagePath
  }
  
  // If it's a relative path, construct the full URL
  if (imagePath.startsWith('/')) {
    return imagePath
  }
  
  // If it's just a filename or path, construct the bucket URL
  try {
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(`products/${imagePath}`)
    
    return data.publicUrl
  } catch (error) {
    console.error('Error constructing product image URL:', error)
    return '/images/placeholder.jpg'
  }
}

// Helper function to get the bucket URL for a product image
export const getBucketImageUrl = (imagePath: string, bucket: string = 'product-images'): string => {
  if (!imagePath || !isConfigured) return '/images/placeholder.jpg'
  
  // If it's already a full URL, return it
  if (imagePath.startsWith('http')) {
    return imagePath
  }
  
  // If it's a relative path, construct the full URL
  if (imagePath.startsWith('/')) {
    return imagePath
  }
  
  try {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(imagePath)
    
    return data.publicUrl
  } catch (error) {
    console.error('Error constructing bucket image URL:', error)
    return '/images/placeholder.jpg'
  }
}

// Storage bucket management
export const ensureStorageBucket = async (bucketName: string = 'product-images') => {
  if (!isConfigured) {
    throw new Error('Supabase is not configured. Please connect to Supabase first.')
  }

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return false
    }

    const bucketExists = buckets?.some(bucket => bucket.name === bucketName)
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (createError) {
        console.error('Error creating bucket:', createError)
        return false
      }

      console.log(`Storage bucket '${bucketName}' created successfully`)
    }

    return true
  } catch (error) {
    console.error('Error ensuring storage bucket:', error)
    return false
  }
}