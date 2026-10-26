import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terravado — Internal Portal",
  description: "Terravado internal portal — the backend source of truth and internal management surface.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
