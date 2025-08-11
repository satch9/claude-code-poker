/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      
      // Système d'espacement cohérent pour poker
      spacing: {
        'table-radius-mobile': '35%',
        'table-radius-desktop': '42%',
        'card-offset': '16px',
        'card-offset-current': '24px',
        'seat-mobile': '10rem',
        'seat-desktop': '13rem',
      },
      
      // Z-index standardisé
      zIndex: {
        'card-hidden': '0',
        'table-surface': '10',
        'card-visible': '15',
        'player-seat': '20',
        'dealer-button': '25',
        'mobile-controls': '30',
        'mobile-sidebar': '40',
        'modal': '50',
      },
      
      // Transformations personnalisées
      scale: {
        '70': '0.7',
        '75': '0.75',
        '80': '0.8',
        '85': '0.85',
        '90': '0.9',
        '95': '0.95',
      },
      
      // Bordures personnalisées
      borderWidth: {
        '12': '12px',
      },
      
      // Aspect ratios personnalisés pour les cartes
      aspectRatio: {
        '2/3': '2 / 3',
        '3/4': '3 / 4',
      },
      
      colors: {
        'poker-green': {
          50: '#f0f9f0',
          100: '#dcf2dc',
          200: '#bce4bc',
          300: '#8fd08f',
          400: '#5bb65b',
          500: '#3d9a3d',
          600: '#2d7d2d',
          700: '#256325',
          800: '#1e4f1e',
          900: '#1a4119',
        },
        'poker-gold': {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        'poker': {
          // États des joueurs
          'player-active': '#10b981',  // Green-500
          'player-current': '#f59e0b', // Amber-500
          'player-folded': '#6b7280',  // Gray-500
          'player-allin': '#ef4444',   // Red-500
          
          // Cartes
          'card-red': '#dc2626',       // Red-600
          'card-black': '#1f2937',     // Gray-800
          'card-back': '#312e81',      // Indigo-800
        }
      },
      
      // Tailles standardisées
      width: {
        'seat-mobile': '10rem',
        'seat-desktop': '13rem',
      },
      height: {
        'seat-mobile': '3rem',
        'seat-desktop': '4rem',
      },
      
      // Animations personnalisées
      animation: {
        'pulse-green': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'dealer-rotate': 'spin 0.5s ease-in-out',
        'card-deal': 'slideIn 0.3s ease-out',
      },
      
      // Keyframes pour animations
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}