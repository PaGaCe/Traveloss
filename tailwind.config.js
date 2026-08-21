/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tokens neutrales basados en variables CSS: cambian con el tema
        // (claro por defecto, .dark en <html> para el oscuro)
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        inkLight: "rgb(var(--c-ink-light) / <alpha-value>)",
        cloud: "rgb(var(--c-cloud) / <alpha-value>)",
        slate: "rgb(var(--c-slate) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        btn: "rgb(var(--c-btn) / <alpha-value>)",
        btnHover: "rgb(var(--c-btn-hover) / <alpha-value>)",
        btnText: "rgb(var(--c-btn-text) / <alpha-value>)",
        // Fijo para velos sobre fotos/overlays: siempre oscuro
        scrim: "#020617",
        // Acentos fijos en ambos temas
        coral: "#EA580C",
        gold: "#F59E0B",
        teal: "#0D9488",
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
