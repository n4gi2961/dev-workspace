/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: { primary: '#0095F6', light: '#EFF6FF' },
        destructive: '#EF4444',
        surface: { DEFAULT: '#1F2937', dark: '#1F2937', light: '#FFFFFF' },
        canvas: '#111827',
        border: { DEFAULT: '#374151', light: '#E4E4E7' },
        txt: {
          primary: '#FFFFFF',
          secondary: '#D1D5DB',
          tertiary: '#A1A1AA',
          muted: '#D4D4D8',
        },
      },
    },
  },
  plugins: [],
};
