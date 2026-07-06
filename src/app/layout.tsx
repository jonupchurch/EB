import type { Metadata } from "next";
import "./globals.css";

// Placeholder metadata — replace once the business name/branding is set
// (see docs/future-work.md and Constitution Principle III).
export const metadata: Metadata = {
  title: "Printing Website",
  description: "Custom-printed T-shirts, mugs, wood designs, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
