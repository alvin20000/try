import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
      {/* Logo centered above the loader */}
      <img src="/logo.png" alt="Logo" className="w-36 h-36 mb-12 animate-bounce-slow" />
      {/* Modern One UI 8 style circular rotating three dots with orange gradient */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center animate-orbit">
          {/* Dots positioned on a smaller circle, close to the logo */}
          <span className="absolute w-3.5 h-3.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-full" style={{ top: '14%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          <span className="absolute w-3.5 h-3.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-full" style={{ top: '68%', left: '80%', transform: 'translate(-50%, -50%)' }} />
          <span className="absolute w-3.5 h-3.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-full" style={{ top: '68%', left: '20%', transform: 'translate(-50%, -50%)' }} />
        </div>
      </div>
      <style>{`
        @keyframes orbit {
          100% { transform: rotate(360deg); }
        }
        .animate-orbit {
          animation: orbit 3s linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce 2.5s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
