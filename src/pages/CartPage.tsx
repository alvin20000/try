import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { ShoppingBag, User, Phone, Mail, MapPin, MessageSquare, Loader2, Minus, Plus, Trash2, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CartPage: React.FC = () => {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    phone: '',
    address: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatModernWhatsAppMessage = (orderNumber: string) => {
    const header = `🛍️ *NEW FOOD ORDER PLACED* 🛍️\n\n`;
    
    const orderInfo = `📋 *Order Details*\n` +
                     `🔢 Order #: *${orderNumber}*\n` +
                     `📅 Date: ${new Date().toLocaleDateString('en-US', { 
                       weekday: 'long', 
                       year: 'numeric', 
                       month: 'long', 
                       day: 'numeric' 
                     })}\n` +
                     `⏰ Time: ${new Date().toLocaleTimeString('en-US', { 
                       hour: '2-digit', 
                       minute: '2-digit' 
                     })}\n\n`;

    const customerDetails = `👤 *Customer Information*\n` +
                           `📱 Phone: ${customerInfo.phone}\n` +
                           `🏠 Address: ${customerInfo.address}\n\n`;

    const itemsHeader = `🛒 *Ordered Items*\n`;
    const itemsList = items.map((item, index) => {
      const itemTotal = item.product.price * item.quantity;
      return `\n*${index + 1}. ${item.product.name}*\n` +
             `   📦 Quantity: ${item.quantity} ${item.product.unit}\n` +
             `   💰 Unit Price: UGX ${item.product.price.toLocaleString()}\n` +
             `   💵 Subtotal: UGX ${itemTotal.toLocaleString()}\n` +
             `   🏷️ Tags: ${item.product.tags.join(', ')}\n`;
    }).join('');

    const summary = `\n💰 *Order Summary*\n` +
                   `📊 Total Items: ${items.length}\n` +
                   `🧮 Total Quantity: ${items.reduce((sum, item) => sum + item.quantity, 0)} units\n` +
                   `💵 *Total Amount: UGX ${totalPrice.toLocaleString()}*\n\n`;


    const footer = `✅ *Order Status: PENDING*\n` +
                  `🚚 Delivery will be arranged after confirmation\n` +
                  `💳 Payment: Cash on Delivery\n\n` +
                  `Thank you for choosing M.A Online Store! 🙏\n` +
                  `We'll contact you shortly to confirm your order.`;

    return header + orderInfo + customerDetails + itemsHeader + itemsList + summary + footer;
  };

  const validateForm = () => {
    if (!customerInfo.phone.trim()) {
      alert('Please enter your phone number');
      return false;
    }
    if (!customerInfo.address.trim()) {
      alert('Please enter your delivery address');
      return false;
    }
    return true;
  };

  const handleOrder = async () => {
    if (items.length === 0) return;
    
    if (!validateForm()) return;

    setIsProcessing(true);

    try {
      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.product.price * item.quantity
      }));

      const { data, error } = await supabase.rpc('create_complete_order', {
        p_customer_name: 'Customer', // Default name since we removed the field
        p_order_items: orderItems,
        p_total_amount: totalPrice,
        p_customer_email: null, // Removed email field
        p_customer_phone: customerInfo.phone || null,
        p_customer_address: customerInfo.address || null,
        p_notes: null // Removed notes field
      });

      if (error) {
        throw new Error(`Failed to create order: ${error.message}`);
      }

      console.log('Order created:', data);

      const message = formatModernWhatsAppMessage(data.order_number);
      const encodedMessage = encodeURIComponent(message);
      
      window.open(`https://wa.me/256741068782?text=${encodedMessage}`, '_blank');
      
      clearCart();
      
      alert(`Order ${data.order_number} placed successfully! You'll be redirected to WhatsApp to complete your order.`);
      
      navigate('/');
      
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // You can use reverse geocoding here to get the address
          handleInputChange('address', `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please enter your address manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center pb-20 md:pb-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12">
          <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add some products to your cart to get started!
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 pb-20 md:pb-4">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">Complete Your Order</h1>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Cart Items */}
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Order Items</h2>
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full sm:w-20 h-48 sm:h-20 object-cover rounded-lg"
                />
                <div className="flex-1 w-full">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {product.tags.map(tag => (
                      <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-primary font-bold mb-3">
                    UGX {product.price.toLocaleString()} / {product.unit}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(product.id, quantity - 1)}
                          className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(product.id, quantity + 1)}
                          className="p-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => removeItem(product.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 dark:text-white">
                          UGX {(product.price * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Information & Order Summary */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
            <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
              <User size={24} className="text-primary" />
              Customer Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <Phone size={16} />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                  placeholder="+256 XXX XXX XXX"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin size={16} />
                  Delivery Location
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors mb-2"
                  >
                    <Navigation size={16} />
                    Use Current Location
                  </button>
                  <div className="w-full h-56 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d255281.19034036464!2d32.290275!3d0.347596!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x177dbd52f25e5555%3A0x614b8c4d8b7c0c0c!2sKampala%2C%20Uganda!5e0!3m2!1sen!2sus!4v1642000000000!5m2!1sen!2sus"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Click on the map to select your exact delivery location</p>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Delivery Address (Optional)</label>
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700"
                    placeholder="Enter additional address details"
                  />
                  <div className="mt-2 flex items-center gap-2 text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg px-3 py-2 text-sm">
                    <Navigation size={16} />
                    Free Delivery in Kampala
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Quantity:</span>
                <span className="font-medium">{items.reduce((sum, item) => sum + item.quantity, 0)} units</span>
              </div>
              <div className="flex justify-between text-lg md:text-xl font-bold">
                <span>Total Amount:</span>
                <span>UGX {totalPrice.toLocaleString()}</span>
              </div>
            </div>
            
            <button
              onClick={handleOrder}
              disabled={isProcessing}
              className="w-full mt-6 bg-primary text-white py-3 md:py-4 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base md:text-lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Processing Order...
                </>
              ) : (
                <>
                  <ShoppingBag size={24} />
                  Submit Order
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Your order will be saved and you'll be redirected to WhatsApp to complete the process
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;