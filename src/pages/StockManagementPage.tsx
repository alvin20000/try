import React, { useState } from 'react';
import { useAdminProducts } from '../hooks/useDatabase';
import { AlertTriangle, CheckCircle, Plus, Minus } from 'lucide-react';
import { ensureAllProductsHaveInventory } from '../services/database';

const StockManagementPage: React.FC = () => {
  const { products, loading, error, updateProduct } = useAdminProducts();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStockChange = async (product: any, delta: number) => {
    if (!product.inventory || !product.inventory[0]) {
      setMessage({ type: 'error', text: 'No inventory record found for this product.' });
      return;
    }
    const current = product.inventory[0].quantity || 0;
    const newQty = current + delta;
    if (newQty < 0) {
      setMessage({ type: 'error', text: 'Stock cannot be negative.' });
      return;
    }
    setUpdatingId(product.id);
    try {
      await updateProduct(product.id, {
        ...product,
        inventory: [{ ...product.inventory[0], quantity: newQty }],
      });
      setMessage({ type: 'success', text: `Stock updated to ${newQty}.` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update stock.' });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-2"
        onClick={async () => {
          try {
            const count = await ensureAllProductsHaveInventory();
            setMessage({ type: 'success', text: count === 0 ? 'All products already have inventory records.' : `Created ${count} missing inventory records.` });
          } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to create inventory records.' });
          }
        }}
      >
        Create Missing Inventory Records
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Stock Management</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Manage your product stock input and output below.</p>
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
          <button className="ml-auto text-xs underline" onClick={() => setMessage(null)}>Dismiss</button>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {loading ? (
              <tr><td colSpan={3} className="text-center py-8">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={3} className="text-center py-8 text-red-600">{error}</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8">No products found.</td></tr>
            ) : (
              products.map(product => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                    <img src={product.image || '/images/placeholder.jpg'} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                    <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-white font-semibold">
                    {product.inventory && product.inventory[0] ? product.inventory[0].quantity : 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStockChange(product, 1)}
                        className="p-2 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition disabled:opacity-50"
                        disabled={updatingId === product.id}
                        title="Add Stock"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={() => handleStockChange(product, -1)}
                        className="p-2 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition disabled:opacity-50"
                        disabled={updatingId === product.id}
                        title="Remove Stock"
                      >
                        <Minus size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockManagementPage; 