/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '321px',
      'sm': '481px',
      'md': '768px',
      'lg': '1025px',
      'xl': '1280px',
      '2xl': '1441px',
      '3xl': '1920px',
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Hiragino Sans', 'Meiryo', 'sans-serif'],
      },
      fontSize: {
        'xs': ['clamp(0.6875rem, 0.65rem + 0.1vw, 0.75rem)', { lineHeight: '1rem' }],
        'sm': ['clamp(0.8125rem, 0.775rem + 0.15vw, 0.875rem)', { lineHeight: '1.25rem' }],
        'base': ['clamp(0.875rem, 0.825rem + 0.2vw, 1rem)', { lineHeight: '1.5rem' }],
        'lg': ['clamp(1rem, 0.925rem + 0.3vw, 1.125rem)', { lineHeight: '1.75rem' }],
        'xl': ['clamp(1.125rem, 1rem + 0.5vw, 1.25rem)', { lineHeight: '1.75rem' }],
        '2xl': ['clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem)', { lineHeight: '2rem' }],
        '3xl': ['clamp(1.5rem, 1.25rem + 1vw, 1.875rem)', { lineHeight: '2.25rem' }],
      },
      maxWidth: {
        'content': '1600px',
      },
    },
  },
  plugins: [],
};
