import React from 'react';
import ProductCard from '../common/ProductCard';
import { Product, ProductVariant } from '../../types';

interface ProductGridProps {
  products: Product[];
  title?: string;
  emptyMessage?: string;
  onOrder?: (product: Product, variant?: ProductVariant) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  title, 
  emptyMessage = "No products found",
  onOrder 
}) => {
  return (
    <div className="w-full">
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          {title}
        </h2>
      )}
      
      {products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onOrder={(variant) => onOrder?.(product, variant)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGrid;