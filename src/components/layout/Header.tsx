import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Sun, Moon, ShoppingBag } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';

const Header: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();
  const { totalItems } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-6 py-2 rounded-full transition-all duration-200 ${
      isActive
        ? 'bg-primary text-white shadow'
        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }`;

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-white dark:bg-gray-900 shadow-md py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="M-A General Stores" 
              className="h-10 md:h-14 w-auto"
            />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-primary">M.A Online Store</h1>
            </div>
          </NavLink>

          <nav className="hidden md:flex items-center space-x-4">
            <NavLink to="/" className={navLinkClass}>Home</NavLink>
            <NavLink to="/adverts" className={navLinkClass}>Adverts</NavLink>
            <NavLink to="/promotions" className={navLinkClass}>Promotions</NavLink>
            <NavLink to="/help" className={navLinkClass}>Help</NavLink>
          </nav>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="group relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/60 bg-gray-100 dark:bg-gray-800 hover:bg-primary/90 hover:text-white active:scale-95 shadow-sm"
              aria-label="Toggle theme"
            >
              <span className="flex items-center justify-center">
                {isDark ? <Sun size={22} /> : <Moon size={22} />}
              </span>
            </button>

            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/60
                ${isActive ? 'bg-primary/90 text-white shadow-lg scale-105' : 'bg-gray-100 dark:bg-gray-800 hover:bg-primary/90 hover:text-white active:scale-95 shadow-sm'}`
              }
              aria-label="Shopping cart"
            >
              <ShoppingBag size={22} />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </NavLink>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;