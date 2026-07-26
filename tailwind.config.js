/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#010615",
        cloud: "#F4F4F7",
        coral: "#E56508",
        gold: "#FBA006",
        teal: "#FDC509",
        slate: "#8A90A0",
        line: "#C5CAD6",
        muted: "#5A6478",
        inkLight: "#0A1528",
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
        body: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
