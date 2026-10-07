/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "light",
      {
        manualist: {
          ...require("daisyui/theming/presets/light.json"),
          "primary": "##FBBF24",
          "secondary": "#F87060",
          "accent": "#f59e0b",
          "neutral": "#6b7280",
          "base-100": "#ffffff",
          "info": "#3b82f6",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },

      },
    ],
    defaultTheme: "light",
  },
}

