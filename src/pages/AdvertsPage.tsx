import React, { useRef } from 'react';
import { Megaphone, ChevronLeft, ChevronRight, Flame, Crown, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../hooks/useDatabase';
import ProductCard from '../components/common/ProductCard';
import { useCart } from '../context/CartContext';
import Banner from '../components/adverts/Banner';

const AdvertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { products } = useProducts();
  const { addItem } = useCart();
  const sliderRef = useRef<HTMLDivElement>(null);

  // Sort products so featured are first
  const sortedProducts = [...products].sort((a, b) => (b.featured === true ? 1 : 0) - (a.featured === true ? 1 : 0));

  // Featured product images for the slider
  const featuredProductImages = sortedProducts.filter((p) => p.featured && p.image).map((p) => ({
    id: p.id,
    title: p.name,
    description: p.description,
    image: p.image,
    active: true,
    position: 'banner',
  }));

  // Trending products: use featured or top 8
  const trendingProducts = sortedProducts.filter((p) => p.featured).slice(0, 8);
  const quickOrderProducts = sortedProducts.slice(0, 12);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 400;
      const currentScroll = sliderRef.current.scrollLeft;
      const newScroll = direction === 'left'
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;
      sliderRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth',
      });
    }
  };

  const handleOrder = (product: any) => {
    addItem(product, 1);
    navigate('/cart');
  };

  return (
    <div className="pb-20 md:pb-0 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-primary/20 rounded-2xl">
            <Megaphone className="text-primary" size={32} />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Trending & Quick Orders
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Discover trending products and place quick orders with ease.
        </p>
      </div>

      {/* Modern Featured Products Image Slider */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Flame className="text-orange-500" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Products</h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-4 ml-14">Our top picks, just for you.</p>
        <Banner adverts={featuredProductImages} />
      </div>

      {/* Quick Order Products Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <Megaphone className="text-green-500" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quick Order</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {quickOrderProducts.map((product) => (
            <ProductCard key={product.id} product={product} onOrder={() => handleOrder(product)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvertsPage; 