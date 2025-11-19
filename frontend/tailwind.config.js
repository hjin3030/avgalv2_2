// 1. Abrir archivo: frontend/tailwind.config.js
// 2. Reemplazar todo el contenido con esto:

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
