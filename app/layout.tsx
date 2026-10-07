import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUTSHI B ÉCOLE SUITE",
  description: "Plateforme de gestion scolaire MUTSHI B ÉCOLE SUITE",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
