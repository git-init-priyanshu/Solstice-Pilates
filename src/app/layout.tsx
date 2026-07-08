import type { Metadata } from "next";
import "@/index.css";

import { ThemeProvider } from "@/components/theme-provider";

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
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
