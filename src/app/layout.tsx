import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GenioFacultad - Tu asistente de estudio con IA",
  description: "Sube tus apuntes, PDFs o fotos de clases. La IA te genera resúmenes, flashcards, quizzes y te ayuda a convertirte en un genio de la facultad.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}