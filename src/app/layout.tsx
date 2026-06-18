import type { Metadata } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: "Solstice Pilates Assistant",
  description: "AI assistant for Solstice Pilates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
