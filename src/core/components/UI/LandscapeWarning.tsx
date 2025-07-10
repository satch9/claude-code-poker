import React from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export const LandscapeWarning: React.FC = () => {
  const { isMobile, isPortrait } = useBreakpoint();

  // Afficher le warning seulement sur mobile en mode portrait
  if (!isMobile || !isPortrait) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-2xl">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-poker-green-500 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white transform rotate-90" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Tournez votre appareil
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Pour une expérience optimale, veuillez utiliser votre appareil en mode paysage
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-12 bg-gray-300 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <svg className="w-6 h-6 text-poker-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="w-12 h-8 bg-poker-green-500 rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          Le poker nécessite plus d'espace horizontal pour afficher tous les éléments de jeu
        </div>
      </div>
    </div>
  );
};