import type { Metadata, Viewport } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import "./globals.css";

const fuenteTexto = Instrument_Sans({
  variable: "--fuente-texto",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const fuenteMono = DM_Mono({
  variable: "--fuente-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TIPI 3.0 · Gestión de clubes de robótica y programación",
    template: "%s · TIPI 3.0",
  },
  description:
    "TIPI 3.0 registra instituciones, clubes, sesiones y evidencias de los clubes de robótica y programación de las unidades educativas fiscales de la Zona 8.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0d14" },
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${fuenteTexto.variable} ${fuenteMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#contenido"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-control focus-visible:bg-acento focus-visible:px-4 focus-visible:py-2 focus-visible:text-sobre-acento"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
