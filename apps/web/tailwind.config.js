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
      colors: {
        primary: {
          DEFAULT: '#ff1f3d',
          dark: '#cc1830',
          light: '#ff5c75',
        },
        secondary: {
          DEFAULT: '#1a1a1a',
          light: '#333',
          lighter: '#666',
        },
      },
      maxWidth: {
        'container': '1400px',
      },
    },
  },
  plugins: [],
}

