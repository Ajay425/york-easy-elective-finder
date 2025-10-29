/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'york-red': '#a42439',
        'york-green': '#27AF60',
        'york-teal': '#1CA085',
      }
    },
  },
  plugins: [],
}