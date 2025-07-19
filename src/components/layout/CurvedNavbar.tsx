import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Tag, HelpCircle, ShoppingCart, Megaphone } from 'lucide-react';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive }) => (
  <NavLink
    to={to}
    className="flex flex-col items-center justify-center flex-1"
  >
    <div
      className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 mb-1
        ${isActive ? 'bg-primary/90 shadow-lg text-white scale-110' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-primary/10 hover:text-primary'}
      `}
    >
      {icon}
    </div>
    <span
      className={`text-[11px] font-medium transition-colors duration-300
        ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}
      `}
    >
      {label}
    </span>
  </NavLink>
);

const CurvedNavbar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: <Home size={24} />, label: 'Home' },
    { to: '/adverts', icon: <Megaphone size={24} />, label: 'Adverts' },
    { to: '/promotions', icon: <Tag size={24} />, label: 'Promotions' },
    { to: '/cart', icon: <ShoppingCart size={24} />, label: 'Cart' },
    { to: '/help', icon: <HelpCircle size={24} />, label: 'Help' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl px-2 py-1 flex w-full justify-around items-center h-18 backdrop-blur-md">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
      </div>
    </div>
  );
};

export default CurvedNavbar;