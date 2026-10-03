import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Complexe Scolaire Saint Victor",
  description: "Application de gestion scolaire — Complexe Scolaire Saint Victor",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
