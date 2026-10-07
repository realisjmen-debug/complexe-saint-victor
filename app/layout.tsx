import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MONATSHIEBE LOGICIEL",
  description: "Plateforme de gestion scolaire MONATSHIEBE LOGICIEL",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
