/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#08080A",
        panel: "#111217",
        orange: "#F26A21",
        electric: "#2F6BFF",
        campus: "#FFD447",
        cream: "#F4F0E8",
        muted: "#8A8F98",
      },
      fontFamily: {
        display: ["Arial Narrow", "Impact", "Haettenschweiler", "sans-serif"],
        mono: ["Roboto Mono", "SFMono-Regular", "Consolas", "monospace"],
        sans: ["Inter", "Arial", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 50px rgba(242, 106, 33, 0.25)",
        blueglow: "0 0 55px rgba(47, 107, 255, 0.25)",
      },
      backgroundImage: {
        court:
          "linear-gradient(135deg, rgba(242,106,33,.18), transparent 28%), linear-gradient(180deg, #111217 0%, #08080A 62%)",
      },
    },
  },
  plugins: [],
};
