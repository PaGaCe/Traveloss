import "./globals.css";

export const metadata = {
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-body">{children}</body>
    </html>
  );
}
