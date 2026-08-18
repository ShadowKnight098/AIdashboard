/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F8FA',
        ink: '#12172B',
        primary: '#3654FF',
        evidence: '#0F9C93',
        caution: '#C98A2C',
        hairline: '#E4E7EC',
        card: '#FFFFFF',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        'btn': '6px',
        'card': '8px',
      },
    },
  },
  plugins: [],
}
