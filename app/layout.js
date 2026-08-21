import "./globals.css";
import { ToastProvider } from "../components/Toast";

export const metadata = {
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Traveloss",
  },
};

export const viewport = {
  themeColor: "#010615",
};

export default function RootLayout({ children }) {
  // Aplica el tema ANTES del primer pintado para evitar parpadeo:
  // prefiere la elección guardada y, si no hay, la del sistema.
  const themeInit = `(function(){try{var t=localStorage.getItem("traveloss-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-body">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
