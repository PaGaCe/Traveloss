/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1B2A4A",
        cloud: "#EFF4F8",
        coral: "#FF6B4A",
        gold: "#F2B134",
        teal: "#2A9D8F",
        slate: "#8A93A6",
        line: "#C9CFDA",
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
