/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom Brand Tokens according to design specs:
        // Light: bg:#FAFAF8, surface:#FFFFFF, steel:#4A5568, accent:#C0392B, text:#1A1A1A, sec-text:#6B7280, border:#E5E7EB
        // Dark: bg:#121417, surface:#1E2126, steel:#94A3B8, accent:#E74C3C, text:#F1F1F1, sec-text:#9CA3AF, border:#2D3138
        brand: {
          maroon: '#C0392B',
          red: '#E74C3C',
          lightBg: '#FAFAF8',
          darkBg: '#121417',
          lightSurface: '#FFFFFF',
          darkSurface: '#1E2126',
        },
        steel: {
          light: '#4A5568',
          dark: '#94A3B8',
        }
      }
    },
  },
  plugins: [],
}
