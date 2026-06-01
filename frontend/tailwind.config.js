export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#eef8ff',
          100: '#d9efff',
          200: '#b3e0fc',
          300: '#7cc4f0',
          400: '#3ba3e3',
          500: '#147bd1',
          600: '#0d63ad',
          700: '#0a528f',
          800: '#084269',
          900: '#082f49'
        },
        mint: '#10b981',
        ink: '#102033'
      },
      boxShadow: {
        soft: '0 18px 60px rgba(8, 47, 73, 0.12)'
      }
    }
  },
  plugins: []
};
