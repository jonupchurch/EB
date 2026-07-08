import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erica Burns Things",
  description:
    "Custom-printed shirts, mugs, wood signs, totes, and more — made to order by Erica Burns Things.",
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
