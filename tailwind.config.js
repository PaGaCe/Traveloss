/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B0F19",
        cloud: "#F8F9FC",
        coral: "#EA580C",
        gold: "#F59E0B",
        teal: "#0D9488",
        slate: "#64748B",
        line: "#E2E8F0",
        muted: "#475569",
        inkLight: "#1E293B",
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
        body: ["-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        'soft': '0 2px 12px -2px rgba(11, 15, 25, 0.06), 0 1px 4px -1px rgba(11, 15, 25, 0.04)',
        'card': '0 4px 20px -4px rgba(11, 15, 25, 0.08), 0 2px 6px -2px rgba(11, 15, 25, 0.04)',
        'sheet': '0 -8px 32px -4px rgba(11, 15, 25, 0.12), 0 -2px 8px -2px rgba(11, 15, 25, 0.06)',
      },
    },
  },
  plugins: [],
};
