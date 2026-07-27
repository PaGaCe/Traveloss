import "./globals.css";

export const metadata = {
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  themeColor: "#010615",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Traveloss",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-body">{children}</body>
    </html>
  );
}
