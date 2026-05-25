/** @type {import('tailwindcss').Config} */
// Tailwind CSS 配置
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'Marcellus', 'serif'],
        body: ['var(--font-body)', 'Instrument Sans', 'sans-serif'],
        sans: ['var(--font-body)', 'Instrument Sans', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#000000',
          dark: '#000000',
          light: '#4B4B4B',
        },
        accent: {
          DEFAULT: '#B40C1C',
          dark: '#8B0916',
        },
        secondary: {
          DEFAULT: '#29272B',
          light: '#4B4B4B',
          lighter: '#737373',
        },
        sand: '#F1EEE9',
        blush: '#F3E7E7',
        charcoal: '#29272B',
      },
      maxWidth: {
        container: '1700px',
      },
      letterSpacing: {
        heading: '-0.02em',
        wide: '0.05em',
        wider: '0.1em',
      },
    },
  },
  plugins: [],
}

