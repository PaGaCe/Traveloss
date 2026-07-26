import "./globals.css";

export const metadata = {
  title: "Eslovenia 2026",
  description: "Itinerario de viaje a Eslovenia",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="font-body">{children}</body>
    </html>
  );
}
