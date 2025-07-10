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
        }
      }
    },
  },
  plugins: [],
}