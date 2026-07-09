/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2937',
        'ink-soft': '#6B7280',
        'ink-faint': '#9CA3AF',
        line: '#E5E7EB',
        'line-soft': '#F3F4F6',
        rust: '#D95A2B',
        'rust-deep': '#C14A19',
        'rust-tint': '#FDEDE5',
        'rust-ghost': '#FBF3EE',
        canvas: '#F9FAFB',
        ok: '#2F7D5B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
      },
    },
  },
  plugins: [],
}
