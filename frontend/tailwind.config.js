/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0d1117',
        'bg-secondary': '#161b22',
        'bg-tertiary': '#21262d',
        'bg-sidebar': '#010409',
        'bg-editor': '#1e1e1e',
        'border': '#30363d',
        'text-primary': '#c9d1d9',
        'text-secondary': '#8b949e',
        'text-muted': '#6e7681',
        'accent-blue': '#58a6ff',
        'accent-blue-bg': '#1f6feb',
        'accent-green': '#238636',
        'accent-green-hover': '#2ea043',
        'accent-red': '#f85149',
        'accent-purple': '#bc8cff',
        'accent-yellow': '#e3b341',
      },
    },
  },
  plugins: [],
}
