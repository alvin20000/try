import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart data', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, quantity = 1, variant?: ProductVariant) => {
    setItems(prevItems => {
      // Create a unique key for the cart item based on product and variant
      const itemKey = variant ? `${product.id}-${variant.id}` : product.id;
      const existingItem = prevItems.find(item => {
        const existingKey = item.selectedVariant ? `${item.product.id}-${item.selectedVariant.id}` : item.product.id;
        return existingKey === itemKey;
      });
      
      if (existingItem) {
        return prevItems.map(item => {
          const existingKey = item.selectedVariant ? `${item.product.id}-${item.selectedVariant.id}` : item.product.id;
          return existingKey === itemKey
            ? { ...item, quantity: item.quantity + quantity }
            : item;
        });
      } else {
        return [...prevItems, { 
          product, 
          quantity,
          selectedVariant: variant,
          weight_kg: variant?.weight_kg
        }];
      }
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems(prevItems => prevItems.filter(item => {
      if (variantId) {
        return !(item.product.id === productId && item.selectedVariant?.id === variantId);
      }
      return item.product.id !== productId;
    }));
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    
    setItems(prevItems => 
      prevItems.map(item => {
        if (variantId) {
          return (item.product.id === productId && item.selectedVariant?.id === variantId)
            ? { ...item, quantity }
            : item;
        }
        return item.product.id === productId 
          ? { ...item, quantity }
          : item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  
  const totalPrice = items.reduce(
    (total, item) => {
      const price = item.selectedVariant ? item.selectedVariant.price : item.product.price;
      return total + price * item.quantity;
    }, 
    0
  );

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};