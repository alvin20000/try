import React, { useState } from 'react';
import { Star, ShoppingBag, Package, ChevronDown } from 'lucide-react';
import { Product, ProductVariant } from '../../types';
import { getProductImageUrl } from '../../lib/supabase';

interface ProductCardProps {
  product: Product;
  onOrder?: (variant?: ProductVariant) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onOrder }) => {
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>(product.image);

  const hasVariants = product.variants && product.variants.length > 0;
  const mainImage = product.images?.find(img => img.is_primary)?.image_url || product.image;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;

  const displayRating = () => {
    if (!product.rating) return null;
    
    return (
      <div className="flex items-center mt-1">
        <Star
          size={14}
          className="text-yellow-400 fill-yellow-400 mr-1"
        />
        <span className="text-xs sm:text-sm">{product.rating.toFixed(1)}</span>
      </div>
    );
  };

  const handleOrder = () => {
    if (hasVariants && !selectedVariant) {
      setShowVariants(true);
      return;
    }
    onOrder?.(selectedVariant || undefined);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setShowVariants(false);
    
    // Update image based on selected variant
    const variantImage = product.images?.find(img => img.weight_kg === variant.weight_kg);
    if (variantImage) {
      setSelectedImage(variantImage.image_url);
    }
  };

  const getStockStatus = (variant: ProductVariant) => {
    if (variant.stock_quantity === 0) return { status: 'out_of_stock', text: 'Out of Stock', color: 'text-red-600' };
    if (variant.stock_quantity <= 5) return { status: 'low_stock', text: `Only ${variant.stock_quantity} left`, color: 'text-yellow-600' };
    return { status: 'in_stock', text: `${variant.stock_quantity} in stock`, color: 'text-green-600' };
  };
  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg transform hover:-translate-y-1">
      {/* Square aspect ratio image container */}
      <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
        <img
          src={getProductImageUrl(selectedImage)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.featured && (
          <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
            Featured
          </div>
        )}
        {hasVariants && (
          <div className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
            3 Sizes Available
          </div>
        )}
      </div>
      
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-tight">
              {product.description}
            </p>
          </div>
        </div>
        
        {/* Variant Selection */}
        {hasVariants && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Weight:</span>
              <button
                onClick={() => setShowVariants(!showVariants)}
                className="flex items-center space-x-1 text-xs sm:text-sm text-primary hover:text-primary/80"
              >
                <span>{selectedVariant ? `${selectedVariant.weight_kg}kg` : 'Choose weight'}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showVariants ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {showVariants && (
              <div className="space-y-1 mb-2">
                {product.variants?.map((variant) => (
                  const stockStatus = getStockStatus(variant);
                  <button
                    key={variant.id}
                    onClick={() => handleVariantSelect(variant)}
                    disabled={!variant.is_active || variant.stock_quantity <= 0}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-left transition-colors text-xs sm:text-sm ${
                      selectedVariant?.id === variant.id
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } ${
                      !variant.is_active || variant.stock_quantity <= 0
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <Package className="w-3 h-3 text-gray-500" />
                      <span className="font-medium">{variant.weight_kg}kg</span>
                    </div>
                    <div className="text-right">
                        <div className={`text-xs ${stockStatus.color}`}>
                          {stockStatus.text}
                        {variant.stock_quantity > 0 ? `${variant.stock_quantity} in stock` : 'Out of stock'}
                      </div>
                    </div>
                  );
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Stock Information for Selected Variant */}
        {selectedVariant && (
          <div className="mb-2">
            {(() => {
              const stockStatus = getStockStatus(selectedVariant);
              return (
                <div className={`text-xs ${stockStatus.color} flex items-center gap-1`}>
                  <Package className="w-3 h-3" />
                  <span>{stockStatus.text}</span>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex justify-between items-center mb-2">
          <div className="flex-1">
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
              UGX {displayPrice?.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-1">
              /{selectedVariant ? `${selectedVariant.weight_kg}kg` : product.unit}
            </span>
          </div>
          {displayRating()}
        </div>
        
        {/* Tags - Show only on larger mobile screens and up */}
        <div className="mb-3 hidden sm:block">
          {product.tags.slice(0, 2).map((tag) => (
            <span 
              key={tag} 
              className="inline-block mr-1 mb-1 text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>

        <button
          onClick={handleOrder}
          disabled={!product.available || (hasVariants && (!selectedVariant || selectedVariant.stock_quantity <= 0))}
          className={`w-full flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg transition-colors text-sm sm:text-base font-medium ${
            product.available && (!hasVariants || (selectedVariant && selectedVariant.stock_quantity > 0))
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingBag size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span>
            {!product.available 
              ? 'Out of Stock' 
              : hasVariants && !selectedVariant
                ? 'Select Weight'
              : hasVariants && selectedVariant && selectedVariant.stock_quantity <= 0
                ? 'Out of Stock'
                : 'Order Now'
            }
          </span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;