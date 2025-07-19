import React, { useState, useEffect } from 'react';
import { PROMOTIONS } from '../mocks/data';
import PromotionCard from '../components/promotions/PromotionCard';
import { ShoppingBag, Clock, Tag, Filter, Star, ArrowRight, Percent, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useDatabase';
import { Link } from 'react-router-dom';

const PromotionsPage: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { products } = useProducts();

  const filteredPromotions = activeFilter
    ? PROMOTIONS.filter(promo => promo.applicable === activeFilter)
    : PROMOTIONS;

  const getDaysRemaining = (endDate: string) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start <= now && now <= end;
  };

  const handleShopNow = (promo: any) => {
    let product: any = null;
    if (promo.applicable === 'product' && promo.applicableId) {
      product = products.find((p) => p.id === promo.applicableId);
    } else if (promo.applicable === 'category' && promo.applicableId) {
      product = products.find((p) => p.category === promo.applicableId);
    } else if (promo.applicable === 'all' || !promo.applicable) {
      product = products[0]; // fallback: just pick the first product
    }
    if (product) {
      addItem(product, 1);
      navigate('/cart');
    }
  };

  const eventImages = [
    '/promotions/trending_1.jpg',
    '/promotions/trending_2.jpg',
    '/promotions/trending_5.jpg',
  ];
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEventIdx((prev) => (prev === eventImages.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [eventImages.length]);

  return (
    <div className="pb-20 md:pb-0">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 dark:from-primary/10 dark:via-secondary/5 dark:to-accent/10 rounded-3xl p-8 md:p-12 mb-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="p-3 bg-primary/20 rounded-2xl">
              <Percent className="text-primary" size={32} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
              Special Offers
            </h1>
          </div>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-8">
            Discover amazing deals and exclusive discounts on your favorite food items
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Star className="text-yellow-500" size={16} />
              <span>Premium Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="text-green-500" size={16} />
              <span>Limited Time</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="text-blue-500" size={16} />
              <span>Best Prices</span>
            </div>
          </div>
        </div>
      </div>

      {/* M-A Events Section - Modern UI */}
      <div className="mb-8 rounded-3xl overflow-hidden shadow-lg bg-[#ff7a1a] flex flex-col md:flex-row items-center md:items-stretch p-8 md:p-12 relative">
        {/* Left: Logo, Text, and Button */}
        <div className="w-full md:w-1/2 z-10 flex flex-col items-start justify-center">
          <div className="flex items-center gap-4 mb-4">
            <img src="/promotions/logo.png" alt="M-A Events" className="w-40 h-28 object-contain" />
          </div>
          <h2 className="text-white text-2xl md:text-4xl font-extrabold mb-2">Your Event, Our Passion</h2>
          <p className="text-white/90 text-lg md:text-xl mb-6 max-w-xl">Specializing in event decorations and outside catering for all occasions. Make your moments unforgettable with M-A Events.</p>
          <a
            href="https://maevents.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-white text-[#ff7a1a] font-bold rounded-xl text-lg shadow hover:bg-orange-100 transition mb-6"
          >
            Visit M-A Events
          </a>
        </div>
        {/* Right: Modern, minimal slider - one image at a time, border radius, compact */}
        <div className="w-full md:w-1/3 flex justify-center items-center mt-4 md:mt-0 md:ml-8">
          <div className="w-full h-56 md:w-[600px] md:h-72 bg-white/80 shadow-md flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src={eventImages[currentEventIdx]}
              alt={`Event ${currentEventIdx + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <Filter className="text-gray-600 dark:text-gray-300" size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filter Promotions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { key: null, label: 'All Promotions', icon: '🎯' },
            { key: 'all', label: 'All Products', icon: '🛍️' },
            { key: 'category', label: 'Category Specific', icon: '📂' },
            { key: 'product', label: 'Product Specific', icon: '🎁' }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                activeFilter === filter.key
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span>{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Promotions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPromotions.map(promo => (
          <PromotionCard key={promo.id} promotion={promo} onShopNow={handleShopNow} />
        ))}
      </div>

      {/* Empty State */}
      {filteredPromotions.length === 0 && (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Tag className="text-gray-400" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Promotions Found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            No promotions match your selected filter. Try selecting a different category.
          </p>
          <button
            onClick={() => setActiveFilter(null)}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-semibold hover:bg-primary/90 transition-colors"
          >
            View All Promotions
          </button>
        </div>
      )}
    </div>
  );
};

export default PromotionsPage;