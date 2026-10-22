/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        surface: {
          950: '#0e1118',
          900: '#151923',
          850: '#1d2331',
          800: '#272f42',
          750: '#323c53',
          700: '#3f4a66',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'warm-glow': 'radial-gradient(ellipse at top, rgba(245, 158, 11, 0.15), transparent 70%)',
        'stage-glow': 'radial-gradient(ellipse at 50% 0%, rgba(251, 191, 36, 0.22), transparent 70%)',
      },
    },
  },
  plugins: [],
}
