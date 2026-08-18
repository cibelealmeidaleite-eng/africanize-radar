/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0b0d',
          900: '#121214',
          800: '#1b1b1f',
          700: '#26262b',
          600: '#38383f',
          500: '#57575f',
          400: '#8a8a92',
          300: '#b4b4bb',
          200: '#dcdce0',
          100: '#f1f1f3',
        },
        ember: {
          500: '#ff5a3c',
          400: '#ff7a5c',
          600: '#e6431f',
        },
        gold: {
          500: '#e8b93f',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
