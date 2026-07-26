import "./globals.css";

export const metadata = {
  title: "Traveloss",
  description: "Tus viajes en un solo lugar",
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
