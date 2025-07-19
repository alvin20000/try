import React, { useState } from 'react';
import { Plus, Trash2, Package, DollarSign, Hash } from 'lucide-react';
import { ProductVariant } from '../../types';

interface ProductVariantsManagerProps {
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  className?: string;
  disabled?: boolean;
}

const ProductVariantsManager: React.FC<ProductVariantsManagerProps> = ({
  variants,
  onVariantsChange,
  className = '',
  disabled = false
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVariant, setNewVariant] = useState({
    weight_kg: 10,
    price: 0,
    stock_quantity: 0,
    is_active: true
  });

  const weightOptions = [10, 25, 50];
  const existingWeights = variants.map(v => v.weight_kg);
  const availableWeights = weightOptions.filter(w => !existingWeights.includes(w));

  const handleAddVariant = () => {
    if (newVariant.weight_kg <= 0 || newVariant.price <= 0) {
      alert('Please enter valid weight and price values');
      return;
    }

    const variant: ProductVariant = {
      id: crypto.randomUUID(), // Temporary ID, will be replaced by database
      weight_kg: newVariant.weight_kg,
      price: newVariant.price,
      stock_quantity: newVariant.stock_quantity,
      is_active: newVariant.is_active
    };

    const updatedVariants = [...variants, variant];
    onVariantsChange(updatedVariants);
    
    setNewVariant({
      weight_kg: availableWeights[0] || 10,
      price: 0,
      stock_quantity: 0,
      is_active: true
    });
    setShowAddForm(false);
  };

  const handleUpdateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    const updatedVariants = variants.map(variant => 
      variant.id === id ? { ...variant, [field]: value } : variant
    );
    onVariantsChange(updatedVariants);
  };

  const handleRemoveVariant = (id: string) => {
    const updatedVariants = variants.filter(variant => variant.id !== id);
    onVariantsChange(updatedVariants);
  };

  const handleToggleVariant = (id: string) => {
    const updatedVariants = variants.map(variant => 
      variant.id === id ? { ...variant, is_active: !variant.is_active } : variant
    );
    onVariantsChange(updatedVariants);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Product Variants
        </h3>
        {availableWeights.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={disabled}
            className="flex items-center space-x-2 bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Variant</span>
          </button>
        )}
      </div>

      {/* Add Variant Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Add New Variant
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Weight (kg)
              </label>
              <select
                value={newVariant.weight_kg}
                onChange={(e) => setNewVariant({ ...newVariant, weight_kg: parseInt(e.target.value) })}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {availableWeights.map(weight => (
                  <option key={weight} value={weight}>{weight}kg</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Price (UGX)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newVariant.price}
                onChange={(e) => setNewVariant({ ...newVariant, price: parseFloat(e.target.value) || 0 })}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={newVariant.stock_quantity}
                onChange={(e) => setNewVariant({ ...newVariant, stock_quantity: parseInt(e.target.value) || 0 })}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                placeholder="0"
              />
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleAddVariant}
                disabled={disabled || newVariant.price <= 0}
                className="flex-1 bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 text-sm"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                disabled={disabled}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variants List */}
      {variants.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No variants added yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Add weight variants (10kg, 25kg, 50kg) with different pricing
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((variant) => (
            <div
              key={variant.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                variant.is_active
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 opacity-75'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-orange-500" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {variant.weight_kg}kg
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    UGX {variant.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {variant.stock_quantity} in stock
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={variant.is_active}
                    onChange={() => handleToggleVariant(variant.id)}
                    disabled={disabled}
                    className="rounded border-gray-300 text-orange-600 shadow-sm focus:border-orange-300 focus:ring focus:ring-orange-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Active</span>
                </label>
                <button
                  onClick={() => handleRemoveVariant(variant.id)}
                  disabled={disabled}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                  title="Remove variant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Package className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Variant Management:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Create variants for different weight options (10kg, 25kg, 50kg)</li>
              <li>Set individual pricing for each weight variant</li>
              <li>Manage stock quantities per variant</li>
              <li>Toggle variants active/inactive as needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductVariantsManager; 